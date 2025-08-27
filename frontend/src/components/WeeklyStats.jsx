import { useState, useEffect } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function WeeklyStats() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = `
          query {
            weeklyAverages {
              dayOfWeek
              average
            }
          }
        `;
        const response = await axios.post("/api/graphql", { query });
        if (response.data && response.data.data) {
          setData(response.data.data.weeklyAverages);
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

  if (loading) return <div className="loading">Loading weekly statistics...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartData = data.map((item) => ({
    day: dayNames[item.dayOfWeek],
    average: item.average,
  }));

  return (
    <>
      <h3 className="chart-title">Weekly Average (Last 4 Weeks)</h3>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="day"
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              formatter={(value) => [`${Math.round(value)}`, "avg people"]}
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-xl)",
              }}
            />
            <Bar dataKey="average" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
