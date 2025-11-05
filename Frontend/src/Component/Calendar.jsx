import React, { useState, useMemo, useEffect, useContext } from "react";
import { UsersContext } from "../Context/UserContext";

import AutoProgressSync from "./AutoProgressSync";

export default function Calendar({ events = [], onDateSelect }) {
  const toISO = (d) => d.toISOString().slice(0, 10);

  const {projects} = useContext(UsersContext)

  // ✅ Get today's date in IST correctly
  const getTodayIST = () => {
    const now = new Date();
    // Convert using Asia/Kolkata timezone, no manual offset math
    const options = { timeZone: "Asia/Kolkata" };
    const parts = new Intl.DateTimeFormat("en-CA", options).formatToParts(now);
    const year = parts.find(p => p.type === "year").value;
    const month = parts.find(p => p.type === "month").value;
    const day = parts.find(p => p.type === "day").value;
    return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
  };

  const [today, setToday] = useState(getTodayIST());
  const [visibleDate, setVisibleDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(toISO(today));

  // ✅ Update every midnight IST automatically
  useEffect(() => {
    const now = new Date();
    const istNow = getTodayIST();

    // Calculate next midnight IST
    const nextMidnightIST = new Date(istNow.getTime() + 24 * 60 * 60 * 1000);
    const delay = nextMidnightIST.getTime() - now.getTime();

    const timer = setTimeout(() => {
      const newToday = getTodayIST();
      setToday(newToday);
      setVisibleDate(new Date(newToday.getFullYear(), newToday.getMonth(), 1));
      setSelectedDate(toISO(newToday));
      if (onDateSelect) onDateSelect(toISO(newToday));
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const weekday = (y, m, d) => new Date(y, m, d).getDay();
  const monthName = (m) =>
    new Date(2020, m, 1).toLocaleString("en-IN", { month: "long" });

  const grid = useMemo(() => {
    const y = visibleDate.getFullYear();
    const m = visibleDate.getMonth();
    const firstWeekday = weekday(y, m, 1);
    const totalDays = daysInMonth(y, m);

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [visibleDate]);

  console.log(projects);
  

  const eventsMap = useMemo(() => {
    const map = {};
    for (const ev of events) {
      if (!ev || !ev.date) continue;
      map[ev.date] = map[ev.date] || [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  const changeMonth = (delta) =>
    setVisibleDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1)
    );

  const goToday = () => {
    const now = getTodayIST();
    const iso = toISO(now);
    setVisibleDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(iso);
    if (onDateSelect) onDateSelect(iso);
  };

  const handleSelect = (day) => {
    if (!day) return;
    const iso = toISO(day);
    setSelectedDate(iso);
    if (onDateSelect) onDateSelect(iso);
  };

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded-2xl shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-gray-500">
            {monthName(visibleDate.getMonth())} {visibleDate.getFullYear()}
          </div>
          <div className="text-lg font-semibold">Calendar (IST)</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            ‹
          </button>
          <button
            onClick={() => changeMonth(1)}
            className="px-3 py-1 rounded-lg hover:bg-gray-100"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="ml-2 px-3 py-1 bg-gray-100 rounded-lg text-sm"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-600 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
          <div key={wd} className="py-1">
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" tabIndex={0}>
        {grid.map((cell, idx) => {
          if (!cell) return <div key={idx} className="h-20 p-1" />;
          const iso = toISO(cell);
          const isToday = iso === toISO(today);
          const isSelected = iso === selectedDate;
          const hasEvents = eventsMap[iso] && eventsMap[iso].length > 0;

          return (
            <button
              key={idx}
              onClick={() => handleSelect(cell)}
              className={`h-16 p-2 text-left rounded-lg focus:outline-none flex flex-col justify-between ${
                isSelected
                  ? "ring-2 ring-offset-2 ring-indigo-300 bg-indigo-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`text-sm font-medium ${
                    isToday
                      ? "bg-indigo-600 text-white w-6 h-6 flex items-center justify-center rounded-full"
                      : ""
                  }`}
                >
                  {cell.getDate()}
                </div>
                {hasEvents && (
                  <div className="ml-1 flex items-center gap-1">
                    {eventsMap[iso].slice(0, 2).map((e, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-green-500 inline-block"
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {isSelected && hasEvents ? eventsMap[iso][0].title : ""}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-2">Details</h4>
        {selectedDate ? (
          <div className="p-3 border rounded-lg">
            <div className="text-sm text-gray-700 mb-2">
              {new Date(selectedDate).toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "Asia/Kolkata",
              })}
            </div>
            {eventsMap[selectedDate] ? (
              <ul className="space-y-2">
                {eventsMap[selectedDate].map((ev) => (
                  <li key={ev.id ?? ev.title} className="text-sm">
                    • {ev.title}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No events</div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Select a day to see details</div>
        )}
      </div>
      <AutoProgressSync/>
    </div>
  );
}
