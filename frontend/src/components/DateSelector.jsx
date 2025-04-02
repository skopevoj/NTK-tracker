import React, { useEffect } from 'react';

export default function DateSelector({
  view,
  selectedDate,
  setSelectedDate,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  month,
  setMonth,
}) {
  // Initialize current week (Monday to Sunday) if not already set when view is week.
  useEffect(() => {
    if (view === "week" && !startDate) {
      const today = new Date();
      // ISO: Monday is 1, Sunday is 7. Adjust if today.getDay() is 0 (Sunday).
      const day = today.getDay() === 0 ? 7 : today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setStartDate(monday.toISOString().split("T")[0]);
      setEndDate(sunday.toISOString().split("T")[0]);
    }
  }, [view, startDate, setStartDate, setEndDate]);

  // The original week input onChange is replaced by arrow buttons.
  const handleWeekChange = (e) => {
    // This function is retained if you want to support manual week selection via input.
    const weekValue = e.target.value; // format "YYYY-Www", e.g. "2025-W14"
    const [yearPart, weekPart] = weekValue.split("-W");
    const year = parseInt(yearPart, 10);
    const weekNumber = parseInt(weekPart, 10);

    // Compute Monday of the given week using ISO week date rules.
    const jan4 = new Date(year, 0, 4);
    const dayDiff = jan4.getDay() - 1; // Adjust to Monday.
    const jan4Monday = new Date(jan4);
    jan4Monday.setDate(jan4.getDate() - dayDiff);

    const monday = new Date(jan4Monday);
    monday.setDate(jan4Monday.getDate() + (weekNumber - 1) * 7);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(sunday.toISOString().split("T")[0]);
  };

  const updateWeek = (monday) => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    setStartDate(monday.toISOString().split("T")[0]);
    setEndDate(sunday.toISOString().split("T")[0]);
  };

  const handlePrevWeek = () => {
    if (startDate) {
      const monday = new Date(startDate);
      monday.setDate(monday.getDate() - 7);
      updateWeek(monday);
    }
  };

  const handleNextWeek = () => {
    if (startDate) {
      const monday = new Date(startDate);
      monday.setDate(monday.getDate() + 7);
      updateWeek(monday);
    }
  };

  return (
    <div>
      {view === "day" && (
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      )}
      {view === "week" && (
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={handlePrevWeek}>◀</button>
          {/* Optionally, you can still show a week input for manual selection if needed:
          <input type="week" onChange={handleWeekChange} style={{ margin: "0 10px" }} />
          */}
          {startDate && endDate && (
            <span style={{ margin: "0 10px" }}>
              {startDate} - {endDate}
            </span>
          )}
          <button onClick={handleNextWeek}>▶</button>
        </div>
      )}
      {view === "month" && (
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      )}
    </div>
  );
}