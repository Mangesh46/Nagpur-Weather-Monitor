// hooks/useWeatherData.js
import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8000";
const POLL_MS  = 60_000;   // re-fetch every 60 s

export function useWeatherData() {
  const [current,    setCurrent]    = useState(null);
  const [forecast,   setForecast]   = useState([]);
  const [alerts,     setAlerts]     = useState([]);
  const [heatmap,    setHeatmap]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  const fetchAll = useCallback(async () => {
    try {
      const [cur, fore, alert, heat] = await Promise.all([
        axios.get(`${BASE_URL}/api/current`),
        axios.get(`${BASE_URL}/api/forecast`),
        axios.get(`${BASE_URL}/api/alerts?limit=10`),
        axios.get(`${BASE_URL}/api/heatmap`),
      ]);
      setCurrent(cur.data);
      setForecast(fore.data.forecast || []);
      setAlerts(alert.data.alerts   || []);
      setHeatmap(heat.data.points   || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    try {
      await axios.post(`${BASE_URL}/api/refresh`);
      setTimeout(fetchAll, 3000);
    } catch (_) {}
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();
    timerRef.current = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchAll]);

  return { current, forecast, alerts, heatmap, loading, error, lastUpdate, forceRefresh };
}
