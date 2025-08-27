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

  if (loading) return <div className="small">Loading weekly stats…</div>;
  if (error) return <div className="small">Error: {error}</div>;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartData = data.map((item) => ({
    day: dayNames[item.dayOfWeek],
    average: item.average,
  }));

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>Average Occupancy by Day (Last 4 Weeks)</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value}`, "avg people"]} />
          <Bar dataKey="average" fill="#7c5cff" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
