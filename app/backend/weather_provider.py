import os
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, Tuple

# Keep API key reading here so the production provider stays self-contained.
OPENWEATHER_API_KEY = (os.getenv("OPENWEATHER_API_KEY") or "").strip()


class WeatherProvider:
    """
    Small contract that returns raw OpenWeather-like JSON for:
    - current weather
    - forecast
    This keeps your existing extract_weather() unchanged.
    """
    def get_weather_by_city(self, city: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        raise NotImplementedError

    def get_weather_by_coords(self, lat: float, lon: float) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        raise NotImplementedError


class OpenWeatherProvider(WeatherProvider):
    def _fetch(self, params: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        # Timeouts prevent long hangs during load tests / outages.
        current = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params=params,
            timeout=5,
        )
        forecast = requests.get(
            "https://api.openweathermap.org/data/2.5/forecast",
            params=params,
            timeout=5,
        )
        current.raise_for_status()
        forecast.raise_for_status()
        return current.json(), forecast.json()

    def get_weather_by_city(self, city: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        return self._fetch({
            "q": city,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric",
        })

    def get_weather_by_coords(self, lat: float, lon: float) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        return self._fetch({
            "lat": lat,
            "lon": lon,
            "appid": OPENWEATHER_API_KEY,
            "units": "metric",
        })


class DeterministicMockWeatherProvider(WeatherProvider):
    """
    Deterministic mock:
    - same city => same output (with the same seed)
    - no external calls
    - shaped like OpenWeather JSON so extract_weather() keeps working
    """
    def __init__(self, seed: int = 42):
        self.seed = seed

    def _stable_temp(self, key: str) -> float:
        # Stable across runs within the same Python hashing *process* is not guaranteed,
        # so we avoid built-in hash() and use a stable sum instead.
        base = sum(ord(c) for c in key) + self.seed
        return float(15 + (base % 15))  # 15..29 °C

    def _mock_response(self, city_label: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        now = datetime.utcnow()
        temp = self._stable_temp(city_label)

        current = {
            "name": city_label,
            "dt": int(now.timestamp()),
            "timezone": 0,
            "main": {"temp": temp},
            "weather": [{
                "description": "clear sky",
                "icon": "01d"
            }],
        }

        forecast = {
            "list": [
                {
                    "dt": int((now + timedelta(hours=i)).timestamp()),
                    "main": {"temp": round(temp + ((i % 3) - 1) * 0.7, 1)},
                }
                for i in range(1, 7)
            ]
        }

        return current, forecast

    def get_weather_by_city(self, city: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        return self._mock_response(city)

    def get_weather_by_coords(self, lat: float, lon: float) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        city_label = f"lat{round(lat,2)}_lon{round(lon,2)}"
        return self._mock_response(city_label)
