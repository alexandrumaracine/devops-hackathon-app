from fastapi import FastAPI, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv, find_dotenv
from datetime import datetime

from db import init_db, save_search, SessionLocal, SearchHistory
from provider_factory import get_weather_provider

load_dotenv(find_dotenv())

app = FastAPI(title="Weather API Proxy", version="1.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Weather provider (selected once at startup) ----
weather_provider = get_weather_provider()


@app.on_event("startup")
def on_startup():
    print("=== APP STARTUP ===")

    if os.getenv("DISABLE_DB", "false").lower() == "true":
        print("DB disabled via DISABLE_DB=true")
        return

    print("Initializing DB...")
    try:
        init_db()
        print("DB initialized OK")
    except Exception as e:
        import traceback
        print("DB init failed (will continue without DB):", e)
        traceback.print_exc()

    print("=== STARTUP DONE ===")


def extract_weather(data, forecast_data):
    city_name = data["name"]
    temperature = round(data["main"]["temp"], 1)
    description = data["weather"][0]["description"].title()
    icon = data["weather"][0]["icon"]

    timezone_offset = data.get("timezone", 0)
    local_time = datetime.utcfromtimestamp(data["dt"] + timezone_offset)
    time_str = local_time.strftime("%H:%M")
    date_str = local_time.strftime("%d %b %Y")

    forecast = []
    for item in forecast_data["list"][:6]:
        ftime = datetime.utcfromtimestamp(
            item["dt"] + timezone_offset
        ).strftime("%H:%M")
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


# ---- Non-API health endpoint (for ALB / platform health checks) ----
@app.get("/health")
def health():
    return {"status": "ok"}


# ---- API router, mounted under /api ----
api = APIRouter()


@api.get("/health")
def api_health():
    return {"status": "ok"}


@api.get("/weather")
async def get_weather(city: str):
    try:
        current, forecast = weather_provider.get_weather_by_city(city)

        result = extract_weather(current, forecast)

        # DB save is best-effort
        save_search(result["city"])

        return result
    except Exception as e:
        print("get_weather error:", e)
        raise HTTPException(status_code=500, detail="Internal error")


@api.get("/weather/coords")
async def get_weather_by_coords(lat: float, lon: float):
    try:
        current, forecast = weather_provider.get_weather_by_coords(lat, lon)

        result = extract_weather(current, forecast)

        save_search(result["city"])

        return result
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


# ---- Mount all API routes under /api ----
app.include_router(api)
