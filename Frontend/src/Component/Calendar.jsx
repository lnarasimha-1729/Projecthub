import React, { useState, useEffect } from "react";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [activity, setActivity] = useState("");
  const [activities, setActivities] = useState({});

  // Load stored activities from localStorage
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("dailyActivities")) || {};
    setActivities(stored);
  }, []);

  // Save activities whenever updated
  useEffect(() => {
    localStorage.setItem("dailyActivities", JSON.stringify(activities));
  }, [activities]);

  // Get month/year info
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSaveActivity = () => {
    if (!selectedDate || !activity.trim()) return;
    const newActivities = {
      ...activities,
      [selectedDate.toDateString()]: activity,
    };
    setActivities(newActivities);
    setActivity("");
  };

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={"empty-" + i}></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = date.toDateString();
      const hasActivity = activities[key];

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`p-3 border rounded-lg cursor-pointer hover:bg-blue-100 transition
            ${selectedDate?.toDateString() === key ? "bg-blue-200" : ""}
            ${hasActivity ? "bg-green-100" : ""}`}
        >
          <p className="font-medium">{day}</p>
          {hasActivity && (
            <p className="text-xs text-green-700 mt-1 truncate">
              {hasActivity.slice(0, 15)}...
            </p>
          )}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 mt-26">
      <div className="bg-white p-6 rounded-2xl shadow-md w-[90%] max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="text-blue-600 font-bold">
            ←
          </button>
          <h2 className="text-xl font-semibold">
            {monthNames[month]} {year}
          </h2>
          <button onClick={handleNextMonth} className="text-blue-600 font-bold">
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center font-medium text-gray-700 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">{renderDays()}</div>

        {selectedDate && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-700">
              {selectedDate.toDateString()}
            </h3>

            <textarea
              rows="3"
              className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter your daily activity..."
              value={activity || activities[selectedDate.toDateString()] || ""}
              onChange={(e) => setActivity(e.target.value)}
            />

            <button
              onClick={handleSaveActivity}
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              Save Activity
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;