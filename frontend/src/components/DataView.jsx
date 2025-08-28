import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Chart from "./Chart";
import ActivityHeatmap from "./ActivityHeatmap";
import WeeklyStats from "./WeeklyStats";

// Simple in-memory cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default function DataView() {
  const MIN_DATE = "2025-05-01";
  // Use Prague timezone for consistent date handling
  const TODAY = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Prague" });
  const clampToRange = (d) => {
    if (!d) return TODAY;
    if (d < MIN_DATE) return MIN_DATE;
    if (d > TODAY) return TODAY;
    return d;
  };
  // Initialize with Prague timezone date
  const [selectedDate, setSelectedDate] = useState(
    clampToRange(new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Prague" }))
  );
  const [data, setData] = useState(null);
  const [highest, setHighest] = useState({ people_count: 0, timestamp: null });
  const [current, setCurrent] = useState({ people_count: 0, timestamp: null });
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState(null);
  const loadingTimeoutRef = useRef(null);

  // --- Inline date controls handlers (prev / next / date change / today) ---
  const parseYMD = (ymd) => {
    if (!ymd) return null;
    const p = ymd.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  };

  const formatYMD = (d) => {
    if (!d) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const prevDay = () => {
    const d = parseYMD(selectedDate);
    if (!d) return;
    d.setDate(d.getDate() - 1);
    setSelectedDate(clampToRange(formatYMD(d)));
  };

  const nextDay = () => {
    const d = parseYMD(selectedDate);
    if (!d) return;
    d.setDate(d.getDate() + 1);
    setSelectedDate(clampToRange(formatYMD(d)));
  };

  const onDateChange = (e) => {
    setSelectedDate(clampToRange(e.target.value));
  };

  const goToday = () => {
    setSelectedDate(clampToRange(TODAY));
  };
  // --- end handlers ---

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
        <div className="flex items-center justify-center sm:justify-between gap-4 flex-wrap">
          <div style={{ minWidth: 0 }}>
            <h2
              className="chart-title"
              style={{ margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              Daily Occupancy - {new Date(selectedDate + "T00:00:00").toLocaleDateString("cs-CZ")}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Responsive inline date controls:
                - prev / date / next stay inline and centered on phones
                - Today button sits below as full width on phones and inline on wider screens */}
            <div className="w-full">
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-end w-full">
                <div className="flex items-center justify-center gap-2 w-full sm:w-auto relative">
                  {chartLoading && (
                    <div
                      style={{
                        position: "absolute",
                        right: "-0.25rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                      }}
                      aria-hidden={!chartLoading}
                    >
                      {/* only the spinner, no visible text */}
                      <div
                        className="loading-spinner"
                        style={{ width: "14px", height: "14px" }}
                        role="status"
                        aria-label="Loading"
                      />
                    </div>
                  )}

                  {/* Prev / date / Next (inline) */}
                  <div className="flex items-center gap-2">
                    <button
                      aria-label="Previous day"
                      onClick={prevDay}
                      className="px-3 py-2 rounded-lg border border-transparent hover:border var(--border)"
                      style={{ background: "transparent" }}
                      title="Previous day"
                    >
                      ‹
                    </button>

                    <input
                      type="date"
                      value={selectedDate}
                      onChange={onDateChange}
                      className="rounded-lg px-3 py-2 bg-transparent border border-gray-700 text-sm w-40 max-w-full"
                      aria-label="Select date"
                    />

                    <button
                      aria-label="Next day"
                      onClick={nextDay}
                      className="px-3 py-2 rounded-lg border border-transparent hover:border var(--border)"
                      style={{ background: "transparent" }}
                      title="Next day"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* Today button: full width on small screens, auto on larger */}
                <div className="w-full sm:w-auto mt-3 sm:mt-0 sm:ml-3">
                  <button
                    onClick={goToday}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg"
                    style={{
                      background: "var(--accent)",
                      color: "white",
                      fontWeight: 600,
                      boxShadow: `
                        6px 8px 18px rgba(6, 182, 212, 0.11),
                        -4px -4px 10px rgba(255, 255, 255, 0.02),
                        inset 1px 1px 2px rgba(0, 0, 0, 0.35),
                        inset -1px -1px 2px rgba(255, 255, 255, 0.015)
                      `,
                      transition: "box-shadow 220ms",
                    }}
                    aria-label="Go to today"
                  >
                    Today
                  </button>
                </div>
              </div>
            </div>
          </div>
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
