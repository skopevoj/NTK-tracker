import './App.css'
import axios from 'axios';
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
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });
  }, []);

  return (
    <>
      <p>{data ? JSON.stringify(data) : 'Loading...'}</p>
    </>
  );
}

export default App;