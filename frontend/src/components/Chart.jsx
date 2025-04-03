import React from 'react';
import * as recharts from 'recharts';

export default function Chart({ view, data, formatTimestamp, startDate }) {
    const getData = () => {
        const key =
          view === 'day'
            ? 'dailyAverage'
            : view === 'week'
            ? 'weeklyAverage'
            : 'monthlyAverage';
        let rawData = data?.[key] || [];
    
        if (view === 'week' && startDate) {
          // Generate a complete week (7 days) starting from the given startDate.
          const weekData = [];
          const start = new Date(startDate); // expected format "YYYY-MM-DD"
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(start.getTime() + i * 86400000);
            const dayStr = dayDate.toISOString().split('T')[0];
            // Find matching entry from rawData (if any)
            const entry = rawData.find((item) => {
              const itemDate = new Date(parseInt(item.interval_start, 10))
                .toISOString()
                .split('T')[0];
              return itemDate === dayStr;
            });
            weekData.push({
              // Display date in desired format (using cs-CZ locale)
              timestamp: dayDate.toLocaleDateString('cs-CZ', {
                day: '2-digit',
                month: '2-digit',
              }),
              average_count: entry ? entry.average_count : 0,
            });
          }
          return weekData;
        } else {
          return rawData.map((item) => ({
            timestamp: formatTimestamp(item.interval_start),
            average_count: item.average_count,
          }));
        }
      };
    
      const chartData = getData();
    
      // Always use a tick formatter for week view to control label display.
      const weekTickFormatter =
        view === 'week' && chartData.length > 0
          ? (() => {
              let lastDate = null;
              return (value) => {
                const datePart = value.split(' ')[0];
                let result = '';
                if (datePart !== lastDate) {
                  result = datePart;
                  lastDate = datePart;
                }
                return result;
              };
            })()
          : undefined;
    
      return (
        <recharts.LineChart width={500} height={300} data={chartData}>
          <recharts.Line
            type="monotone"
            dataKey="average_count"
            stroke="#8884d8"
            dot={false}
          />

          <recharts.XAxis dataKey="timestamp" tickFormatter={weekTickFormatter} domain={['10:00', '11:00']} />
          <recharts.YAxis />
          <recharts.Tooltip
            formatter={(value, name) => {
              if (name === 'average_count') {
                return ['people', `${value}`];
              }
              return [value, name];
            }}
          />
        </recharts.LineChart>
      );
}