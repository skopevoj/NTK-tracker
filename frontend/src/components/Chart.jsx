import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";

export default function Chart({ data, formatTimestamp }) {
  const rawData = data?.dailyAverage || [];
  const chartData = rawData.map((item) => ({
    timestamp: item.interval_start ? formatTimestamp(item.interval_start) : "—",
    average_count: item.average_count ?? 0,
  }));

  // determine max for dynamic Y axis
  const maxVal = chartData.reduce((acc, cur) => Math.max(acc, Number(cur.average_count || 0)), 0);
  const yMax = Math.max(10, Math.ceil(maxVal * 1.15));

  return (
    <div style={{ width: "100%", height: 320 }}>
      {chartData.length === 0 ? (
        <div className="small">No chart data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} className="my-line">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="timestamp" name="Time" />
            <YAxis domain={[0, yMax]} tick={{ fill: "var(--muted)" }} />
            <Tooltip
              formatter={(value, name) => {
                if (name === "average_count") {
                  return [`${value}`, "people"];
                }
                return [value, name];
              }}
              contentStyle={{ background: "rgba(6,18,38,0.8)", border: "none", color: "var(--text)" }}
            />
            <Line
              type="monotone"
              dataKey="average_count"
              stroke="url(#lineGradient)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <defs>
              <linearGradient id="lineGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#7c5cff" stopOpacity="1" />
                <stop offset="100%" stopColor="#5db8ff" stopOpacity="1" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
