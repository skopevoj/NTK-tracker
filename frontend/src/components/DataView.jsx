import { useState, useEffect, useRef } from "react";
import axios from "axios";
import DateSelector from "./DateSelector";
import Chart from "./Chart";
import ActivityHeatmap from "./ActivityHeatmap";
import WeeklyStats from "./WeeklyStats";

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function DataView() {
  const MIN_DATE = "2025-05-01";
  const TODAY = new Date().toISOString().split("T")[0];
  const clampToRange = (d) => {
    if (!d) return TODAY;
    if (d < MIN_DATE) return MIN_DATE;
    if (d > TODAY) return TODAY;
    return d;
  };
  const [selectedDate, setSelectedDate] = useState(clampToRange(new Date().toISOString().split("T")[0]));
  const [data, setData] = useState(null);
  const [highest, setHighest] = useState({ people_count: 0, timestamp: null });
  const [current, setCurrent] = useState({ people_count: 0, timestamp: null });
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadingTimeoutRef = useRef(null);

  // Cache utility functions
  const getCachedData = (key) => {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  };

  const setCachedData = (key, data) => {
    apiCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = `predict-${selectedDate}`;

      // Show loading indicator after 300ms to avoid flashing for cached requests
      loadingTimeoutRef.current = setTimeout(() => {
        setChartLoading(true);
      }, 300);

      try {
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setError(null);
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
          }
          setChartLoading(false);
          return;
        }

        setError(null);
        const response = await axios.get(`/api/predict?date=${selectedDate}`);

        if (response.data) {
          setData(response.data);
          setCachedData(cacheKey, response.data);
        } else {
          setData(null);
          setError("Unexpected API response");
        }
      } catch (err) {
        setData(null);
        setError(err.message || "Failed to fetch data");
      } finally {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        setLoading(false);
        setChartLoading(false);
      }
    };

    fetchData();

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [selectedDate]);

  useEffect(() => {
    const fetchAdditional = async () => {
      const cacheKey = "additional-stats";

      try {
        // Check cache first
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          setHighest(cachedData.highest || { people_count: 0, timestamp: null });
          setCurrent(cachedData.current || { people_count: 0, timestamp: null });
          return;
        }

        const query = `
          query {
            highestOccupancy {
              people_count
              timestamp
            }
            currentOccupancy {
              people_count
              timestamp
            }
          }
        `;
        const response = await axios.post("/api/graphql", { query });
        if (response.data && response.data.data) {
          const statsData = {
            highest: response.data.data.highestOccupancy || { people_count: 0, timestamp: null },
            current: response.data.data.currentOccupancy || { people_count: 0, timestamp: null },
          };

          setHighest(statsData.highest);
          setCurrent(statsData.current);
          setCachedData(cacheKey, statsData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAdditional();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "-";

    // If already "HH:MM" label, return as-is
    if (/^\d{2}:\d{2}$/.test(timestamp)) return timestamp;

    // If backend returned Prague-local "YYYY-MM-DDTHH:MM:SS" (or "YYYY-MM-DD HH:MM:SS"), extract HH:MM directly
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(timestamp)) {
      return timestamp.slice(11, 16);
    }

    try {
      // parse full ISO with timezone (or numeric epoch) and render in Prague timezone
      const d = new Date(timestamp);
      if (!isNaN(d)) {
        return d.toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Prague",
        });
      }
      const parsed = new Date(parseInt(timestamp, 10));
      if (!isNaN(parsed)) {
        return parsed.toLocaleTimeString("cs-CZ", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Europe/Prague",
        });
      }
    } catch {
      // fallthrough
    }
    return "-";
  };

  const safeDate = (ts) => {
    if (!ts) return "-";

    // If backend returned Prague-local "YYYY-MM-DDTHH:MM:SS", reuse the date part
    if (/^\d{4}-\d{2}-\d{2}[T ]/.test(ts)) {
      try {
        const datePart = ts.slice(0, 10);
        const d = new Date(`${datePart}T00:00:00`);
        return d.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });
      } catch {
        return ts.slice(0, 10);
      }
    }

    try {
      const d = new Date(ts);
      if (isNaN(d)) return "-";
      return d.toLocaleDateString("cs-CZ", { timeZone: "Europe/Prague" });
    } catch {
      return "-";
    }
  };

  return (
    <div className="grid grid-cols-1" style={{ gap: "2rem" }}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2">
        <div className="glass-card stat-card">
          <div className="stat-label">Highest Recorded</div>
          <div className="stat-value">{highest?.people_count ?? "-"}</div>
          <div className="stat-meta">on {safeDate(highest?.timestamp)}</div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-label">Current Occupancy</div>
          <div className="stat-value accent">{current?.people_count ?? "-"}</div>
          <div className="stat-meta">as of {formatTimestamp(current?.timestamp)}</div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-card">
        <div style={{ position: "relative" }}>
          <h2 className="chart-title">
            Daily Occupancy - {new Date(selectedDate + "T00:00:00").toLocaleDateString("cs-CZ")}
          </h2>
          {chartLoading && (
            <div
              style={{
                position: "absolute",
                top: "0.5rem",
                right: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--text-muted)",
                fontSize: "0.875rem",
              }}
            >
              <div className="loading-spinner"></div>
              Updating...
            </div>
          )}
        </div>
        <div className="chart-container">
          {data && data.length > 0 ? (
            <Chart data={data} formatTimestamp={formatTimestamp} selectedDate={selectedDate} />
          ) : loading ? (
            <div className="loading">Loading chart data...</div>
          ) : error ? (
            <div className="error">Error: {error}</div>
          ) : (
            <div className="loading">No data available for the selected day</div>
          )}
        </div>
        <DateSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1">
        <div className="glass-card">
          <ActivityHeatmap />
        </div>

        <div className="glass-card">
          <WeeklyStats />
        </div>
      </div>
    </div>
  );
}
