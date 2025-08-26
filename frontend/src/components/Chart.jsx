import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";

export default function Chart({ data, formatTimestamp }) {
  const rawData = data?.dailyAverage || [];

  // Create a map of timestamps to average counts for quick lookup
  const dataMap = new Map(
    rawData.map((item) => [formatTimestamp(item.interval_start), item.average_count])
  );

  // Generate a full 24-hour data set with 15-minute intervals
  const fullDayData = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4).toString().padStart(2, "0");
    const minute = (i % 4 * 15).toString().padStart(2, "0");
    const timestamp = `${hour}:${minute}`;
    return {
      timestamp,
      average_count: dataMap.get(timestamp) ?? null,
    };
  });

  const firstTimestamp = rawData.length > 0 ? formatTimestamp(rawData[0].interval_start) : "00:00";

  const chartData = fullDayData.slice(fullDayData.findIndex(d => d.timestamp === firstTimestamp));

  // Determine max for dynamic Y axis
  const maxVal = rawData.reduce((acc, cur) => Math.max(acc, Number(cur.average_count || 0)), 0);
  const yMax = Math.max(10, Math.ceil(maxVal * 1.15));

  const firstHour = parseInt(firstTimestamp.split(":")[0], 10);
  const xTicks = Array.from({ length: Math.ceil((24 - firstHour) / 2) + 1 }, (_, i) => {
    const hour = firstHour + i * 2;
    return `${hour.toString().padStart(2, "0")}:00`;
  });


  return (
    <div style={{ width: "100%", height: 320 }}>
      {rawData.length === 0 ? (
        <div className="small">No chart data</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} className="my-line">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="timestamp"
              name="Time"
              type="category"
              ticks={xTicks}
              domain={[firstTimestamp, "23:45"]}
            />
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
              connectNulls
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
