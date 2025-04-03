import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import axios from 'axios';

export default function Chart2() {
  const startTime = new Date(2025, 3, 3, 8, 0, 0).getTime();
  const endTime = new Date(2025, 3, 3, 14, 0, 0).getTime();
  const [data, setData] = useState([]);

  useEffect(() => {
    axios
      .post('/api/graphql', {
        query: `
          {
            dailyAverage(date: "2025-04-03") {
              interval_start
              average_count
            }
          }
        `
      })
      .then((response) => {
        if (response.data && response.data.data && response.data.data.dailyAverage) {
          const transformed = response.data.data.dailyAverage.map(d => ({
            time: Number(d.interval_start),
            value: d.average_count
          }));
          setData(transformed);
        } else {
          console.error('Unexpected API response:', response);
          setData([]);
        }
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setData([]);
      });
  }, []);

  return (
    <div>
      <LineChart width={700} height={300} data={data}>
        <XAxis
          dataKey="time"
          type="number"
          domain={[startTime, endTime]}
          allowDataOverflow
          tickFormatter={(tick) =>
            new Date(tick).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        />
        <YAxis />
        <Line type="monotone" dataKey="value" stroke="#8884d8" />
        <Tooltip
          formatter={(value, name) => {
            if (name === 'average_count') {
              return ['people', `${value}`];
            }
            return [value, name];
          }}
        />
      </LineChart>
    </div>
  );
}
