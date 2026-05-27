# 🌡️ Nagpur Weather Monitor v2

Fine-grained, multi-zone weather monitoring for Nagpur with **Kafka + ZooKeeper**, an **AI heatwave engine**, and a **3D React frontend**.

```
GitHub Pages (React)  ←→  HuggingFace Spaces (FastAPI)  ←→  Kafka + ZooKeeper (Docker)
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│             GitHub Pages                             │
│           React Frontend v2                          │
│  3D Heat · 3D Humidity · 3D Precip · Map            │
│  ✨ AI Heatwave Tab (5-day history + prediction)    │
└───────────────────┬─────────────────────────────────┘
                    │ REST / JSON
┌───────────────────▼─────────────────────────────────┐
│        HuggingFace Spaces (Docker)                   │
│              FastAPI Backend                         │
│  ┌────────────┐ ┌────────────┐ ┌─────────────────┐  │
│  │ Weather    │ │  Kafka     │ │  AI Service     │  │
│  │ Collector  │ │ Producer/  │ │  (heatwave det) │  │
│  │ (OWM API) │ │ Consumer   │ │  + prediction   │  │
│  └────────────┘ └────────────┘ └─────────────────┘  │
│                      │                │              │
│               ┌──────┘         ┌──────┘              │
│               ▼                ▼                     │
│          Kafka Topics      SQLite DB                 │
│          (ZooKeeper)       (5-day history)           │
└─────────────────────────────────────────────────────┘
                    │
        ┌───────────▼──────────────┐
        │    Docker Compose        │
        │  ZooKeeper → Kafka       │
        │  Kafka UI (port 8080)    │
        └──────────────────────────┘
```

---

## Quick Start (Local)

```bash
git clone https://github.com/YOUR_USER/nagpur-weather-monitor
cd nagpur-weather-monitor

# 1. Set your OpenWeatherMap API key
cp .env.example .env
nano .env   # set OPENWEATHER_API_KEY

# 2. Start ZooKeeper + Kafka + Backend
docker compose up -d

# 3. Start React frontend (dev mode)
docker compose --profile dev up frontend

# Open http://localhost:3000
# Kafka UI at http://localhost:8080
```

---

## HuggingFace Spaces Deployment

1. Create a new **Docker** Space on huggingface.co
2. Push `./backend/` folder contents to the Space repo
3. Set Space secrets:
   - `OPENWEATHER_API_KEY` — your OWM key
   - `KAFKA_BOOTSTRAP_SERVERS` — if using external Kafka (e.g. Upstash)
   - `PORT` → `7860`
4. The `Dockerfile` auto-adapts: sets `PORT=7860` for HF Spaces

> **Kafka on HF Spaces:** HF Spaces can't run ZooKeeper+Kafka in the same container. Use **Upstash Kafka** (free tier) as a managed Kafka service and set `KAFKA_BOOTSTRAP_SERVERS` to your Upstash endpoint.

---

## GitHub Pages Deployment

Add these GitHub Actions secrets:
- `REACT_APP_BACKEND_URL` → `https://YOUR_HF_USER-nagpur-weather.hf.space`

Push to `main` → GitHub Actions builds and deploys to `gh-pages` branch automatically.

Set repo **Pages source** to `gh-pages` branch.

---

## AI Heatwave Engine

**Detection:** Uses IMD (India Meteorological Department) criteria:
- **Watch:** max temp ≥ 40°C
- **Heatwave:** max temp ≥ 40°C AND departure from normal ≥ 4.5°C
- **Severe heatwave:** max temp ≥ 45°C OR departure ≥ 6.5°C
- **Extreme:** max temp ≥ 47°C

**Prediction:** Weighted linear regression on 5-day city-level daily max temperature series. Recent days get exponentially higher weight. Predicts tomorrow's city max and classifies it.

**History:** SQLite stores readings persistently in a Docker named volume. The AI panel shows a 5-day timeline of heatwave status per zone and city-level.

---

## Kafka Topics

| Topic | Content |
|---|---|
| `weather.current` | Per-zone current readings (every 60 s) |
| `weather.forecast` | 48-hour hourly forecast bundle |
| `weather.alerts` | Threshold-based alerts (heat_wave, heavy_rain, etc.) |

ZooKeeper runs on port `2181`. Kafka on `9092`. Kafka UI at `8080`.

---

## Monitored Zones (Nagpur)

Sitabuldi · Dharampeth · Sadar · Nagpur Airport · Hingna · Kamptee · Butibori · Wadi · Manewada · Wardha Road

---

## Tech Stack

| Layer | Technology |
|---|---|
| Messaging | **Apache Kafka 3.6** + **ZooKeeper 3.9** (Bitnami) |
| Backend | **Python 3.12** + **FastAPI** + APScheduler |
| AI | Weighted linear regression (numpy) + IMD criteria |
| History | **SQLite** (Docker volume, persists across restarts) |
| Weather API | **OpenWeatherMap** (Current + Forecast + AQI) |
| Frontend | **React 18** + **@react-three/fiber** (3D) + Recharts + Leaflet |
| Deployment | **HuggingFace Spaces** (backend) + **GitHub Pages** (frontend) |
