import React from 'react';
import Button from './ui/Button';

export default function DateSelector({
  selectedDate,
  setSelectedDate,
}) {
  const toISO = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toISOString().split('T')[0];
  };

  const handlePrevDay = () => {
    if (!selectedDate) return;
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(toISO(prev));
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(toISO(next));
  };

  const handleToday = () => {
    setSelectedDate(toISO(new Date()));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
      <Button onClick={handlePrevDay} aria-label="Previous day">◀</Button>
      <input
        className="input-date"
        type="date"
        value={selectedDate || ''}
        onChange={(e) => setSelectedDate(e.target.value)}
        aria-label="Select date"
      />
      <Button onClick={handleNextDay} aria-label="Next day">▶</Button>
      <Button onClick={handleToday} className="ml-2 bg-gray-800 hover:bg-gray-700" aria-label="Today">Today</Button>
    </div>
  );
}
