import './App.css';
import axios from 'axios';
import * as recharts from 'recharts';
import { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); 

  useEffect(() => {
    if (!selectedDate) return;

    axios.post('/api/graphql', {
      query: `
        query {
          dailyAverage(date: "${selectedDate}") {
            interval_start
            average_count
          }
        }
      `
    })
      .then(response => {
        setData(response.data);
        console.log('API Response:', response.data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, [selectedDate]);

  return (
    <>
      <div>
        <label htmlFor="date-selector">Select Date: </label>
        <input
          id="date-selector"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {data && data.data && data.data.dailyAverage && (
        <recharts.LineChart
          width={500}
          height={300}
          data={data.data.dailyAverage.map(item => ({
            timestamp: new Date(item.interval_start).toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
            average_count: item.average_count
          }))}>

          <recharts.Line type="monotone" dataKey="average_count" stroke="#8884d8" />
          <recharts.CartesianGrid stroke="#ccc" />
          <recharts.XAxis dataKey="timestamp" />
          <recharts.YAxis />
          <recharts.Tooltip/>
        </recharts.LineChart>
      )}

      {!data && <p>Loading...</p>}
      {data && data.data && data.data.dailyAverage.length === 0 && <p>No data available for the selected date.</p>}
    </>
  );
}

export default App;