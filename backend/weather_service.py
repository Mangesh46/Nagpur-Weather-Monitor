import asyncio
import logging
from datetime import datetime, timezone

import httpx

from config import settings

logger = logging.getLogger(__name__)

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AQI_URL      = "https://air-quality-api.open-meteo.com/v1/air-quality"

WMO_DESCRIPTIONS = {
    0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
    45: "fog", 48: "icy fog",
    51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
    61: "light rain", 63: "rain", 65: "heavy rain",
    71: "light snow", 73: "snow", 75: "heavy snow",
    80: "rain showers", 81: "heavy rain showers", 82: "violent rain showers",
    95: "thunderstorm", 96: "thunderstorm with hail", 99: "thunderstorm with heavy hail",
}


def _european_aqi_to_scale(val: float) -> int:
    if val <= 20: return 1
    if val <= 40: return 2
    if val <= 60: return 3
    if val <= 80: return 4
    return 5


async def fetch_zone_weather(client: httpx.AsyncClient, zone: dict) -> dict | None:
    try:
        resp = await client.get(
            FORECAST_URL,
            params={
                "latitude":  zone["lat"],
                "longitude": zone["lon"],
                "current":   "temperature_2m,relative_humidity_2m,apparent_temperature,"
                             "rain,wind_speed_10m,wind_direction_10m,wind_gusts_10m,"
                             "surface_pressure,cloud_cover,visibility,weather_code",
                "wind_speed_unit": "ms",
                "timezone":  "Asia/Kolkata",
            },
            timeout=10,
        )
        resp.raise_for_status()
        cur  = resp.json()["current"]
        code = cur.get("weather_code", 0)
        return {
            "zone":          zone["name"],
            "lat":           zone["lat"],
            "lon":           zone["lon"],
            "timestamp":     datetime.now(timezone.utc).isoformat(),
            "temperature_c": round(cur.get("temperature_2m", 0), 2),
            "feels_like_c":  round(cur.get("apparent_temperature", 0), 2),
            "temp_min_c":    None,
            "temp_max_c":    None,
            "humidity_pct":  cur.get("relative_humidity_2m", 0),
            "pressure_hpa":  cur.get("surface_pressure", 0),
            "wind_speed_ms": cur.get("wind_speed_10m", 0),
            "wind_deg":      cur.get("wind_direction_10m", 0),
            "wind_gust_ms":  cur.get("wind_gusts_10m", 0),
            "clouds_pct":    cur.get("cloud_cover", 0),
            "rain_1h_mm":    cur.get("rain", 0),
            "snow_1h_mm":    0,
            "visibility_m":  cur.get("visibility", 0),
            "uvi":           0,
            "description":   WMO_DESCRIPTIONS.get(code, "unknown"),
            "icon":          f"wmo_{code}",
            "dew_point_c":   None,
            "aqi":           None,
        }
    except Exception as exc:
        logger.warning("Failed to fetch weather for %s: %s", zone["name"], exc)
        return None


async def fetch_zone_aqi(client: httpx.AsyncClient, zone: dict, record: dict) -> dict:
    try:
        resp = await client.get(
            AQI_URL,
            params={
                "latitude":  zone["lat"],
                "longitude": zone["lon"],
                "current":   "european_aqi,pm10,pm2_5,carbon_monoxide",
            },
            timeout=10,
        )
        resp.raise_for_status()
        cur = resp.json()["current"]
        record["aqi"]   = _european_aqi_to_scale(cur.get("european_aqi", 0))
        record["pm2_5"] = cur.get("pm2_5")
        record["pm10"]  = cur.get("pm10")
        record["co"]    = cur.get("carbon_monoxide")
    except Exception as exc:
        logger.debug("AQI fetch failed for %s: %s", zone["name"], exc)
    return record


async def fetch_hourly_forecast(lat: float, lon: float) -> list[dict]:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                FORECAST_URL,
                params={
                    "latitude":  lat,
                    "longitude": lon,
                    "hourly":    "temperature_2m,relative_humidity_2m,precipitation_probability,"
                                 "precipitation,wind_speed_10m,cloud_cover,weather_code",
                    "wind_speed_unit": "ms",
                    "forecast_days":   5,
                    "timezone":        "Asia/Kolkata",
                },
                timeout=15,
            )
            resp.raise_for_status()
            hourly = resp.json()["hourly"]
            result = []
            for i, t in enumerate(hourly["time"]):
                code = hourly["weather_code"][i]
                result.append({
                    "dt":            i,
                    "timestamp":     t + ":00+05:30",
                    "temperature_c": round(hourly["temperature_2m"][i], 2),
                    "humidity_pct":  hourly["relative_humidity_2m"][i],
                    "rain_3h_mm":    hourly["precipitation"][i],
                    "clouds_pct":    hourly["cloud_cover"][i],
                    "wind_speed_ms": hourly["wind_speed_10m"][i],
                    "description":   WMO_DESCRIPTIONS.get(code, "unknown"),
                    "pop":           hourly["precipitation_probability"][i] / 100,
                })
            return result
        except Exception as exc:
            logger.error("Forecast fetch failed: %s", exc)
            return []


async def fetch_all_zones() -> list[dict]:
    async with httpx.AsyncClient() as client:
        raw = await asyncio.gather(*[fetch_zone_weather(client, z) for z in settings.nagpur_zones])
        valid = [r for r in raw if r is not None]
        enriched = await asyncio.gather(*[
            fetch_zone_aqi(client, settings.nagpur_zones[i], r)
            for i, r in enumerate(valid)
        ])
        return list(enriched)
