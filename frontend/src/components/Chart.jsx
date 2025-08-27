import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";

export default function Chart({ data, formatTimestamp }) {
  const toLabel = (interval) => {
    if (!interval) return null;
    if (/^\d{2}:\d{2}$/.test(interval)) return interval;
    if (typeof formatTimestamp === "function") {
      const f = formatTimestamp(interval);
      if (f && f !== "-" && /^\d{2}:\d{2}$/.test(f)) return f;
    }
    try {
      const d = new Date(interval);
      if (!isNaN(d)) return d.toISOString().slice(11, 16);
    } catch {
      // ignore
    }
    return null;
  };

  // Generate full time slots from 06:00 to 24:00 in 15-min intervals
  const fullTimeSlots = [];
  for (let i = 0; i <= 18 * 4; i++) {
    const hour = Math.floor(i / 4) + 6;
    const minute = (i % 4) * 15;
    const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
    fullTimeSlots.push(time);
  }

  // Map data to full slots, using null for missing
  const dataMap = {};
  data.forEach((item) => {
    const time = toLabel(item.time);
    if (time && fullTimeSlots.includes(time)) {
      dataMap[time] = {
        timestamp: time,
        people_count: item.people_count,
        is_prediction: item.is_prediction,
      };
    }
  });

  const chartData = fullTimeSlots.map((time) => {
    const [h, m] = time.split(":").map(Number);
    const x = h * 60 + m;
    return dataMap[time] ? { ...dataMap[time], x } : { timestamp: time, people_count: null, is_prediction: true, x };
  });

  const maxVal = chartData.reduce((acc, cur) => Math.max(acc, Number(cur.people_count || 0)), 0);
  const yMax = Math.max(10, Math.ceil(maxVal * 1.15));

  const firstHour = 6;
  const xTicks = Array.from({ length: Math.ceil((24 - firstHour) / 2) + 1 }, (_, i) => {
    const hour = firstHour + i * 2;
    return hour * 60;
  });

  const solidData = chartData.map((item) => (item.is_prediction ? { ...item, people_count: null } : item));
  const dashedData = chartData.map((item) => (!item.is_prediction ? { ...item, people_count: null } : item));

  return (
    <div style={{ width: "100%", height: 320 }}>
      {chartData.length === 0 ? (
        <div className="loading">No chart data available</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" opacity={0.5} />
            <XAxis
              dataKey="x"
              type="number"
              domain={[360, 1440]}
              tickFormatter={(value) => {
                const h = Math.floor(value / 60);
                const m = value % 60;
                return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
              }}
              ticks={xTicks}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => [`${value}`, "people"]}
              labelFormatter={(value) => {
                const h = Math.floor(value / 60);
                const m = value % 60;
                return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
              }}
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                boxShadow: "var(--shadow-xl)",
              }}
            />
            <Line
              type="monotone"
              dataKey="people_count"
              stroke="var(--accent)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "white", strokeWidth: 2 }}
              connectNulls
              strokeLinecap="round"
              isAnimationActive={false}
              data={solidData}
            />
            <Line
              type="monotone"
              dataKey="people_count"
              stroke="var(--accent)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: "var(--accent)", stroke: "white", strokeWidth: 2 }}
              connectNulls
              strokeLinecap="round"
              isAnimationActive={false}
              data={dashedData}
              strokeDasharray="8 4"
              opacity={0.7}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
