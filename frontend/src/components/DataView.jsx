import { useState, useEffect } from 'react';
import axios from 'axios';
import DateSelector from './DateSelector';
import Chart from './Chart';
import Card from './ui/Card';

export default function DataView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [highest, setHighest] = useState({ people_count: 0, timestamp: null });
  const [current, setCurrent] = useState({ people_count: 0, timestamp: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const query = `
      query {
        dailyAverage(date: "${selectedDate}") {
          interval_start
          average_count
        }
      }
    `;

    axios.post('/api/graphql', { query })
      .then((response) => {
        if (response.data && response.data.data) {
          setData(response.data.data);
        } else {
          setData(null);
          setError('Unexpected API response');
        }
      })
      .catch((err) => {
        setData(null);
        setError(err.message || 'Failed to fetch data');
      })
      .finally(() => setLoading(false));
  }, [selectedDate, month]);

  useEffect(() => {
    const fetchAdditional = async () => {
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
          setHighest(response.data.data.highestOccupancy || { people_count: 0, timestamp: null });
          setCurrent(response.data.data.currentOccupancy || { people_count: 0, timestamp: null });
        }
      } catch (err) {
        // silent fail - keep previous values
        console.error(err);
      }
    };
    fetchAdditional();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date)) {
      // If server uses numeric timestamp string
      const parsed = new Date(parseInt(timestamp, 10));
      if (!isNaN(parsed)) return parsed.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      return '-';
    }
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  };

  const safeDate = (ts) => {
    if (!ts) return '-';
    try {
      const d = new Date(ts);
      if (isNaN(d)) return '-';
      return d.toLocaleDateString('cs-CZ');
    } catch {
      return '-';
    }
  };

  return (
    <>
      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <Card className="stat">
          <div className="small">Highest recorded</div>
          <div className="value">{highest?.people_count ?? '-'}</div>
          <div className="meta">on {safeDate(highest?.timestamp)}</div>
        </Card>

        <Card className="stat">
          <div className="small">Current occupancy</div>
          <div className="value" style={{ color: 'var(--accent)' }}>{current?.people_count ?? '-'}</div>
          <div className="meta">as of {safeDate(current?.timestamp)}</div>
        </Card>
      </div>

      <div className="card" style={{ marginBottom: 12, position: 'relative' }}>
        {data && data.dailyAverage && data.dailyAverage.length > 0 ? (
          <>
            <Chart data={data} formatTimestamp={formatTimestamp} selectedDate={selectedDate} />
            {loading && (
              <div style={{ position: 'absolute', top: 8, right: 12 }} className="small">
                Updating…
              </div>
            )}
          </>
        ) : loading ? (
          <div className="small">Loading chart…</div>
        ) : error ? (
          <div className="small">Error: {error}</div>
        ) : (
          <div className="small">No data available for the selected day.</div>
        )}
      </div>

      <DateSelector
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
      />
    </>
  );
}