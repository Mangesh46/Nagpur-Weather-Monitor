import logging
import math
from datetime import datetime, timezone, date, timedelta
from typing import Any

from history_store import (
    get_all_zones_history,
    get_daily_max_temp,
    save_ai_result,
    get_last_ai_result,
)

logger = logging.getLogger(__name__)

MONTHLY_NORMALS = {1:29, 2:32, 3:37, 4:41, 5:43, 6:38, 7:31, 8:30, 9:32, 10:35, 11:31, 12:29}


def _normal_for_date(d: date) -> float:
    return float(MONTHLY_NORMALS.get(d.month, 35))


def classify_heatwave(max_c: float, ref_date: date | None = None) -> dict[str, Any]:
    d = ref_date or date.today()
    normal = _normal_for_date(d)
    departure = round(max_c - normal, 2)

    if max_c >= 47:
        level, label = 4, "SEVERE HEATWAVE (≥ 47 °C)"
    elif max_c >= 45 or departure >= 6.5:
        level, label = 3, "SEVERE HEATWAVE"
    elif max_c >= 40 and departure >= 4.5:
        level, label = 2, "HEATWAVE"
    elif max_c >= 40:
        level, label = 1, "WATCH – Hot Day"
    else:
        level, label = 0, "NORMAL"

    return {
        "max_c": round(max_c, 2),
        "normal_c": normal,
        "departure_c": departure,
        "level": level,
        "label": label,
        "is_heatwave": level >= 2,
    }


def _weighted_linreg(xs: list[float], ys: list[float]) -> tuple[float, float]:
    n = len(xs)
    weights = [math.exp(0.4 * i) for i in range(n)]
    sw   = sum(weights)
    swx  = sum(w * x     for w, x    in zip(weights, xs))
    swy  = sum(w * y     for w, y    in zip(weights, ys))
    swxy = sum(w * x * y for w, x, y in zip(weights, xs, ys))
    swxx = sum(w * x * x for w, x    in zip(weights, xs))
    denom = sw * swxx - swx * swx
    if denom == 0:
        return 0.0, swy / sw
    slope = (sw * swxy - swx * swy) / denom
    intercept = (swy - slope * swx) / sw
    return slope, intercept


def _predict_next_day(city_daily_list: list[dict], today: date) -> dict[str, Any]:
    tomorrow = today + timedelta(days=1)

    if not city_daily_list:
        normal = _normal_for_date(tomorrow)
        return {
            "date": tomorrow.isoformat(),
            "predicted_max_c": normal,
            "confidence": "low",
            "method": "climatological_normal",
            "heatwave": classify_heatwave(normal, tomorrow),
            "note": "No recent data — using IMD monthly normal",
        }

    xs = list(range(len(city_daily_list)))
    ys = [d["max_c"] for d in city_daily_list]

    if len(xs) >= 3:
        slope, intercept = _weighted_linreg(xs, ys)
        raw_pred = slope * len(xs) + intercept
        confidence = "high" if len(xs) >= 4 else "medium"
        method = "weighted_linear_regression"
    else:
        slope = 0
        raw_pred = ys[-1] + (ys[-1] - ys[0]) / max(len(ys) - 1, 1) * 0.5
        confidence = "low"
        method = "extrapolation"

    pred = round(max(20.0, min(50.0, raw_pred)), 2)
    return {
        "date": tomorrow.isoformat(),
        "predicted_max_c": pred,
        "confidence": confidence,
        "method": method,
        "heatwave": classify_heatwave(pred, tomorrow),
        "trend_slope": round(slope, 3),
    }


def analyse_heatwave(city_max_override: float | None = None) -> dict[str, Any]:
    today = date.today()
    all_history = get_all_zones_history(days=5)

    zone_summaries = []
    city_daily: dict[str, list[float]] = {}

    for zone, readings in all_history.items():
        daily: dict[str, list[float]] = {}
        for r in readings:
            d = r.get("recorded_at", "")[:10]
            daily.setdefault(d, []).append(r.get("temperature_c", 0))

        zone_days = []
        for d_str in sorted(daily):
            try:
                d_obj = date.fromisoformat(d_str)
            except ValueError:
                continue
            temps = daily[d_str]
            max_t = max(temps)
            city_daily.setdefault(d_str, []).append(max_t)
            zone_days.append({
                "date":     d_str,
                "max_c":    round(max_t, 2),
                "min_c":    round(min(temps), 2),
                "avg_c":    round(sum(temps) / len(temps), 2),
                "heatwave": classify_heatwave(max_t, d_obj),
                "samples":  len(temps),
            })
        zone_summaries.append({"zone": zone, "days": zone_days})

    city_daily_list = []
    for d_str in sorted(city_daily):
        vals = city_daily[d_str]
        city_max = sum(vals) / len(vals)
        try:
            d_obj = date.fromisoformat(d_str)
        except ValueError:
            d_obj = today
        city_daily_list.append({
            "date":     d_str,
            "max_c":    round(city_max, 2),
            "heatwave": classify_heatwave(city_max, d_obj),
        })

    if city_max_override is not None:
        current_hw = classify_heatwave(city_max_override, today)
    elif city_daily_list:
        current_hw = city_daily_list[-1]["heatwave"]
    else:
        current_hw = classify_heatwave(35.0, today)

    streak = 0
    for d in reversed(city_daily_list):
        if d["heatwave"]["is_heatwave"]:
            streak += 1
        else:
            break

    result = {
        "computed_at":     datetime.now(timezone.utc).isoformat(),
        "current_status":  current_hw,
        "heatwave_streak": streak,
        "city_history":    city_daily_list,
        "zone_summaries":  zone_summaries,
        "prediction":      _predict_next_day(city_daily_list, today),
        "zones_monitored": len(all_history),
        "data_days":       len(city_daily_list),
    }

    save_ai_result(result)
    return result


def get_or_compute(force: bool = False, live_max_c: float | None = None) -> dict:
    if not force:
        cached = get_last_ai_result()
        if cached:
            try:
                computed = datetime.fromisoformat(cached["computed_at"])
                if (datetime.now(timezone.utc) - computed).total_seconds() < 300:
                    return cached
            except Exception:
                pass
    return analyse_heatwave(city_max_override=live_max_c)
