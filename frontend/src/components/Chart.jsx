import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from "recharts";

export default function Chart({ data, prediction, formatTimestamp, selectedDate }) {
  const rawData = data?.dailyAverage || [];

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

  const dataMap = new Map(
    rawData.map((item) => [toLabel(item.interval_start), item.average_count]).filter(([k]) => k !== null)
  );

  const fullDayData = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4)
      .toString()
      .padStart(2, "0");
    const minute = ((i % 4) * 15).toString().padStart(2, "0");
    const timestamp = `${hour}:${minute}`;
    return {
      timestamp,
      average_count: dataMap.get(timestamp) ?? null,
      prediction_count: prediction ? prediction[timestamp] ?? null : null,
    };
  });

  const firstLabel = rawData.length > 0 ? toLabel(rawData[0].interval_start) : "00:00";
  const firstIndex = fullDayData.findIndex((d) => d.timestamp === firstLabel);
  const startIndex = firstIndex >= 0 ? firstIndex : 0;

  // find last index in fullDayData that contains real average_count (global index)
  let lastRealIndex = -1;
  for (let i = 0; i < fullDayData.length; i++) {
    if (fullDayData[i].average_count !== null && fullDayData[i].average_count !== undefined) {
      lastRealIndex = i;
    }
  }

  // Build chartData slice. Use combined_value = real || prediction to ensure identical path geometry,
  // and solid_value only for the real-data segment (overlay).
  const slicedFull = fullDayData.slice(startIndex);
  const chartData = slicedFull.map((point, idx) => {
    const globalIdx = startIndex + idx;
    const combined_value =
      point.average_count != null
        ? point.average_count
        : point.prediction_count != null
        ? point.prediction_count
        : null;
    const solid_value = globalIdx <= lastRealIndex ? point.average_count : null;
    return {
      ...point,
      combined_value,
      solid_value,
    };
  });

  const maxVal = rawData.reduce((acc, cur) => Math.max(acc, Number(cur.average_count || 0)), 0);
  const maxPredictionVal = prediction
    ? Object.values(prediction).reduce((acc, cur) => Math.max(acc, Number(cur || 0)), 0)
    : 0;
  const yMax = Math.max(10, Math.ceil(Math.max(maxVal, maxPredictionVal) * 1.15));

  const firstHour = parseInt((chartData[0]?.timestamp || "00:00").split(":")[0], 10);
  const xTicks = Array.from({ length: Math.ceil((24 - firstHour) / 2) + 1 }, (_, i) => {
    const hour = firstHour + i * 2;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  const todayUTC = new Date().toISOString().split("T")[0];
  const showPrediction = prediction && selectedDate === todayUTC;

  return (
    <div style={{ width: "100%", height: 320 }}>
      {rawData.length === 0 && (!prediction || Object.keys(prediction).length === 0) ? (
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
              domain={[chartData[0]?.timestamp || "00:00", "23:45"]}
            />
            <YAxis domain={[0, yMax]} tick={{ fill: "var(--muted)" }} />
            <Tooltip
              formatter={(value) => {
                return [`${value}`, "people"];
              }}
              contentStyle={{ background: "rgba(6,18,38,0.8)", border: "none", color: "var(--text)" }}
            />
            {/* dashed full path (uses combined values) behind */}
            {showPrediction && (
              <Line
                type="monotone"
                dataKey="combined_value"
                stroke="#7c5cff"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
                activeDot={false}
                connectNulls
                strokeLinecap="round"
                isAnimationActive={false}
              />
            )}
            {/* solid overlay for real-data segment only */}
            <Line
              type="monotone"
              dataKey="solid_value"
              stroke="#7c5cff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              strokeLinecap="round"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
