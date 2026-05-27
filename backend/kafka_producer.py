import json
import logging
import time
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

from config import settings

logger = logging.getLogger(__name__)

TOPIC_CURRENT  = "weather.current"
TOPIC_FORECAST = "weather.forecast"
TOPIC_ALERTS   = "weather.alerts"

ALERT_RULES = {
    "heat_wave":     lambda r: r.get("temperature_c", 0) >= 42,
    "humidity_high": lambda r: r.get("humidity_pct", 0) >= 85,
    "heavy_rain":    lambda r: r.get("rain_1h_mm", 0) >= 15,
    "strong_wind":   lambda r: r.get("wind_speed_ms", 0) >= 15,
    "poor_aqi":      lambda r: (r.get("aqi") or 0) >= 4,
}

_producer: KafkaProducer | None = None


def get_producer() -> KafkaProducer:
    global _producer
    if _producer is None:
        for attempt in range(10):
            try:
                _producer = KafkaProducer(
                    bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
                    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                    key_serializer=lambda k: k.encode("utf-8") if k else None,
                    acks="all",
                    retries=3,
                    linger_ms=10,
                )
                logger.info("Kafka producer connected.")
                break
            except NoBrokersAvailable:
                logger.warning("Kafka not ready (attempt %d/10), retrying in 5s…", attempt + 1)
                time.sleep(5)
        else:
            raise RuntimeError("Could not connect to Kafka after 10 attempts")
    return _producer


def _fire_alerts(record: dict) -> None:
    prod = get_producer()
    for name, rule in ALERT_RULES.items():
        if rule(record):
            prod.send(TOPIC_ALERTS, key=record["zone"], value={
                "alert": name,
                "zone": record["zone"],
                "timestamp": record["timestamp"],
                "value": record,
            })
            logger.warning("ALERT [%s] zone: %s", name, record["zone"])


def publish_current_readings(records: list[dict]) -> None:
    prod = get_producer()
    for rec in records:
        prod.send(TOPIC_CURRENT, key=rec["zone"], value=rec)
        _fire_alerts(rec)
    prod.flush()


def publish_forecast(forecast: list[dict]) -> None:
    prod = get_producer()
    prod.send(TOPIC_FORECAST, key="nagpur", value={"items": forecast})
    prod.flush()
