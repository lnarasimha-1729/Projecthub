import React, { useContext, useState, useEffect } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import {jwtDecode} from "jwt-decode";

// react-calendar
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function ClockEntries() {

  function formatLocalYYYYMMDD(dateLike) {
    const d = new Date(dateLike);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseYYYYMMDDToLocalDate(str) {
    if (!str) return null;
    const [y, m, d] = str.split("-").map((s) => parseInt(s, 10));
    return new Date(y, m - 1, d);
  }

  /* -------------------------
     Component state & context
     ------------------------- */
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const todayLocalYYYYMMDD = formatLocalYYYYMMDD(new Date());
  const [selectedDate, setSelectedDate] = useState(todayLocalYYYYMMDD);

  const {
    clockEntries,
    createClockEntry,
    syncClockEntries,
    workers,
    projects,
    token,
  } = useContext(UsersContext);

  const workersList = (workers || []).filter((item) => item.workerType === "Worker");

  // Helper to get last entry for a worker
  const getLastEntry = (workerName) =>
    [...(clockEntries || [])].reverse().find(
      (e) => (e.worker || "").toLowerCase() === (workerName || "").toLowerCase()
    );

  // decode token to get name and role
  const [userRole, setUserRole] = useState("");
  useEffect(() => {
    if (!token) {
      setName("");
      setUserRole("");
      return;
    }
    try {
      const decoded = jwtDecode(token);
      const email = decoded?.email || "";
      const userName = email?.split("@")[0]?.split(".")[0] || "";
      setName(userName);

      // flexible role detection (common token shapes)
      const role =
        (decoded && (decoded.role || decoded.userType || decoded.user?.role || decoded.type)) ||
        "";
      setUserRole(role);
    } catch (err) {
      console.error("Token decode error:", err);
      setName("");
      setUserRole("");
    }
  }, [token]);

  const currentUserLower = (name || "").toLowerCase();

  // privileged check (Admin or Supervisor) — case-insensitive
  const isPrivileged =
    !!userRole && ["admin", "supervisor"].includes(userRole.toString().toLowerCase());

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsynced = (clockEntries || []).some(
      (e) => !e.synced && e.ownerToken === token
    );
    setShowSyncPrompt(unsynced && isOnline);
  }, [clockEntries, token, isOnline]);

  /* -------------------------
     Today's statistics (local)
     ------------------------- */
  // all clock-in events for today
  const clockInsTodayEvents = (clockEntries || []).filter(
    (e) => e.type === "clock-in" && formatLocalYYYYMMDD(e.time) === todayLocalYYYYMMDD
  );

  // all clock-out events for today
  const clockOutsTodayEvents = (clockEntries || []).filter(
    (e) => e.type === "clock-out" && formatLocalYYYYMMDD(e.time) === todayLocalYYYYMMDD
  );

  // distinct workers checked-in today (for attendance rate)
  const uniqueClockedWorkersToday = new Set(clockInsTodayEvents.map((e) => e.worker)).size;

  // Attendance rate (today)
  const attendanceRateToday = workersList.length
    ? Math.round((uniqueClockedWorkersToday / workersList.length) * 100)
    : 0;

  // For privileged: total check-ins events today (optional)
  const totalCheckInsToday = clockInsTodayEvents.length;
  const totalCheckOutsToday = clockOutsTodayEvents.length;

  // For regular worker: their own counts today
  const userClockInsTodayCount = clockInsTodayEvents.filter(
    (e) => (e.worker || "").toLowerCase() === currentUserLower
  ).length;

  const userClockOutsTodayCount = clockOutsTodayEvents.filter(
    (e) => (e.worker || "").toLowerCase() === currentUserLower
  ).length;

  /* -------------------------
     Calendar & selected day entries
     ------------------------- */
  const handleCalendarChange = (date) => {
    if (!date) {
      setSelectedDate("");
      return;
    }
    const picked = Array.isArray(date) ? date[0] : date;
    setSelectedDate(formatLocalYYYYMMDD(picked));
  };

  const entriesForSelectedDay = selectedDate
    ? (clockEntries || []).filter(
        (entry) => formatLocalYYYYMMDD(entry.time) === selectedDate
      )
    : (clockEntries || []);

  const tableRows = entriesForSelectedDay
    .slice()
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .reduce((acc, entry) => {
      if (entry.type === "clock-in") {
        acc.push({
          worker: entry.worker,
          project: entry.project,
          clockIn: entry.synced
            ? new Date(entry.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Waiting",
          clockInSynced: entry.synced,
          clockOut: "-",
          clockOutSynced: true,
        });
      } else if (entry.type === "clock-out") {
        const lastRow = acc
          .slice()
          .reverse()
          .find(
            (r) =>
              r.worker === entry.worker &&
              r.project === entry.project &&
              r.clockOut === "-"
          );
        if (lastRow) {
          lastRow.clockOut = entry.synced
            ? new Date(entry.time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Waiting";
          lastRow.clockOutSynced = entry.synced;
        } else {
          acc.push({
            worker: entry.worker,
            project: entry.project,
            clockIn: "-",
            clockInSynced: true,
            clockOut: entry.synced
              ? new Date(entry.time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Waiting",
            clockOutSynced: entry.synced,
          });
        }
      }
      return acc;
    }, []);

  const selectedLabel = selectedDate
    ? new Date(parseYYYYMMDDToLocalDate(selectedDate)).toDateString()
    : "All dates";

  /* -------------------------
     Render
     ------------------------- */
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-100 min-h-screen py-10 px-6 mt-26">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-8">
        <div>
          <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Time Clock Dashboard
          </p>
          <p className="text-gray-600 mt-1">Monitor and manage worker attendance in real-time.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-4 sm:mt-0">
          <select className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm bg-white">
            {(projects || []).map((proj, i) => (
              <option key={i} value={proj.projectName}>
                {proj.projectName}
              </option>
            ))}
          </select>

          {showSyncPrompt ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={syncClockEntries}
              className="px-4 py-2 rounded-xl bg-blue-500 text-white shadow hover:bg-blue-600 transition"
            >
              Sync
            </motion.button>
          ) : (
            <span className={`px-4 py-2 rounded-xl text-white ${isOnline ? "bg-green-500" : "bg-red-500"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Workers — visible to everyone */}
        <StatCard
          icon="https://img.icons8.com/ultraviolet/40/workers-male.png"
          title="Total Workers"
          value={workersList.length}
          gradient="from-blue-400 to-indigo-500"
        />

        {/* If privileged (admin/supervisor) show attendance */}
        {isPrivileged ? (
          <>
            <StatCard
              icon="https://img.icons8.com/windows/32/228BE6/attendance-mark.png"
              title="Attendance Rate (Today)"
              value={`${attendanceRateToday}%`}
              gradient="from-purple-400 to-pink-500"
            />
            <StatCard
              icon="https://img.icons8.com/windows/32/228BE6/check-document.png"
              title="Check-in Events (Today)"
              value={totalCheckInsToday}
              gradient="from-green-400 to-teal-500"
            />
          </>
        ) : (
          // Regular worker: show their personal counts
          <>
            <StatCard
              icon="https://img.icons8.com/windows/32/228BE6/check-document.png"
              title="Your Clock-ins (Today)"
              value={userClockInsTodayCount}
              gradient="from-green-400 to-teal-500"
            />
            <StatCard
              icon="https://img.icons8.com/windows/32/228BE6/clock-out.png"
              title="Your Clock-outs (Today)"
              value={userClockOutsTodayCount}
              gradient="from-red-400 to-rose-500"
            />
          </>
        )}
      </div>

      {/* Worker Actions & Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: actions & calendar */}
        <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-2">
            <p className="text-xl font-bold text-gray-800">Worker Actions</p>
          </div>

          {/* Show only current user's action controls */}
          {workersList
            .filter((worker) => worker.Name.toLowerCase() === currentUserLower)
            .map((worker, index) => {
              const lastEntry = getLastEntry(worker.Name);
              const isClockedIn = lastEntry?.type === "clock-in";
              const assignedProject = (projects || []).find((p) => p.projectName === lastEntry?.project);
              const clockInTime = isClockedIn && lastEntry?.time
                ? new Date(lastEntry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : null;

              return (
                <div key={index} className="flex justify-between items-center mb-4 last:mb-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-700 capitalize">{worker.Name}</span>
                    {!lastEntry && <span className="text-xs text-green-500">Available</span>}
                    {isClockedIn && lastEntry && (
                      <div className="text-xs text-gray-600 mt-1">
                        <p><span className="font-semibold text-blue-600">Project:</span> {assignedProject?.projectName || "N/A"}</p>
                        <p><span className="font-semibold text-green-600">Clocked In:</span> {clockInTime}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    {!isClockedIn ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => {
                          if (window.confirm(`Clock in ${worker.Name}?`)) {
                            createClockEntry({
                              worker: worker.Name,
                              project: (projects && projects[0]?.projectName) || "N/A",
                              type: "clock-in",
                            });
                          }
                        }}
                        className="px-3 py-1 rounded-xl font-semibold shadow bg-green-700 text-white hover:bg-green-800"
                      >
                        Clock In
                      </motion.button>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => {
                          if (window.confirm(`Clock out ${worker.Name}?`)) {
                            createClockEntry({
                              worker: worker.Name,
                              project: assignedProject?.projectName || (projects && projects[0]?.projectName),
                              type: "clock-out",
                            });
                          }
                        }}
                        className="px-3 py-1 rounded-xl font-semibold shadow bg-red-200 text-red-800 hover:bg-red-300"
                      >
                        Clock Out
                      </motion.button>
                    )}
                  </div>
                </div>
              );
            })}

          {/* Calendar */}
          <div className="mb-4 mt-4">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Filter by Date</label>
            <div className="rounded-lg overflow-hidden border-1 border-gray-700 bg-white">
              <Calendar
                onChange={handleCalendarChange}
                value={selectedDate ? parseYYYYMMDDToLocalDate(selectedDate) : parseYYYYMMDDToLocalDate(todayLocalYYYYMMDD)}
                defaultView="month"
                showNeighboringMonth={true}
              />
            </div>
          </div>
        </div>

        {/* Right column: recent entries */}
        <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-3xl shadow-lg p-6 lg:col-span-2 overflow-auto max-h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xl font-bold text-gray-800">Recent Entries</p>
            <div className="text-sm text-gray-600">Filter: {selectedLabel}</div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-400">
              <tr>
                <th className="py-2 px-3 font-semibold text-gray-700">WORKER</th>
                <th className="py-2 px-3 font-semibold text-gray-700">PROJECT</th>
                <th className="py-2 px-3 font-semibold text-gray-700">CLOCK IN</th>
                <th className="py-2 px-3 font-semibold text-gray-700">CLOCK OUT</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-800">{row.worker.toLowerCase()}</td>
                  <td className="py-2 px-3 text-gray-800">{row.project}</td>
                  <td className={`py-2 px-3 font-medium ${row.clockInSynced ? "text-green-600" : "text-yellow-600"}`}>{row.clockIn}</td>
                  <td className={`py-2 px-3 font-medium ${row.clockOutSynced ? "text-red-600" : "text-yellow-600"}`}>{row.clockOut}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-500">No entries for {selectedLabel}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Stat Card -------------------- */
function StatCard({ icon, title, value, gradient }) {
  return (
    <motion.div whileHover={{ scale: 1.03 }} className={`flex items-center p-4 rounded-3xl shadow-lg bg-white/70 backdrop-blur-md border border-gray-200`}>
      <div className={`w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white text-xl shadow-md mr-4`}>
        <img src={icon} alt={title} className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-600 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </motion.div>
  );
}