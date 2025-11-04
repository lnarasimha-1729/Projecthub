import React, { useContext, useState, useEffect } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

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

  // helper: format a time for display (HH:MM)
  const formatTime = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "-";
    }
  };

  // helper: format duration in ms -> "Xh Ym"
  const formatDuration = (ms) => {
    if (ms == null || isNaN(ms) || ms < 0) return "-";
    const totalMinutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0 && minutes <= 0) return "0m";
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

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
    backendUrl,
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

  // Build table rows: pair clock-in with the next clock-out for same worker/project
  const tableRows = entriesForSelectedDay
    .slice()
    .sort((a, b) => new Date(a.time) - new Date(b.time))
    .reduce((acc, entry) => {
      // Normalize worker/project strings
      const workerName = entry.worker || "";
      const projectName = entry.project || "";

      if (entry.type === "clock-in") {
        acc.push({
          worker: workerName,
          project: projectName,
          clockIn: entry.synced
            ? formatTime(entry.time)
            : "Waiting",
          clockInSynced: entry.synced,
          clockOut: "-",
          clockOutSynced: true,
          // raw ISO times for accurate duration calc (may be available even if unsynced)
          clockInRaw: entry.time,
          clockOutRaw: null,
        });
      } else if (entry.type === "clock-out") {
        // find last unmatched clock-in row for same worker+project
        const lastRowIndex = acc
          .slice()
          .reverse()
          .findIndex(
            (r) =>
              r.worker === workerName &&
              r.project === projectName &&
              (r.clockOut === "-" || !r.clockOutRaw)
          );
        if (lastRowIndex !== -1) {
          // convert reverse index to original index
          const idx = acc.length - 1 - lastRowIndex;
          const lastRow = acc[idx];
          lastRow.clockOut = entry.synced ? formatTime(entry.time) : "Waiting";
          lastRow.clockOutSynced = entry.synced;
          lastRow.clockOutRaw = entry.time;
          // compute hours for this row below after loop
        } else {
          // no matching clock-in — create a standalone row with only clock-out
          acc.push({
            worker: workerName,
            project: projectName,
            clockIn: "-",
            clockInSynced: true,
            clockOut: entry.synced ? formatTime(entry.time) : "Waiting",
            clockOutSynced: entry.synced,
            clockInRaw: null,
            clockOutRaw: entry.time,
          });
        }
      }
      return acc;
    }, [])
    // After pairing, compute hours field for each row
    .map((r) => {
      let hours = "-";
      if (r.clockInRaw && r.clockOutRaw) {
        // both present -> difference
        const diffMs = new Date(r.clockOutRaw).getTime() - new Date(r.clockInRaw).getTime();
        hours = diffMs >= 0 ? formatDuration(diffMs) : "-";
      } else if (r.clockInRaw && !r.clockOutRaw) {
        // still clocked in -> show running duration from clockIn to now
        const diffMs = Date.now() - new Date(r.clockInRaw).getTime();
        hours = diffMs >= 0 ? formatDuration(diffMs) : "-";
      } else {
        hours = "-";
      }
      return { ...r, hours };
    });

  const selectedLabel = selectedDate
    ? new Date(parseYYYYMMDDToLocalDate(selectedDate)).toDateString()
    : "All dates";

  /* -------------------------
     Render
     ------------------------- */
  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-100 min-h-screen py-10 px-6 mt-26">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between mb-2">
        <div>
          <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Time Clock Dashboard
          </p>
          <p className="text-gray-600 mt-1">Monitor and manage worker attendance in real-time.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap mt-4 sm:mt-0">
          <select className="border border-gray-300 rounded-lg px-3 py-2 shadow-sm bg-white">
            {(projects || []).filter((item)=>item.projectStatus === "active").map((proj, i) => (
              <option key={i} value={proj.projectName}>
                {proj.projectName}
              </option>
            ))}
          </select>

          {showSyncPrompt ? (
            <motion.button
              onClick={syncClockEntries}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white shadow hover:bg-blue-600 transition"
            >
              Sync
            </motion.button>
          ) : (
            <span className={`px-4 py-2 rounded-lg text-white ${isOnline ? "bg-green-500" : "bg-red-500"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Left column: actions & calendar */}
        <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200 pb-2">
            <p className="text-xl font-bold text-gray-800">Worker Actions</p>
          </div>

          {/* Show only current user's action controls */}
          {workersList
            .filter((worker) => worker.Name.toLowerCase() === currentUserLower)
            .map((worker, index) => {
              const lastEntry = [...(clockEntries || [])]
                .reverse()
                .find(
                  (e) =>
                    (e.worker || "").toLowerCase() === (worker.Name || "").toLowerCase() &&
                    formatLocalYYYYMMDD(e.time) === todayLocalYYYYMMDD
                );
              const isClockedIn =
                lastEntry &&
                lastEntry.type === "clock-in" &&
                formatLocalYYYYMMDD(lastEntry.time) === todayLocalYYYYMMDD;

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
                        onClick={() => {
                          if (window.confirm(`Clock in ${worker.Name}?`)) {
                            if (navigator.geolocation) {
                              navigator.geolocation.getCurrentPosition(
                                async (position) => {
                                  const latitude = position.coords.latitude.toFixed(8);
                                  const longitude = position.coords.longitude.toFixed(8);
                                  const accuracy = position.coords.accuracy; // in meters

                                  console.log("📍 Exact location:", { latitude, longitude, accuracy });

                                  // 1️⃣ Create clock entry in frontend
                                  createClockEntry({
                                    worker: worker.Name,
                                    project: (projects && projects[0]?.projectName) || "N/A",
                                    type: "clock-in",
                                  });

                                  // 2️⃣ Send to backend
                                  try {
                                    const res = await axios.post(
                                      `${backendUrl}/api/clock-in`,
                                      {
                                        workerId: worker._id,
                                        latitude,
                                        longitude,
                                        accuracy,
                                      },
                                      {
                                        headers: {
                                          "Content-Type": "application/json",
                                          Authorization: `Bearer ${token}`,
                                        },
                                      }
                                    );
                                    console.log("✅ Location stored:", res.data);
                                  } catch (err) {
                                    console.error("❌ Error saving worker location:", err);
                                  }
                                },
                                (error) => {
                                  console.error("⚠️ Geolocation error:", error);
                                  alert("Could not get your location. Please enable GPS or location permission.");
                                },
                                {
                                  enableHighAccuracy: true,
                                  timeout: 10000, // 10s
                                  maximumAge: 0, // always fresh reading
                                }
                              );
                            } else {
                              alert("Geolocation is not supported by this browser.");
                            }
                          }
                        }}


                        className="px-3 py-1 rounded font-semibold shadow bg-green-700 text-white hover:bg-green-800"
                      >
                        Clock In
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={() => {
                          if (window.confirm(`Clock out ${worker.Name}?`)) {
                            createClockEntry({
                              worker: worker.Name,
                              project: assignedProject?.projectName || (projects && projects[0]?.projectName),
                              type: "clock-out",
                            });
                          }
                        }}
                        className="px-3 py-1 rounded font-semibold shadow bg-red-200 text-red-800 hover:bg-red-300"
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
        <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-md p-6 lg:col-span-2 overflow-auto max-h-[600px]">
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
                <th className="py-2 px-3 font-semibold text-gray-700">HOURS</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="py-2 px-3 text-gray-800">{(row.worker || "").toLowerCase()}</td>
                  <td className="py-2 px-3 text-gray-800">{row.project}</td>
                  <td className={`py-2 px-3 font-medium ${row.clockInSynced ? "text-green-600" : "text-yellow-600"}`}>{row.clockIn}</td>
                  <td className={`py-2 px-3 font-medium ${row.clockOutSynced ? "text-red-600" : "text-yellow-600"}`}>{row.clockOut}</td>
                  <td className="py-2 px-3 text-gray-800 font-medium">{row.hours}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">No entries for {selectedLabel}.</td>
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
    <motion.div className={`flex items-center px-4 py-1 rounded-2xl shadow-md bg-white/70 backdrop-blur-md border border-gray-200`}>
      <div className={`w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-white text-xl shadow-md mr-4`}>
        <img src={icon} alt={title} className="w-6 h-6" />
      </div>
      <div className="flex flex-col">
        <p className="text-gray-600 font-medium">{title}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </motion.div>
  );
}
