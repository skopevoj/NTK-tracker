import React from "react";
import Button from "./ui/Button";

export default function DateSelector({ selectedDate, setSelectedDate }) {
  const MIN_DATE = "2025-05-01";
  const MAX_DATE = new Date().toISOString().split("T")[0]; // today in YYYY-MM-DD

  const clamp = (d) => {
    if (!d) return MAX_DATE;
    if (d < MIN_DATE) return MIN_DATE;
    if (d > MAX_DATE) return MAX_DATE;
    return d;
  };

  const atMin = selectedDate ? selectedDate <= MIN_DATE : false;
  const atMax = selectedDate ? selectedDate >= MAX_DATE : false;

  const toISO = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toISOString().split("T")[0];
  };

  const handlePrevDay = () => {
    if (!selectedDate) return;
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(clamp(toISO(prev)));
  };

  const handleNextDay = () => {
    if (!selectedDate) return;
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(clamp(toISO(next)));
  };

  const handleToday = () => {
    setSelectedDate(clamp(toISO(new Date())));
  };

  return (
    <div className="controls">
      <button onClick={handlePrevDay} disabled={atMin} className="btn" aria-label="Previous day">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      <input
        className="input-date"
        type="date"
        value={selectedDate || ""}
        min={MIN_DATE}
        max={MAX_DATE}
        onChange={(e) => setSelectedDate(clamp(e.target.value))}
        aria-label="Select date"
      />

      <button onClick={handleNextDay} disabled={atMax} className="btn" aria-label="Next day">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
        </svg>
      </button>

      <button onClick={handleToday} className="btn btn-primary" aria-label="Go to today">
        Today
      </button>
    </div>
  );
}
