import React from 'react';
import * as recharts from 'recharts';

export default function Chart({ data, formatTimestamp, startDate }) {
    const getData = () => {
        let rawData = data?.dailyAverage || [];
        if (startDate) {
          const weekData = [];
          const start = new Date(startDate);
          for (let i = 0; i < 7; i++) {
            const dayDate = new Date(start.getTime() + i * 86400000);
            const dayStr = dayDate.toISOString().split('T')[0];
            const entry = rawData.find((item) => {
              const itemDate = new Date(parseInt(item.interval_start, 10))
                .toISOString()
                .split('T')[0];
              return itemDate === dayStr;
            });
            weekData.push({
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

      return (
        <recharts.ResponsiveContainer width="100%" height={300}>
          <recharts.LineChart data={chartData}>
        <recharts.CartesianGrid strokeDasharray="3 3" />
        <recharts.XAxis dataKey="timestamp" />
        <recharts.YAxis />
        <recharts.Tooltip
          formatter={(value, name) => {
        if (name === 'average_count') {
          return [`${value}`, 'people'];
        }
        return [value, name];
          }}
        />
        <recharts.Line
          type="monotone"
          dataKey="average_count"
          stroke="#8884d8"
          strokeWidth={2}
          dot={false}
          activeDot={false}
        />
          </recharts.LineChart>
        </recharts.ResponsiveContainer>
      );
}