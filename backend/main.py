import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import history_store
from config import settings
from kafka_consumer import start_consumer, state, _lock
from kafka_producer import publish_current_readings, publish_forecast
from weather_service import fetch_all_zones, fetch_hourly_forecast
from ai_service import get_or_compute

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s – %(message)s")
logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def poll_and_publish():
    logger.info("Polling weather data for all Nagpur zones…")
    try:
        records = await fetch_all_zones()
        if records:
            publish_current_readings(records)

        forecast = await fetch_hourly_forecast(settings.nagpur_lat, settings.nagpur_lon)
        if forecast:
            publish_forecast(forecast)
    except Exception as exc:
        logger.error("Poll cycle failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    history_store.init_store(db_path=os.getenv("DB_PATH"))
    start_consumer()
    scheduler.add_job(
        poll_and_publish, "interval",
        seconds=settings.poll_interval_seconds,
        id="weather_poll",
        next_run_time=datetime.now(timezone.utc),
    )
    scheduler.start()
    logger.info("Scheduler started — polling every %d s.", settings.poll_interval_seconds)
    yield
    scheduler.shutdown()


app = FastAPI(title="Nagpur Weather Monitor API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/current")
def get_current():
    with _lock:
        data = list(state["current"].values())
    if not data:
        raise HTTPException(503, "No data yet — poll in progress")
    return {"zones": data, "last_update": state["last_update"]}


@app.get("/api/current/{zone_name}")
def get_current_zone(zone_name: str):
    with _lock:
        rec = {k.lower(): v for k, v in state["current"].items()}.get(zone_name.lower())
    if not rec:
        raise HTTPException(404, f"Zone '{zone_name}' not found")
    return rec


@app.get("/api/forecast")
def get_forecast():
    with _lock:
        return {"forecast": list(state["forecast"])}


@app.get("/api/alerts")
def get_alerts(limit: int = 20):
    with _lock:
        return {"alerts": list(state["alerts"])[:limit]}


@app.get("/api/history")
def get_history(limit: int = 100):
    with _lock:
        return {"history": list(state["history"])[:limit]}


@app.get("/api/heatmap")
def get_heatmap():
    with _lock:
        zones = list(state["current"].values())
    points = [
        {
            "zone":          z["zone"],
            "lat":           z["lat"],
            "lon":           z["lon"],
            "temperature_c": z.get("temperature_c"),
            "humidity_pct":  z.get("humidity_pct"),
            "rain_1h_mm":    z.get("rain_1h_mm"),
            "aqi":           z.get("aqi"),
            "wind_speed_ms": z.get("wind_speed_ms"),
        }
        for z in zones
    ]
    return {"points": points}


@app.post("/api/refresh")
async def force_refresh():
    asyncio.create_task(poll_and_publish())
    return {"message": "Refresh triggered"}


@app.get("/api/ai/heatwave")
def get_heatwave_analysis(force: bool = False):
    try:
        with _lock:
            zones = list(state["current"].values())
        live_max = max((z.get("temperature_c", 0) for z in zones), default=None) if zones else None
        return get_or_compute(force=force, live_max_c=live_max)
    except Exception as exc:
        logger.error("AI heatwave endpoint error: %s", exc)
        raise HTTPException(500, f"AI service error: {exc}")


@app.get("/api/ai/history/{zone_name}")
def get_zone_ai_history(zone_name: str, days: int = 5):
    daily = history_store.get_daily_max_temp(zone_name, days=min(days, 7))
    if not daily:
        raise HTTPException(404, f"No history for zone '{zone_name}'")
    return {"zone": zone_name, "days": daily}


@app.get("/api/ai/zones-history")
def get_all_zones_ai_history(days: int = 5):
    return {"zones": history_store.get_all_zones_history(days=min(days, 7)), "days_requested": days}
