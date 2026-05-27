import json
import logging
import threading
import time
from collections import deque
from datetime import datetime, timezone

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable

from config import settings
from kafka_producer import TOPIC_CURRENT, TOPIC_FORECAST, TOPIC_ALERTS
import history_store

logger = logging.getLogger(__name__)

state = {
    "current":     {},
    "forecast":    [],
    "alerts":      deque(maxlen=100),
    "history":     deque(maxlen=500),
    "last_update": None,
}

_lock = threading.Lock()


def _consume_loop():
    while True:
        try:
            consumer = KafkaConsumer(
                TOPIC_CURRENT, TOPIC_FORECAST, TOPIC_ALERTS,
                bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                auto_offset_reset="latest",
                enable_auto_commit=True,
                group_id="nagpur-weather-api",
                consumer_timeout_ms=1000,
            )
            logger.info("Kafka consumer connected.")
            break
        except NoBrokersAvailable:
            logger.warning("Consumer: Kafka not ready, retrying in 5s…")
            time.sleep(5)

    for msg in consumer:
        try:
            with _lock:
                if msg.topic == TOPIC_CURRENT:
                    zone = msg.value.get("zone", "unknown")
                    state["current"][zone] = msg.value
                    state["history"].appendleft(msg.value)
                    state["last_update"] = datetime.now(timezone.utc).isoformat()
                    history_store.save_reading(msg.value)

                elif msg.topic == TOPIC_FORECAST:
                    state["forecast"] = msg.value.get("items", [])

                elif msg.topic == TOPIC_ALERTS:
                    state["alerts"].appendleft(msg.value)

        except Exception as exc:
            logger.error("Consumer error: %s", exc)


def start_consumer():
    t = threading.Thread(target=_consume_loop, daemon=True, name="kafka-consumer")
    t.start()
    logger.info("Kafka consumer thread started.")
