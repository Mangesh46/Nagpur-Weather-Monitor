import json
import logging
import sqlite3
import threading
from datetime import datetime, timezone, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

_DB_PATH = Path("/app/data/weather.db")
_local   = threading.local()


def init_store(db_path: str | None = None) -> None:
    global _DB_PATH
    if db_path:
        _DB_PATH = Path(db_path)
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    _conn().executescript("""
        CREATE TABLE IF NOT EXISTS zone_readings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            zone        TEXT    NOT NULL,
            lat         REAL,
            lon         REAL,
            recorded_at TEXT    NOT NULL,
            data        TEXT    NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_zone_ts ON zone_readings(zone, recorded_at);

        CREATE TABLE IF NOT EXISTS ai_results (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            computed_at TEXT NOT NULL,
            result      TEXT NOT NULL
        );
    """)
    logger.info("History store initialised at %s", _DB_PATH)


def _conn() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
    return _local.conn


def save_reading(record: dict) -> None:
    try:
        c = _conn()
        ts = record.get("timestamp") or datetime.now(timezone.utc).isoformat()
        c.execute(
            "INSERT INTO zone_readings(zone, lat, lon, recorded_at, data) VALUES (?,?,?,?,?)",
            (record.get("zone", "unknown"), record.get("lat", 0.0), record.get("lon", 0.0),
             ts, json.dumps(record)),
        )
        cutoff = (datetime.now(timezone.utc) - timedelta(days=6)).isoformat()
        c.execute("DELETE FROM zone_readings WHERE recorded_at < ?", (cutoff,))
        c.commit()
    except Exception as exc:
        logger.error("save_reading: %s", exc)


def save_ai_result(result: dict) -> None:
    try:
        c = _conn()
        c.execute(
            "INSERT INTO ai_results(computed_at, result) VALUES (?,?)",
            (datetime.now(timezone.utc).isoformat(), json.dumps(result)),
        )
        c.execute("""
            DELETE FROM ai_results WHERE id NOT IN (
                SELECT id FROM ai_results ORDER BY id DESC LIMIT 200
            )
        """)
        c.commit()
    except Exception as exc:
        logger.error("save_ai_result: %s", exc)


def get_zone_history(zone: str, days: int = 5) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = _conn().execute(
        "SELECT data FROM zone_readings WHERE zone=? AND recorded_at>=? ORDER BY recorded_at ASC",
        (zone, cutoff),
    ).fetchall()
    return [json.loads(r["data"]) for r in rows]


def get_all_zones_history(days: int = 5) -> dict[str, list[dict]]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows = _conn().execute(
        "SELECT zone, data FROM zone_readings WHERE recorded_at>=? ORDER BY recorded_at ASC",
        (cutoff,),
    ).fetchall()
    result: dict[str, list[dict]] = {}
    for r in rows:
        result.setdefault(r["zone"], []).append(json.loads(r["data"]))
    return result


def get_daily_max_temp(zone: str, days: int = 5) -> list[dict]:
    readings = get_zone_history(zone, days)
    daily: dict[str, list[float]] = {}
    for r in readings:
        date = r["recorded_at"][:10]
        daily.setdefault(date, []).append(r.get("temperature_c", 0))
    result = []
    for date in sorted(daily):
        temps = daily[date]
        result.append({
            "date":    date,
            "max_c":   round(max(temps), 2),
            "min_c":   round(min(temps), 2),
            "avg_c":   round(sum(temps) / len(temps), 2),
            "samples": len(temps),
        })
    return result


def get_last_ai_result() -> dict | None:
    row = _conn().execute(
        "SELECT result FROM ai_results ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return json.loads(row["result"]) if row else None
