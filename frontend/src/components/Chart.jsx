import React from 'react';
import * as recharts from 'recharts';

export default function Chart({ data, formatTimestamp }) {
    const getData = () => {
        let rawData = data?.dailyAverage || [];
          return rawData.map((item) => ({
            timestamp: formatTimestamp(item.interval_start),
            average_count: item.average_count,
          }));
        
      };

      const chartData = getData();

      return (
        <recharts.ResponsiveContainer width="100%" height={300}>
        <recharts.LineChart data={chartData}>
        <recharts.CartesianGrid strokeDasharray="3 3" />
        <recharts.XAxis dataKey="timestamp" />
        <recharts.YAxis domain={[0, 1500]} />
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