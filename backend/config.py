from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    kafka_bootstrap_servers: str = "kafka:9092"
    poll_interval_seconds: int = 60
    cors_origins: str = "http://localhost:3000"
    db_path: str = "/app/data/weather.db"

    nagpur_lat: float = 21.1458
    nagpur_lon: float = 79.0882

    nagpur_zones: list[dict] = [
        {"name": "Sitabuldi",     "lat": 21.1463, "lon": 79.0849},
        {"name": "Dharampeth",    "lat": 21.1324, "lon": 79.0591},
        {"name": "Sadar",         "lat": 21.1500, "lon": 79.0700},
        {"name": "NagpurAirport", "lat": 21.0922, "lon": 79.0472},
        {"name": "Hingna",        "lat": 21.1100, "lon": 78.9700},
        {"name": "Kamptee",       "lat": 21.2167, "lon": 79.2000},
        {"name": "Butibori",      "lat": 20.9800, "lon": 79.0600},
        {"name": "Wadi",          "lat": 21.1600, "lon": 79.2200},
        {"name": "Manewada",      "lat": 21.0980, "lon": 79.0850},
        {"name": "WardhaRoad",    "lat": 21.1050, "lon": 79.1200},
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
