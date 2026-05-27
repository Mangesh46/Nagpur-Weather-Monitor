Absolutely. Here is your content rewritten as a clean, properly structured `README.md` in the same style and format, ready to paste into GitHub:

````md
# 🌡️ Nagpur Weather Monitor v4 — Redesign

> Fine-grained, multi-zone weather monitoring for Nagpur with **Apache Kafka + ZooKeeper**, an **AI Heatwave Engine** (IMD criteria + weighted linear regression), and a **3D React frontend**.

[![GitHub Pages](https://img.shields.io/badge/Frontend-GitHub%20Pages-blue?logo=github)](https://github.com)
[![HuggingFace](https://img.shields.io/badge/Backend-HuggingFace%20Spaces-yellow?logo=huggingface)](https://huggingface.co)
[![FastAPI](https://img.shields.io/badge/API-FastAPI%202.0-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/UI-React%2018-61DAFB?logo=react)](https://react.dev)
[![Kafka](https://img.shields.io/badge/Streaming-Apache%20Kafka%203.6-231F20?logo=apachekafka)](https://kafka.apache.org)

---

## 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (CDN)                       │
│                  React 18 SPA — Frontend                    │
│  Overview · Map & 3D · Forecast · 🔥 AI Heatwave (4 tabs)   │
└───────────────────────┬─────────────────────────────────────┘
                        │  REST / JSON (every 30s)
┌───────────────────────▼─────────────────────────────────────┐
│           HuggingFace Spaces — Docker Backend               │
│                    FastAPI 2.0 (Python 3.12)                │
│  ┌─────────────────┐  ┌───────────────┐  ┌──────────────┐   │
│  │ Weather Collector│  │ Kafka Producer│  │  AI Service  │   │
│  │  (OWM API — 10  │  │   & Consumer  │  │ IMD + LinReg │   │
│  │   zones, 60s)   │  │  (3 topics)   │  │  Heatwave    │   │
│  └─────────────────┘  └───────────────┘  └──────┬───────┘   │
│                              │                    │           │
│                    ┌─────────┘             ┌──────┘           │
│                    ▼                       ▼                  │
│              Kafka Topics             SQLite DB               │
│           (ZooKeeper 3.9)          (5-day history,            │
│         weather.current            Docker volume)             │
│         weather.forecast                                     │
│         weather.alerts                                       │
└─────────────────────────────────────────────────────────────┘
                        │
           ┌────────────▼───────────┐
           │     Docker Compose     │
           │  ZooKeeper → Kafka     │
           │  Kafka UI  (port 8080) │
           └────────────────────────┘
````

---

## ✨ Features

| Tab                | What you get                                                                                             |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| **Overview**       | 7 live KPI cards (Avg/Max Temp, Humidity, Rain, Wind, AQI, Zones) + zone comparison chart + 48h forecast |
| **Map & 3D**       | Leaflet heatmap (temp/humidity/rain modes) + Three.js drag-to-rotate 3D heatwave bars side-by-side       |
| **Forecast**       | 48h temperature/humidity area chart + precipitation probability + rain volume                            |
| **🔥 AI Heatwave** | IMD-classified current status + 5-day zone history + tomorrow's prediction with confidence level         |

**Real-time alert ticker** scrolls Kafka-sourced threshold alerts (`heat_wave`, `heavy_rain`, etc.) across the top.

---

## 🤖 AI Heatwave Engine

### Detection — IMD Official Criteria

| Level                  | Condition                                         |
| ---------------------- | ------------------------------------------------- |
| 🟢 **Normal**          | Max temp < 40°C                                   |
| 🟡 **Watch**           | Max temp ≥ 40°C                                   |
| 🟠 **Heatwave**        | Max temp ≥ 40°C AND departure from normal ≥ 4.5°C |
| 🔴 **Severe Heatwave** | Max temp ≥ 45°C OR departure ≥ 6.5°C              |
| ⛔ **Extreme**          | Max temp ≥ 47°C                                   |

### Prediction — Weighted Linear Regression

* Aggregates 5-day zone-level daily max temperatures from SQLite
* Applies exponential weights `e^(0.4 × day_index)` so recent days dominate the trend
* Predicts tomorrow's city max and classifies it using IMD criteria
* Falls back to IMD monthly climatological normals when data is insufficient

### Monthly Normal Reference (Nagpur)

| Jan  | Feb  | Mar  | Apr  | May  | Jun  | Jul  | Aug  | Sep  | Oct  | Nov  | Dec  |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 29°C | 32°C | 37°C | 41°C | 43°C | 38°C | 31°C | 30°C | 32°C | 35°C | 31°C | 29°C |

---

## 📡 Kafka Topics

| Topic              | Frequency           | Content                                             |
| ------------------ | ------------------- | --------------------------------------------------- |
| `weather.current`  | Every 60s           | Per-zone readings (temp, humidity, wind, AQI, rain) |
| `weather.forecast` | Every 60s           | 48-hour hourly forecast bundle                      |
| `weather.alerts`   | On threshold breach | `heat_wave`, `heavy_rain`, `high_wind`, `poor_aqi`  |

* **ZooKeeper**: port `2181`
* **Kafka broker**: port `9092`
* **Kafka UI**: port `8080` (local only)

---

## 🗺️ Monitored Zones — Nagpur

10 zones with individual lat/lon coordinates:

**Sitabuldi · Dharampeth · Sadar · Nagpur Airport · Hingna · Kamptee · Butibori · Wadi · Manewada · Wardha Road**

---

## 🛠️ Tech Stack

| Layer           | Technology                                                                |
| --------------- | ------------------------------------------------------------------------- |
| **Frontend**    | React 18, Three.js / @react-three/fiber, Recharts, Leaflet, Framer Motion |
| **Backend**     | Python 3.12, FastAPI, APScheduler                                         |
| **Streaming**   | Apache Kafka 3.6 + ZooKeeper 3.9 (Bitnami)                                |
| **AI**          | Weighted linear regression (NumPy) + IMD classification                   |
| **Storage**     | SQLite (Docker named volume — persists across restarts)                   |
| **Weather API** | OpenWeatherMap (Current + 48h Forecast + AQI)                             |
| **Deployment**  | HuggingFace Spaces (backend) + GitHub Pages (frontend)                    |
| **CI/CD**       | GitHub Actions → auto-deploys to `gh-pages` branch on push to `main`      |

---

## 🚀 Quick Start (Local)

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
```

Open `http://localhost:3000` · Kafka UI at `http://localhost:8080`

---

## ☁️ Cloud Deployment

### Backend — HuggingFace Spaces

1. Create a new **Docker** Space on [huggingface.co](https://huggingface.co)
2. Push `./backend/` contents to the Space repo
3. Set Space secrets:

| Secret                    | Value                  |
| ------------------------- | ---------------------- |
| `OPENWEATHER_API_KEY`     | Your OWM API key       |
| `KAFKA_BOOTSTRAP_SERVERS` | Upstash Kafka endpoint |
| `PORT`                    | `7860`                 |

> **Why Upstash?** HuggingFace Spaces runs a single Docker container, so it cannot host ZooKeeper + Kafka alongside FastAPI. Upstash provides managed Kafka on a free tier that works well here.

### Frontend — GitHub Pages

Add these GitHub Actions secrets to your repo:

| Secret                  | Value                                          |
| ----------------------- | ---------------------------------------------- |
| `REACT_APP_BACKEND_URL` | `https://YOUR_HF_USER-nagpur-weather.hf.space` |

Push to `main` → GitHub Actions builds and deploys to the `gh-pages` branch automatically.
Set repo **Pages source** to the `gh-pages` branch.

---

## 📂 Project Structure

```text
nagpur-redesign/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Main SPA shell, 4-tab layout
│   │   ├── components/
│   │   │   ├── AlertTicker.jsx     # Scrolling Kafka alert bar
│   │   │   ├── NagpurMap.jsx       # Leaflet heatmap (3 modes)
│   │   │   ├── HeatwaveIntensity3D.jsx  # Three.js / R3F 3D bars
│   │   │   ├── ForecastCharts.jsx  # Recharts temperature/zone charts
│   │   │   ├── PrecipitationViz.jsx     # Rain probability chart
│   │   │   └── AiHeatwavePanel.jsx # IMD status + prediction panel
│   │   └── hooks/
│   │       └── useWeatherData.js   # Polling hook + state management
│   └── package.json
├── backend/
│   ├── main.py                     # FastAPI app, lifespan, all endpoints
│   ├── weather_service.py          # OWM API fetcher (10 zones async)
│   ├── kafka_producer.py           # Publishes to 3 Kafka topics
│   ├── kafka_consumer.py           # Background consumer thread
│   ├── ai_service.py               # IMD classification + LinReg prediction
│   ├── history_store.py            # SQLite CRUD for 5-day temperature history
│   ├── config.py                   # Settings via env vars
│   ├── Dockerfile                  # Auto-adapts PORT for HF Spaces
│   └── requirements.txt
├── docker-compose.yml              # ZooKeeper + Kafka + Backend + Frontend
├── .env.example
└── .github/workflows/deploy.yml   # GitHub Actions CI/CD
```

---

## 🔌 API Endpoints

| Method | Endpoint                | Description                            |
| ------ | ----------------------- | -------------------------------------- |
| `GET`  | `/health`               | Health check                           |
| `GET`  | `/api/current`          | All 10 zones — current weather         |
| `GET`  | `/api/current/{zone}`   | Single zone data                       |
| `GET`  | `/api/forecast`         | 48-hour hourly forecast                |
| `GET`  | `/api/alerts`           | Recent threshold alerts                |
| `GET`  | `/api/heatmap`          | Lat/lon + metrics for map overlay      |
| `GET`  | `/api/ai/heatwave`      | AI status, prediction, 5-day history   |
| `GET`  | `/api/ai/zones-history` | Per-zone daily max temperature history |
| `POST` | `/api/refresh`          | Force immediate weather poll           |

---

## ⚠️ Known Challenges & Solutions

| Challenge                               | Solution                                                           |
| --------------------------------------- | ------------------------------------------------------------------ |
| Kafka can't run inside HF Spaces        | Upstash managed Kafka via `KAFKA_BOOTSTRAP_SERVERS` env var        |
| CORS between GitHub Pages and HF Spaces | `CORSMiddleware` with comma-delimited `allow_origins` from env     |
| SQLite lost on container restart        | Docker named volume persists DB across restarts                    |
| AI accuracy with sparse data            | Exponential-weighted LinReg; falls back to IMD monthly normals     |
| Three.js blocking initial load          | `React.lazy()` + `Suspense` defers 3D bundle to Map tab activation |

---

## 🗺️ Roadmap

* [ ] **Phase 2** — LSTM / ARIMA models for improved heatwave prediction
* [ ] **Phase 2** — Firebase Cloud Messaging push notifications
* [ ] **Phase 3** — Multi-city expansion (Chandrapur, Amravati, Akola)
* [ ] **Phase 3** — CSV/JSON historical export + Grafana/InfluxDB integration
* [ ] **Phase 4** — ONNX Runtime Web for offline browser-side inference
* [ ] **Phase 4** — Official IMD AWS feeds + CPCB AQI stream integration

---

## 👤 Author

**Mangesh Sarde** — RKNEC, Electronics & Communications Engineering, Sem VI

* GitHub: [github.com/Mangesh46](https://github.com/Mangesh46)
* Portfolio: [profile-henna-delta.vercel.app](https://profile-henna-delta.vercel.app)
* LinkedIn: [linkedin.com/in/mangesh-sarde](https://linkedin.com/in/mangesh-sarde)
* Email: `mangeshsarde6@gmail.com`

---

*Nagpur Weather Monitor v4 · Kafka · FastAPI · React 18 · Three.js · AI Heatwave · IMD Criteria*

```

If you want, I can also turn this into a **:contentReference[oaicite:0]{index=0}**.
```
