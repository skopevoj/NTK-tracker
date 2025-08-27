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

  // print out the data
  console.log("Chart data points:", chartData);

  const maxVal = chartData.reduce((acc, cur) => Math.max(acc, Number(cur.people_count || 0)), 0);
  const yMax = Math.max(10, Math.ceil(maxVal * 1.15));

  const firstHour = 6;
  const xTicks = Array.from({ length: Math.ceil((24 - firstHour) / 2) + 1 }, (_, i) => {
    const hour = firstHour + i * 2;
    return hour * 60;
  });

  // Custom dot component to handle prediction vs actual styling
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.people_count === null) return null;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={0} // Hidden by default, only show on hover
        fill="var(--accent)"
        stroke="white"
        strokeWidth={2}
      />
    );
  };

  // Custom active dot for hover state
  const CustomActiveDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || payload.people_count === null) return null;

    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="var(--accent)"
        stroke="white"
        strokeWidth={2}
        filter="drop-shadow(0 0 6px var(--accent))"
      />
    );
  };

  // Split data into segments for different styling
  const processDataForRendering = () => {
    const segments = [];
    let currentSegment = [];
    let currentType = null;

    chartData.forEach((point, index) => {
      if (point.people_count === null) {
        // Skip null points but end current segment
        if (currentSegment.length > 0) {
          segments.push({ type: currentType, data: currentSegment });
          currentSegment = [];
          currentType = null;
        }
        return;
      }

      const pointType = point.is_prediction ? "prediction" : "actual";

      if (currentType !== pointType) {
        // Type changed, save current segment and start new one
        if (currentSegment.length > 0) {
          segments.push({ type: currentType, data: currentSegment });
        }
        currentSegment = [point];
        currentType = pointType;
      } else {
        currentSegment.push(point);
      }
    });

    // Don't forget the last segment
    if (currentSegment.length > 0) {
      segments.push({ type: currentType, data: currentSegment });
    }

    return segments;
  };

  const dataSegments = processDataForRendering();

  // Custom tooltip component to prevent flickering
  const CustomTooltip = ({ active, payload, label, coordinate }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    // Instead of using payload from lines, get data directly from chartData using label (x value)
    const dataPoint = chartData.find((point) => point.x === label);

    if (!dataPoint || dataPoint.people_count === null || dataPoint.people_count === undefined) {
      return null;
    }

    const value = dataPoint.people_count;
    const isPrediction = dataPoint.is_prediction;

    // Format the label (time)
    const h = Math.floor(label / 60);
    const m = label % 60;
    const timeLabel = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    return (
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          boxShadow: "var(--shadow-xl)",
          padding: "8px 12px",
          fontSize: "14px",
        }}
      >
        <div style={{ marginBottom: "4px", fontWeight: "500" }}>{timeLabel}</div>
        <div
          style={{
            color: isPrediction ? "var(--text-secondary)" : "var(--accent)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "2px",
              background: "var(--accent)",
              borderRadius: "1px",
              ...(isPrediction && {
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--accent) 0px, var(--accent) 4px, transparent 4px, transparent 6px)",
              }),
            }}
          />
          <span>
            {value} {isPrediction ? "predicted" : "actual"}
          </span>
        </div>
      </div>
    );
  };

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
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 4", opacity: 0.5 }}
              animationDuration={0}
              isAnimationActive={false}
              animationBegin={0}
              animationEasing="ease"
            />
            {/* Solid line for actual data */}
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
              name="actual"
            />
            {/* Dashed line for predictions */}
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
              opacity={0.8}
              name="prediction"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
