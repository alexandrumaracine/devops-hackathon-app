from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
from dotenv import load_dotenv, find_dotenv
from datetime import datetime

from db import init_db, save_search, SessionLocal, SearchHistory

load_dotenv(find_dotenv())

app = FastAPI(title="Weather API Proxy", version="1.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = (os.getenv("OPENWEATHER_API_KEY") or "").strip()

@app.on_event("startup")
def on_startup():
    print("=== APP STARTUP ===")
    print("Initializing DB...")

    try:
        init_db()
        print("DB initialized OK")
    except Exception as e:
        # Don’t crash app, but log clearly
        import traceback
        print("DB init failed (will continue without DB):", e)
        traceback.print_exc()

    print("=== STARTUP DONE ===")



def extract_weather(data, forecast_data):
    city_name = data["name"]
    temperature = round(data["main"]["temp"], 1)
    description = data["weather"][0]["description"].title()
    icon = data["weather"][0]["icon"]

    timezone_offset = data["timezone"]
    local_time = datetime.utcfromtimestamp(data["dt"] + timezone_offset)
    time_str = local_time.strftime("%H:%M")
    date_str = local_time.strftime("%d %b %Y")

    forecast = []
    for item in forecast_data["list"][:6]:
        ftime = datetime.utcfromtimestamp(item["dt"] + timezone_offset).strftime("%H:%M")
        ftemp = round(item["main"]["temp"], 1)
        forecast.append({"time": ftime, "temp": ftemp})

    return {
        "city": city_name,
        "temperature": temperature,
        "description": description,
        "icon": icon,
        "forecast": forecast,
        "local_time": time_str,
        "local_date": date_str,
    }

# ---- Non-API health endpoint (for ALB health checks) ----
@app.get("/health")
def health():
    return {"status": "ok"}


# ---- API router, mounted under /api ----
api = APIRouter()


@api.get("/health")
def api_health():
    # Optional: you can reuse the same logic or add more checks
    return {"status": "ok"}


@api.get("/weather")
async def get_weather(city: str):
    try:
        params = {"q": city, "appid": API_KEY, "units": "metric"}
        current = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        forecast = requests.get("https://api.openweathermap.org/data/2.5/forecast", params=params)
        current.raise_for_status()
        forecast.raise_for_status()

        result = extract_weather(current.json(), forecast.json())

        # DB save is best-effort – any DB error is handled inside save_search()
        save_search(result["city"])

        return result
    except requests.HTTPError as e:
        # Propagate upstream weather API errors
        status = e.response.status_code if e.response is not None else 500
        msg = e.response.text if e.response is not None else "Upstream error"
        raise HTTPException(status_code=status, detail=msg)
    except Exception as e:
        print("get_weather error:", e)
        raise HTTPException(status_code=500, detail="Internal error")


@api.get("/weather/coords")
async def get_weather_by_coords(lat: float, lon: float):
    try:
        params = {"lat": lat, "lon": lon, "appid": API_KEY, "units": "metric"}
        current = requests.get("https://api.openweathermap.org/data/2.5/weather", params=params)
        forecast = requests.get("https://api.openweathermap.org/data/2.5/forecast", params=params)
        current.raise_for_status()
        forecast.raise_for_status()

        result = extract_weather(current.json(), forecast.json())

        # Again, DB is best-effort
        save_search(result["city"])

        return result
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else 500
        msg = e.response.text if e.response is not None else "Upstream error"
        raise HTTPException(status_code=status, detail=msg)
    except Exception as e:
        print("get_weather_by_coords error:", e)
        raise HTTPException(status_code=500, detail="Internal error")


@api.get("/history")
def history(limit: int = 10):
    db = SessionLocal()
    try:
        rows = (
            db.query(SearchHistory)
              .order_by(SearchHistory.id.desc())
              .limit(limit)
              .all()
        )
        return [
            {
                "id": r.id,
                "city": r.city,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    except Exception as e:
        print("History error:", e)
        raise HTTPException(status_code=500, detail="DB error")
    finally:
        db.close()


# Mount all API routes under /api
app.include_router(api, prefix="/api")
