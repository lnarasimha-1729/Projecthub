import React, { useState, useMemo, useEffect, useContext } from "react";
import { UsersContext } from "../Context/UserContext";

import AutoProgressSync from "../Component/AutoProgressSync";

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
    <div className="w-full min-h-screen flex flex-col lg:flex-row items-start justify-center gap-2 p-3 md:p-4 lg:p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-100">
  {/* Calendar Section */}
  <div className="w-full lg:w-2/3 xl:w-1/2 bg-white/90 rounded-2xl border border-violet-100 p-6">
    {/* Header */}
    <div className="flex items-center justify-between mb-6">
      <div>
        <div className="text-sm text-gray-500">
          {monthName(visibleDate.getMonth())} {visibleDate.getFullYear()}
        </div>
        <div className="text-xs            /* default (mobile) */
  sm:text-sm         /* small screens */
  md:text-xl       /* medium screens */
  lg:text-lg         /* large screens */
  xl:text-xl font-semibold text-gray-800">📅 Calendar (IST)</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => changeMonth(-1)}
          className="p-2 rounded-lg hover:bg-violet-100 text-gray-600 hover:text-violet-600 transition"
          title="Previous Month"
        >
          ‹
        </button>
        <button
          onClick={() => changeMonth(1)}
          className="p-2 rounded-lg hover:bg-violet-100 text-gray-600 hover:text-violet-600 transition"
          title="Next Month"
        >
          ›
        </button>
        <button
          onClick={goToday}
          className="ml-2 px-4 py-1.5 bg-violet-100 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-200 transition"
        >
          Today
        </button>
      </div>
    </div>

    {/* Weekdays */}
    <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-violet-700 mb-3">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
        <div key={wd} className="py-1">{wd}</div>
      ))}
    </div>

    {/* Days Grid */}
    <div className="grid grid-cols-7 gap-2" role="grid" tabIndex={0}>
      {grid.map((cell, idx) => {
        if (!cell) return <div key={idx} className="h-16" />;
        const iso = toISO(cell);
        const isToday = iso === toISO(today);
        const isSelected = iso === selectedDate;
        const hasEvents = eventsMap[iso]?.length > 0;

        return (
          <button
            key={idx}
            onClick={() => handleSelect(cell)}
            className={`relative h-10 w-10 p-2 rounded-xl flex flex-col justify-between transition 
              ${isSelected
                ? "ring-2 ring-violet-400 bg-violet-50"
                : "hover:bg-gray-50"}
            `}
          >
            <div className="flex items-center justify-center">
              <div
                className={`text-sm font-semibold ${
                  isToday
                    ? "bg-violet-600 text-white w-5 h-5 flex items-center justify-center rounded-full"
                    : "text-gray-800"
                }`}
              >
                {cell.getDate()}
              </div>
              {hasEvents && (
                <div className="flex items-center gap-1">
                  {eventsMap[iso].slice(0, 3).map((_, i) => (
                    <span
                      key={i}
                      className="w-2 h-2 rounded-full bg-green-500"
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
  </div>

  {/* Details Section */}
  <div className="w-full lg:w-1/3 bg-white/90 rounded-2xl border border-violet-100 p-6">
    <p className="text-lg font-semibold text-violet-700 mb-4 flex items-center gap-2">
      <span>🗒</span> Details
    </p>

    {selectedDate ? (
      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60">
        <div className="text-sm text-gray-700 mb-3 font-medium">
          {new Date(selectedDate).toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "Asia/Kolkata",
          })}
        </div>
        {eventsMap[selectedDate]?.length ? (
          <ul className="space-y-2">
            {eventsMap[selectedDate].map((ev) => (
              <li
                key={ev.id ?? ev.title}
                className="text-sm text-gray-700 flex items-start gap-2"
              >
                <span className="mt-1 w-2 h-2 rounded-full bg-violet-500"></span>
                <span>{ev.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500 italic">No events</div>
        )}
      </div>
    ) : (
      <div className="text-sm text-gray-500 italic">
        Select a day to see details
      </div>
    )}

    <div className="mt-6">
      <AutoProgressSync />
    </div>
  </div>
</div>

  );
}
