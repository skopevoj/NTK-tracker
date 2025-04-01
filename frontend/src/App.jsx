import './App.css'
import axios from 'axios';
import * as recharts from 'recharts';
import { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.post('/api/graphql', {
      query: `
        query {
          occupancyHistory(limit: 5) {
            id
            timestamp
            people_count
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
  }, []);

  return (
    <>
      <p>{data ? JSON.stringify(data) : 'Loading...'}</p>

      {data && data.data && data.data.occupancyHistory && (
        <recharts.LineChart
          width={500}
          height={300}
          data={data.data.occupancyHistory.map(item => ({
                timestamp: new Date(item.timestamp).toLocaleTimeString('cs-CZ', { timeZone: 'Europe/Prague' }),
                people_count: item.people_count
                }))}>
                  
          <recharts.Line type="monotone" dataKey="people_count" stroke="#8884d8" />
          <recharts.CartesianGrid stroke="#ccc" />
          <recharts.XAxis dataKey="timestamp" />
          <recharts.YAxis />
        </recharts.LineChart>

        
      )}

    </>
  );
}

export default App;