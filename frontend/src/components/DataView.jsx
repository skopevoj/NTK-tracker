import { useState, useEffect } from "react";
import axios from "axios";
import DateSelector from "./DateSelector";
import Chart from "./Chart";
import Card from "./ui/Card";

export default function DataView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState(null);
  const [highest, setHighest] = useState({ people_count: 0, timestamp: null });
  const [current, setCurrent] = useState({ people_count: 0, timestamp: null });
  const [todayPrediction, setTodayPrediction] = useState(null);
  const [tomorrowPrediction, setTomorrowPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = `
      query {
        dailyAverage(date: "${selectedDate}") {
          interval_start
          average_count
        }
      }
    `;

    axios
      .post("/api/graphql", { query })
      .then((response) => {
        if (response.data && response.data.data) {
          setData(response.data.data);
        } else {
          setData(null);
          setError("Unexpected API response");
        }
      })
      .catch((err) => {
        setData(null);
        setError(err.message || "Failed to fetch data");
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  useEffect(() => {
    const fetchAdditional = async () => {
      try {
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
          setHighest(response.data.data.highestOccupancy || { people_count: 0, timestamp: null });
          setCurrent(response.data.data.currentOccupancy || { people_count: 0, timestamp: null });
        }
      } catch (err) {
        // silent fail - keep previous values
        console.error(err);
      }
    };
    fetchAdditional();
  }, []);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

        const [todayRes, tomorrowRes] = await Promise.all([
          axios.get(`/api/predict?type=today&date=${today}`),
          axios.get(`/api/predict?type=tomorrow&date=${tomorrow}`),
        ]);

        setTodayPrediction(todayRes.data);
        setTomorrowPrediction(tomorrowRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPredictions();
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
    <>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Card className="stat">
          <div className="small">Highest recorded</div>
          <div className="value">{highest?.people_count ?? "-"}</div>
          <div className="meta">on {safeDate(highest?.timestamp)}</div>
        </Card>

        <Card className="stat">
          <div className="small">Current occupancy</div>
          <div className="value" style={{ color: "var(--accent)" }}>
            {current?.people_count ?? "-"}
          </div>
          <div className="meta">as of {safeDate(current?.timestamp)}</div>
        </Card>
      </div>

      <div className="card" style={{ marginBottom: 12, position: "relative" }}>
        {data && data.dailyAverage && data.dailyAverage.length > 0 ? (
          <>
            <Chart
              data={data}
              prediction={todayPrediction}
              formatTimestamp={formatTimestamp}
              selectedDate={selectedDate}
              isTodayPrediction={true}
            />
            {loading && (
              <div style={{ position: "absolute", top: 8, right: 12 }} className="small">
                Updating…
              </div>
            )}
          </>
        ) : loading ? (
          <div className="small">Loading chart…</div>
        ) : error ? (
          <div className="small">Error: {error}</div>
        ) : (
          <div className="small">No data available for the selected day.</div>
        )}
      </div>

      <DateSelector selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

      {tomorrowPrediction && Object.keys(tomorrowPrediction).length > 0 && (
        <div className="card" style={{ marginBottom: 12, position: "relative" }}>
          <h3>Tomorrow's Prediction</h3>
          <Chart
            data={{
              dailyAverage: Object.entries(tomorrowPrediction).map(([time, count]) => ({
                interval_start: time,
                average_count: count,
              })),
            }}
            formatTimestamp={formatTimestamp}
            selectedDate={selectedDate}
          />
        </div>
      )}
    </>
  );
}
