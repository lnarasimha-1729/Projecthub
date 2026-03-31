import React, { useContext, useState, useEffect } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { FaUsers, FaClipboardCheck } from "react-icons/fa";
import { MdOutlineEventAvailable } from "react-icons/md";
import { AiOutlineClockCircle } from "react-icons/ai";

// react-calendar
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { toast } from "react-toastify";

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

  const [selectedProject, setSelectedProject] = useState("");

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
  console.log(clockEntries);


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
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-100 min-h-screen p-3 md:p-4 lg:p-6">
      {/* Header */}
      <div className="flex lg:flex-row md:flex-row items-start flex-col items-center justify-between mb-2">
        <div>
          <span className="text-nowrap text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Time Clock Dashboard
          </span>
          <p className="text-xs md:text-sm lg:text-sm text-gray-600 mt-1 text-gray-500 font-medium">Monitor and manage worker attendance in real-time.</p>
        </div>

        {userRole === "worker" && (
        <div className="max-[639px]:w-full flex items-center justify-center lg:gap-3 md:gap-3 max-[639px]:gap-1 sm:mt-0">
          {/* Project selection dropdown */}
          <select
            className="border border-gray-300 rounded-lg py-2 px-3 lg:py-2 md:py-1.5 max-[639px]:py-1 shadow-sm bg-white lg:w-40 md:w-25 max-[639px]:w-45 text-xs            /* default (mobile) */
  sm:text-sm         /* small screens */
  md:text-base       /* medium screens */
  lg:text-lg         /* large screens */
  xl:text-xl"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">Select Project</option>
            {(projects || [])
              .filter((item) => item.projectStatus === "active")
              .map((proj, i) => (
                <option className="max-w-[20%]" key={i} value={proj.projectName}>
                  {proj.projectName}
                </option>
              ))}
          </select>


          {showSyncPrompt ? (
            <motion.button
              onClick={syncClockEntries}
              className="px-4 lg:py-2 md:py-1.5 max-[639px]:py-2 rounded-lg bg-blue-500 text-white shadow hover:bg-blue-600 transition text-xs            /* default (mobile) */
                        sm:text-sm md:text-sm lg:text-lg xl:text-xl"
            >
              Sync
            </motion.button>
          ) : (
            <span className={`text-xs sm:text-sm         /* small screens */
  md:text-base       /* medium screens */
  lg:text-lg         /* large screens */
  xl:text-xl lg:px-4 md:px-4 max-[639px]:px-2 lg:py-2 md:py-1.5 max-[639px]:w-55 max-[639px]:py-1.5 py-2 rounded-lg text-white ${isOnline ? "bg-green-500" : "bg-red-500"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          )}
        </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5 mb-3">
        {/* Total Workers — visible to everyone */}
        <StatCard
  icon={<FaUsers />}
  title="Total Workers"
  value={workersList.length}
  gradient="from-blue-400 to-indigo-500"
/>

{/* If privileged (admin/supervisor) show attendance */}
{isPrivileged ? (
  <>
    <StatCard
      icon={<MdOutlineEventAvailable />}
      title="Attendance Rate"
      value={`${attendanceRateToday}%`}
      gradient="from-purple-400 to-pink-500"
    />
    <StatCard
      icon={<FaClipboardCheck />}
      title="Check-in Events"
      value={totalCheckInsToday}
      gradient="from-green-400 to-teal-500"
    />
  </>
) : (
  <>
    <StatCard
      icon={<FaClipboardCheck />}
      title="Your Clock-ins"
      value={userClockInsTodayCount}
      gradient="from-green-400 to-teal-500"
    />
    <StatCard
      icon={<AiOutlineClockCircle />}
      title="Your Clock-outs"
      value={userClockOutsTodayCount}
      gradient="from-red-400 to-rose-500"
    />
  </>
)}
      </div>

      {/* Worker Actions & Recent Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Left column: actions & calendar */}
        <div className="bg-white/70 border border-gray-200 rounded-2xl shadow-md p-2 lg:col-span-1 break-all">
          <div className="flex items-center justify-between mb-4 border-b-2 border-gray-200">
            <p className="text-md md:text-xl lg:text-xl font-bold text-gray-800">Worker Actions</p>
          </div>

          {/* Show only current user's action controls */}
          {workersList
            .filter((worker) => worker.Name.toLowerCase() === currentUserLower)
            .map((worker, index) => {
              const lastEntry = [...(clockEntries || [])]
                .filter((e) => (e.worker || "").toLowerCase() === (worker.Name || "").toLowerCase())
                .sort((a, b) => new Date(b.time) - new Date(a.time))[0]; // latest by time

              const isClockedIn = lastEntry?.type === "clock-in";
              const currentProject = isClockedIn ? lastEntry?.project || "N/A" : null;

              const clockInTime =
                isClockedIn && lastEntry?.time
                  ? new Date(lastEntry.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : null;


              return (
                <div key={index} className="flex justify-between items-center mb-4 last:mb-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-700 capitalize">{worker.Name}</span>
                    {!lastEntry && <span className="text-xs text-green-500">Available</span>}
                    {isClockedIn && (
                      <div className="text-xs text-gray-600 mt-1 overflow-wrap">
                        <p><span className="font-semibold text-blue-600">Project:</span> {currentProject}</p>
                        <p><span className="font-semibold text-green-600">Clocked In:</span> {clockInTime}</p>
                      </div>
                    )}

                  </div>

                  <div>
                    {!isClockedIn ? (
                      <motion.button
                        onClick={() => {
                          if (!selectedProject) {
                            toast.error("⚠️ Please select a project before clocking in.");
                            return;
                          }
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
                                    project: selectedProject || "N/A",
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


                        className="px-3 py-1 rounded font-semibold bg-green-700 text-white hover:bg-green-800"
                      >
                        Clock In
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={() => {
                          if (window.confirm(`Clock out ${worker.Name}?`)) {
                            const projectNameToUse =
                              currentProject || selectedProject || "N/A";

                            createClockEntry({
                              worker: worker.Name,
                              project: projectNameToUse,
                              type: "clock-out",
                            });
                          }
                        }}
                        className="px-3 py-1 rounded font-semibold text-nowrap bg-red-200 text-red-800 hover:bg-red-300"
                      >
                        Clock Out
                      </motion.button>

                    )}
                  </div>
                </div>
              );
            })}

          {/* Calendar */}
          <div className="mb-4 mt-4 w-full">
            <label className="text-sm font-semibold text-gray-700 mb-2 block text-center sm:text-left">
              Filter by Date
            </label>

            <div
              className="
      rounded-xl border border-gray-300 bg-white
      shadow-sm p-2
      w-full sm:w-auto
      flex justify-center sm:justify-start
      overflow-hidden
    "
            >
              <div className="w-full sm:w-auto">
                <Calendar
                  onChange={handleCalendarChange}
                  value={
                    selectedDate
                      ? parseYYYYMMDDToLocalDate(selectedDate)
                      : parseYYYYMMDDToLocalDate(todayLocalYYYYMMDD)
                  }
                  defaultView="month"
                  showNeighboringMonth={true}
                  className="!w-full max-[639px]:!text-xs max-[639px]:!p-1"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right column: recent entries */}
        <div className="bg-white/70 backdrop-blur-md border border-gray-200 rounded-2xl shadow-md p-6 lg:col-span-2 overflow-auto max-h-[600px]">
          <div className="flex items-center justify-between lg:mb-4 md:mb-0">
            <p className="md:text-xl lg:text-xl text-md font-bold text-gray-800">Recent Entries</p>
            <div className="text-sm text-gray-600">Filter: {selectedLabel}</div>
          </div>

          <div className="w-full overflow-x-auto rounded-sm shadow-sm border border-gray-200">
            <table className="min-w-[600px] w-full text-left border-collapse">
              <thead className="lg:text-sm text-xs md:text-sm sticky top-0 bg-gray-400 text-gray-700 uppercase tracking-wide">
                <tr>
                  <th className="py-2 px-3 font-semibold">Worker</th>
                  <th className="py-2 px-3 font-semibold">Project</th>
                  <th className="py-2 px-3 font-semibold">Clock In</th>
                  <th className="py-2 px-3 font-semibold">Clock Out</th>
                  <th className="py-2 px-3 font-semibold">Hours</th>
                </tr>
              </thead>
              <tbody className="lg:text-md md:text-sm text-xs">
                {tableRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 border-b last:border-0">
                    <td className="py-2 px-3 text-gray-800 capitalize whitespace-nowrap">{row.worker}</td>
                    <td className="py-2 px-3 text-gray-800 break-all">{row.project}</td>
                    <td
                      className={`py-2 px-3 font-medium ${row.clockInSynced ? "text-green-600" : "text-yellow-600"
                        }`}
                    >
                      {row.clockIn}
                    </td>
                    <td
                      className={`py-2 px-3 font-medium ${row.clockOutSynced ? "text-red-600" : "text-yellow-600"
                        }`}
                    >
                      {row.clockOut}
                    </td>
                    <td className="py-2 px-3 text-gray-800 font-medium">{row.hours}</td>
                  </tr>
                ))}
                {tableRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-gray-500"
                    >
                      No entries for {selectedLabel}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

/* -------------------- Stat Card -------------------- */
function StatCard({ icon, title, value, gradient }) {
  return (
    <motion.div className={`bg-white/90 shadow-md rounded-xl md:rounded-xl lg:rounded-2xl lg:p-3 md:p-1 lg:h-20 md:h-16 p-2 px-1 flex items-center justify-center gap-2 border border-gray-200 transform-gpu`}>
      
        {/* ✅ React Icon instead of image */}
        <div className="lg:text-2xl">
          {icon}
        </div>

      

      <div className="flex flex-col items-center justify-start">
        <span className="md:text-sm max-[639px]:text-xs text-gray-600 font-medium">{title}</span>
        <p className="lg:text-lg md:text-md max-[639px]:text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </motion.div>
  );
}
