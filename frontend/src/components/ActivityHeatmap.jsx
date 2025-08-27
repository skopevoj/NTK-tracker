import { useState, useEffect } from "react";
import axios from "axios";

export default function ActivityHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = `
          query {
            dailyAverages(lastDays: 365) {
              date
              average
            }
          }
        `;
        const response = await axios.post("/api/graphql", { query });
        if (response.data && response.data.data) {
          setData(response.data.data.dailyAverages);
        } else {
          setError("Unexpected API response");
        }
      } catch (err) {
        setError(err.message || "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="small">Loading activity heatmap…</div>;
  if (error) return <div className="small">Error: {error}</div>;

  // Create a map of date to average
  const dataMap = {};
  data.forEach((d) => {
    dataMap[d.date] = d.average;
  });

  // Find the max average for scaling
  const maxAvg = Math.max(...Object.values(dataMap), 0);

  // Generate 365 days back from today, padded to full weeks (Sunday to Saturday)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);

  // Find Sunday before startDate
  const startDayOfWeek = startDate.getDay(); // 0=Sun
  const daysToSubtract = startDayOfWeek === 0 ? 0 : startDayOfWeek;
  startDate.setDate(startDate.getDate() - daysToSubtract);

  const endDate = new Date(today);
  // Find Saturday after endDate
  const endDayOfWeek = endDate.getDay();
  const daysToAdd = endDayOfWeek === 6 ? 0 : 6 - endDayOfWeek;
  endDate.setDate(endDate.getDate() + daysToAdd);

  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      average: dataMap[dateStr] || 0,
      dayOfWeek: d.getDay(),
    });
  }

  // Group into weeks (7 days each, starting Sunday)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Day labels for the left side
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Color palette variables for maintainability
  const colorPalette = {
    gray: "hsl(221, 53.60%, 13.50%)",
    lightGreen: "hsl(120, 50%, 80%)",
    darkGreen: "hsl(120, 50%, 30%)",
  };

  // Color function: 0 = no data (gray), green shades from light to dark based on maxAvg
  const getColor = (avg) => {
    if (avg === 0 || maxAvg === 0) return colorPalette.gray; // Gray for no data
    const intensity = avg / maxAvg; // Scale relative to max
    const lightness = 20 + intensity * 60; // Lightness from 20% (dark green) to 80% (light green), inverted
    return `hsl(120, 50%, ${lightness}%)`; // Green hue
  };

  // Glow function for each cell
  const getGlow = (avg) => {
    const color = getColor(avg);
    return avg === 0 ? "none" : `0 0 2px ${color}`;
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>Last 365 Days Activity</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Month labels row */}
        <div style={{ display: "flex", gap: 2, marginBottom: 4 }}>
          <div style={{ width: 30 }}></div> {/* Spacer for day labels */}
          {weeks.map((week, index) => {
            const firstDay = week[0];
            const date = new Date(firstDay.date);
            const month = date.toLocaleString("default", { month: "short" });
            const prevMonth =
              index > 0 ? new Date(weeks[index - 1][0].date).toLocaleString("default", { month: "short" }) : "";
            return (
              <div key={index} style={{ width: 12, textAlign: "center", fontSize: 10, color: "var(--muted)" }}>
                {month !== prevMonth ? month : ""}
              </div>
            );
          })}
        </div>
        {/* Main grid with day labels on left */}
        <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
          {/* Day labels column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: 30 }}>
            {dayLabels.map((day) => (
              <div
                key={day}
                style={{ height: 12, display: "flex", alignItems: "center", fontSize: 10, color: "var(--muted)" }}
              >
                {day}
              </div>
            ))}
          </div>
          {/* Weeks grid */}
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.average.toFixed(1)} avg people`}
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: getColor(day.average),
                    borderRadius: 2,
                    cursor: "pointer",
                    boxShadow: getGlow(day.average), // Add glow effect
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--muted)" }}
      >
        <span>Less</span>
        <div style={{ display: "flex", gap: 4 }}>
          {[0, 0.25 * maxAvg, 0.5 * maxAvg, 0.75 * maxAvg, maxAvg].map((val) => (
            <div
              key={val}
              style={{
                width: 12,
                height: 12,
                backgroundColor: getColor(val),
                borderRadius: 2,
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
