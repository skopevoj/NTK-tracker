import { useState, useEffect } from 'react';
import * as recharts from 'recharts';
import axios from 'axios';

export default function DataView() {
  const [view, setView] = useState('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);


  useEffect(() => {
    let query = '';
    if (view === 'day') {
      query = `
        query {
          dailyAverage(date: "${selectedDate}") {
            interval_start
            average_count
          }
        }
      `;
    } else if (view === 'week' && startDate && endDate) {
      query = `
        query {
          weeklyAverage(startDate: "${startDate}", endDate: "${endDate}") {
            interval_start
            average_count
          }
        }
      `;
    } else if (view === 'month') {
      query = `
        query {
          monthlyAverage(month: "${month}") {
            interval_start
            average_count
          }
        }
      `;
    }

    if (query) {
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
    }
  }, [view, selectedDate, startDate, endDate, month]);


  const formatTimestamp = (timestamp) => {
    const date = new Date(parseInt(timestamp, 10));
    if (view === 'day') {
      return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    } else if (view === 'week') {
      return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } else if (view === 'month') {
      return date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
    }
    return '';
  };

  return (
    <>
      <div>DataView</div>
      <div>
        <select value={view} onChange={(e) => setView(e.target.value)}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
      </div>

      <div>
        {view === 'day' && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        )}
        {view === 'week' && (
          <>
            <input
              type="date"
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date"
            />
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date"
            />
          </>
        )}
        {view === 'month' && (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        )}
      </div>

      <div>
        {data && data[view === 'day' ? 'dailyAverage' : view === 'week' ? 'weeklyAverage' : 'monthlyAverage'] && (
          <recharts.LineChart
            width={500}
            height={300}
            data={
              (data?.[view === 'day' ? 'dailyAverage' : view === 'week' ? 'weeklyAverage' : 'monthlyAverage'] || []).map(
                (item) => ({
                  timestamp: formatTimestamp(item.interval_start),
                  average_count: item.average_count,
                })
              )
            }
          >
            <recharts.Line type="monotone" dataKey="average_count" stroke="#8884d8" />
            <recharts.CartesianGrid stroke="#ccc" />
            <recharts.XAxis dataKey="timestamp" />
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
        )}
        {!data && <p>Loading...</p>}
        {data && data[view === 'day' ? 'dailyAverage' : view === 'week' ? 'weeklyAverage' : 'monthlyAverage']?.length === 0 && (
          <p>No data available for the selected {view}.</p>
        )}
      </div>
    </>
  );
}