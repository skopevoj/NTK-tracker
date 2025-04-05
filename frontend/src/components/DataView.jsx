import { useState, useEffect } from 'react';
import axios from 'axios';
import DateSelector from './DateSelector';
import Chart from './Chart';

export default function DataView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [highest, setHighest] = useState({ people_count: 0, timestamp: null });
  const [current, setCurrent] = useState({ people_count: 0, timestamp: null });

  useEffect(() => {
    let query = `
        query {
          dailyAverage(date: "${selectedDate}") {
            interval_start
            average_count
          }
        }
      `;

      axios
        .post('/api/graphql', { query })
        .then((response) => {
          if (response.data && response.data.data) {
            setData(response.data.data);
          } else {
            console.error('Unexpected API response:', response);
            setData(null);
          }
        })
        .catch((error) => {
          console.error('Error fetching data:', error);
          setData(null);
        });
  }, [selectedDate, startDate, endDate, month]);

  useEffect(() => {
    const fetchAdditionalData = async () => {
      try {
        const query = `
          query {
            highestOccupancy {
              people_count
              timestamp
            }
            currentOccupancy {
              people_count
              timestamp
            }
          }
        `;

        const response = await axios.post('/api/graphql', { query });
        if (response.data && response.data.data) {
          setHighest(response.data.data.highestOccupancy);
          setCurrent(response.data.data.currentOccupancy);
        } else {
          console.error('Unexpected API response:', response);
        }
      } catch (error) {
        console.error('Error fetching additional data:', error);
      }
    };

    fetchAdditionalData();
  }, []);

  const formatTimestamp = (timestamp) => {
    const date = new Date(parseInt(timestamp, 10));
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px'}}>
        <div className='card'>
          <h3>{highest.people_count}</h3>
          <p>Highest Occupancy on {new Date(highest.timestamp).toLocaleDateString('cs-CZ')}</p>
        </div>
        <div className='card'>
          <h3>{current.people_count}</h3>
          <p>Current Occupancy on {new Date(current.timestamp).toLocaleDateString('cs-CZ')}</p>
        </div>
      </div>
      

      <div>
        {data && data.dailyAverage ? (
          <Chart data={data} startDate={startDate} formatTimestamp={formatTimestamp} selectedDate={selectedDate} />
        ) : !data ? (
          <p>Loading...</p>
        ) : data.dailyAverage?.length === 0 ? (
          <p>No data available for the selected day.</p>
        ) : null}
      </div>

      <DateSelector
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        month={month}
        setMonth={setMonth}
      />
    </>
  );
}