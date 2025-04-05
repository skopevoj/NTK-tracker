import React from 'react';

export default function DateSelector({
  selectedDate,
  setSelectedDate,
}) {

  const handlePrevDay = () => {
    if (selectedDate) {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setSelectedDate(prevDay.toISOString().split("T")[0]);
    }
  };

  const handleNextDay = () => {
    if (selectedDate) {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay.toISOString().split("T")[0]);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <button onClick={handlePrevDay}>◀</button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ margin: "0 10px" }}
        />
        <button onClick={handleNextDay}>▶</button>
    </div>
  );
}
