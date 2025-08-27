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
          const fetchedData = response.data.data.dailyAverages;
          console.log(`ActivityHeatmap: Received ${fetchedData.length} days of data`);
          console.log("First few data points:", fetchedData.slice(0, 5));
          console.log("Last few data points:", fetchedData.slice(-5));
          setData(fetchedData);
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

  if (loading) return <div className="loading">Loading activity heatmap...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  // Create a map of date to average
  const dataMap = {};
  data.forEach((d) => {
    dataMap[d.date] = d.average;
  });

  const maxAvg = Math.max(...Object.values(dataMap), 0);
  console.log(`ActivityHeatmap: Max average: ${maxAvg}, Total unique dates: ${Object.keys(dataMap).length}`);

  // Generate days for heatmap - show last 52 weeks (364 days) plus padding for full weeks
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 363); // 52 weeks = 364 days, so go back 363 days

  // Find Sunday before startDate to align weeks properly
  const startDayOfWeek = startDate.getDay();
  const daysToSubtract = startDayOfWeek === 0 ? 0 : startDayOfWeek;
  startDate.setDate(startDate.getDate() - daysToSubtract);

  // Find Saturday after today to complete the last week
  const endDate = new Date(today);
  const endDayOfWeek = endDate.getDay();
  const daysToAdd = endDayOfWeek === 6 ? 0 : 6 - endDayOfWeek;
  endDate.setDate(endDate.getDate() + daysToAdd);

  console.log(
    `ActivityHeatmap: Date range from ${startDate.toISOString().split("T")[0]} to ${
      endDate.toISOString().split("T")[0]
    }`
  );

  const days = [];
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      average: dataMap[dateStr] || 0,
      dayOfWeek: d.getDay(),
      hasData: Object.prototype.hasOwnProperty.call(dataMap, dateStr),
    });
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  console.log(`ActivityHeatmap: Generated ${days.length} days in ${weeks.length} weeks`);
  const daysWithData = days.filter((d) => d.hasData).length;
  console.log(`ActivityHeatmap: ${daysWithData} days have actual data`);

  // Use full day names with unique keys to fix React key conflicts
  const dayLabels = [
    { short: "S", full: "Sunday", index: 0 },
    { short: "M", full: "Monday", index: 1 },
    { short: "T", full: "Tuesday", index: 2 },
    { short: "W", full: "Wednesday", index: 3 },
    { short: "T", full: "Thursday", index: 4 },
    { short: "F", full: "Friday", index: 5 },
    { short: "S", full: "Saturday", index: 6 },
  ];

  const getColor = (avg, hasData) => {
    if (!hasData || avg === 0) return "var(--surface)";
    if (maxAvg === 0) return "var(--surface)";
    const intensity = Math.min(avg / maxAvg, 1);
    const alpha = 0.2 + intensity * 0.8;
    return `rgba(124, 58, 237, ${alpha})`;
  };

  return (
    <>
      <h3 className="chart-title">
        Activity Overview (Last 52 Weeks)
        {daysWithData > 0 && (
          <span
            style={{ fontSize: "0.875rem", fontWeight: "normal", color: "var(--text-muted)", marginLeft: "0.5rem" }}
          >
            {daysWithData} days with data
          </span>
        )}
      </h3>
      <div className="heatmap-container">
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <div style={{ width: "20px" }}></div>
          {weeks.map((week, index) => {
            const firstDay = week[0];
            const date = new Date(firstDay.date);
            const month = date.toLocaleString("default", { month: "short" });
            const prevMonth =
              index > 0 ? new Date(weeks[index - 1][0].date).toLocaleString("default", { month: "short" }) : "";
            return (
              <div
                key={`month-${index}`}
                style={{ width: "14px", textAlign: "center", fontSize: "10px", color: "var(--text-muted)" }}
              >
                {month !== prevMonth ? month : ""}
              </div>
            );
          })}
        </div>

        <div className="heatmap-grid" style={{ display: "flex", gap: "2px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "20px" }}>
            {dayLabels.map((dayInfo, index) => (
              <div
                key={`day-label-${dayInfo.full}-${dayInfo.index}`}
                style={{
                  height: "14px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  visibility: index % 2 === 1 ? "visible" : "hidden",
                }}
              >
                {dayInfo.short}
              </div>
            ))}
          </div>

          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="heatmap-week">
              {week.map((day, dayIndex) => (
                <div
                  key={`day-${day.date}-${weekIndex}-${dayIndex}`}
                  className="heatmap-cell"
                  title={`${day.date}: ${day.hasData ? day.average.toFixed(1) + " avg people" : "No data"}`}
                  style={{
                    width: "14px",
                    height: "14px",
                    backgroundColor: getColor(day.average, day.hasData),
                    borderRadius: "3px",
                    border: `1px solid ${day.hasData ? "var(--border)" : "rgba(255,255,255,0.02)"}`,
                    opacity: day.hasData ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="heatmap-legend">
        <span>Less</span>
        <div className="heatmap-legend-scale">
          {[0, 0.25, 0.5, 0.75, 1].map((val, index) => (
            <div
              key={`legend-${index}`}
              style={{
                width: "14px",
                height: "14px",
                backgroundColor: getColor(val * maxAvg, true),
                borderRadius: "3px",
                border: "1px solid var(--border)",
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {daysWithData === 0 && (
        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "var(--surface)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          No historical data available. The heatmap will populate as data is collected over time.
        </div>
      )}
    </>
  );
}
