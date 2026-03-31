import React, { useContext, useState, useEffect, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import ProjectProgressChart from "../Charts/ProjectProgressChart";
import { toast } from "react-toastify";
import { FaProjectDiagram, FaBullseye, FaUsers, FaUserCog } from "react-icons/fa";

export default function Dashboard() {
  const { projects, workers, clockEntries, fetchWorkers, fetchClockEntries, createClockEntry, syncClockEntries, token, backendUrl, users } =
    useContext(UsersContext);


  const [email, setEmail] = useState("")

  useEffect(() => {
    fetchWorkers();
    fetchClockEntries;
  }, []);




  /** USER NAME */
  const userName = useMemo(() => {
    try {
      if (!token) return "";
      const { email } = jwtDecode(token);
      setEmail(email)
      return email?.split("@")[0]?.split(".")[0] || "";
    } catch {
      return "";
    }
  }, [token]);


  /** USER ROLE */
  const userRole = useMemo(() => {
    try {
      if (!token) return "";
      const decoded = jwtDecode(token);
      return decoded.role || ""; // make sure backend includes 'role' in JWT
    } catch {
      return "";
    }
  }, [token]);


  /** ONLINE/OFFLINE STATUS */
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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




  /** SYNC PROMPT FOR UNSYNCED CLOCK ENTRIES */
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);
  useEffect(() => {
    const unsynced = clockEntries.some((e) => !e.synced && e.ownerToken === token);
    setShowSyncPrompt(unsynced && isOnline);
  }, [clockEntries, token, isOnline]);

  /** FILTER WORKERS */
  const workersList = workers.filter((item) => item.workerType === "Worker");

  /** LAST CLOCK ENTRY */
  const lastEntry = clockEntries[clockEntries.length - 1] || {};
  const lastWorker = lastEntry.worker || "No recent activity";
  const lastClockType = lastEntry.type || "";
  const lastProject = lastEntry.project || "";

  /** ACTIVE WORKERS COUNT */
  const activeWorkerCount = useMemo(() => {
    const busy = new Set();
    (projects || []).forEach((project) => {
      if (project.projectStatus === "active") {
        project.assignedWorkers?.forEach((w) => {
          const id = (w && (w.workerId || w._id)) || w;
          if (id) busy.add(String(id));
        });
      }
    });
    return busy.size;
  }, [projects]);
  /** ACTIVE PROJECTS */
  const activeProjects = projects.filter((p) => p.projectStatus === "active");

  /** SELECTED PROJECT STATE */
  const [selectedProject, setSelectedProject] = useState(projects[0]?.projectName || "");

  /** DASHBOARD STATS */
  const dashboardStats = [
  {
    title: "Total Projects",
    value: projects.length,
    icon: <FaProjectDiagram />,
  },
  {
    title: "Active Projects",
    value: activeProjects.length,
    icon: <FaBullseye />,
  },
  {
    title: "Team Members",
    value: workersList.length,
    icon: <FaUsers />,
  },
  {
    title: "Active Workers",
    value: activeWorkerCount,
    icon: <FaUserCog />,
  },
];

  /** HELPER: GET LAST ENTRY FOR WORKER */
  function getLastEntry(workerName) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    return [...clockEntries]
      .reverse()
      .find((e) => {
        const entryDate = new Date(e.time).toISOString().split("T")[0];
        return (
          e.worker.toLowerCase() === workerName.toLowerCase() &&
          entryDate === today
        );
      });
  }

  /** ✅ Match logged-in user (from email) to worker name */
  const [matchedWorker, setMatchedWorker] = useState(null);

  useEffect(() => {
    if (!token || !workers.length) return;

    try {
      const decoded = jwtDecode(token);
      const email = decoded.email || "";

      // extract name from the email
      const rawName = email.split("@")[0];       // "ram.kumar"
      const extractedName = rawName.split(".")[0].toLowerCase(); // "ram"

      // match worker by name
      const workerMatch = workers.find((w) => {
        const workerName = (w.Name || "").toLowerCase();

        return (
          workerName === extractedName ||        // exact match
          workerName.startsWith(extractedName) ||// beginning match: "ram kumar"
          workerName.includes(extractedName)     // contains: "kumar ram"
        );
      });

      setMatchedWorker(workerMatch || null);

    } catch (err) {
      console.error("Error matching user to worker:", err);
    }
  }, [token, workers]);




  return (
    <div className="p-3 md:p-4 lg:p-6 min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100 overflow-hidden relative z-0">


      <div className="lg:flex max-[639px]:flex-col max-[639px]:items-center max-[639px]:justify-center md:flex md:justify-between lg:justify-center lg:gap-10 items-center">
        <div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-2 lg:text-center md:text-left max-[639px]:text-center relative z-10">
          <p className="text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-2"> Project Management Dashboard </p>
          <p className="text-xs md:text-sm lg:text-sm text-gray-500 text-lg text-gray-600 font-medium"> Live overview of people, projects, and daily activities. </p>
        </div>

        {/* Header */}
        {/* ✅ Show only if logged in & matched worker */}
        {token && matchedWorker && (
          <div className="flex items-center justify-center max-[639px]:justify-center gap-2 mb-2 md:mb-0 lg:mb-0 relative z-10">
            {/* Project Selector */}
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 md:py-1.5 lg:py-2 w-28 md:w-28 shadow-sm bg-white lg:w-40"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">Select Project</option>
              {(projects || [])
                .filter((item) => item.projectStatus === "active")
                .map((proj, i) => (
                  <option key={i} value={proj.projectName}>
                    {proj.projectName}
                  </option>
                ))}
            </select>

            {/* Clock In / Out Button */}
            {(() => {
              const last = getLastEntry(matchedWorker.Name);
              const isClockedIn = last?.type === "clock-in";

              return !isClockedIn ? (
                <motion.button
                  onClick={() => {
                    if (window.confirm(`Clock in ${matchedWorker.Name} for ${selectedProject}?`)) {

                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            const latitude = position.coords.latitude.toFixed(8);
                            const longitude = position.coords.longitude.toFixed(8);
                            const accuracy = position.coords.accuracy;

                            createClockEntry({
                              worker: matchedWorker.Name,
                              project: selectedProject,
                              type: "clock-in",
                            });

                            try {
                              const res = await axios.post(
                                `${backendUrl}/api/clock-in`,
                                {
                                  workerId: matchedWorker._id,
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
                            alert("Please enable location access and try again.");
                            console.error("Location error:", error);
                          }
                        );
                      } else {
                        alert("Geolocation not supported in this browser.");
                      }
                    }
                  }}
                  className="lg:text-base md:text-md text-xs lg:px-3 md:px-3 max-[639px]:px-2 lg:py-2 md:py-1.5 max-[639px]:py-1 rounded font-semibold bg-green-700 text-white hover:bg-green-800"
                >
                  Clock In
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => {
                    if (!selectedProject) {
                      toast.error("⚠️ Please select a project before clocking in.");
                      return;
                    }
                    if (window.confirm(`Clock out ${matchedWorker.Name} from ${selectedProject}?`)) {
                      createClockEntry({
                        worker: matchedWorker.Name,
                        project: selectedProject,
                        type: "clock-out",
                      });
                    }
                  }}
                  className="max-[639px]:px-4 md:px-2 lg:px-3 lg:py-2 md:py-1.5 max-[639px]:py-1 rounded font-semibold bg-red-200 text-red-800 hover:bg-red-300"
                >
                  Clock Out
                </motion.button>
              );
            })()}
          </div>
        )}
      </div>


      {/* Sync / Online Status
      <div className="flex items-center gap-3 mb-4 relative z-10">
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
      </div> */}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5 mb-3 perspective-1000 relative z-10">
        {dashboardStats.map((item, idx) => (
          <motion.div
            key={idx}
            className="bg-white/90 shadow-md rounded-xl md:rounded-xl lg:rounded-2xl lg:p-3 md:p-1 lg:h-20 md:h-16 max-[639px]:p-2 px-1 flex items-center justify-center gap-2 border border-gray-200 transform-gpu"

            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <div className="text-2xl text-blue-600">
  {item.icon}
</div>
            <div className="flex flex-col items-center justify-start">
              <div className="lg:text-base md:text-sm max-[639px]:text-xs text-gray-600 mt-2 font-medium">{item.title}</div>
              <div className="lg:text-lg md:text-sm max-[639px]:text-sm text-md font-semibold text-gray-900 drop-shadow-sm">{item.value ?? 0}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom Sections */}
      <div className="grid w-full gap-6 perspective-1000 relative z-10">
        <div className="w-full mt-0 bg-gradient-to-r from-indigo-100 to-blue-50 rounded-2xl flex items-center justify-center text-blue-300 border border-indigo-100 shadow-inner">
          <ProjectProgressChart />
        </div>

        {/* Right Side Widgets */}
        <div className="flex flex-col gap-6">
          {/* Who's Online */}
          {/* <motion.div
            className="bg-white/90 backdrop-blur-md shadow-xl rounded-2xl p-6"
          >
            <p className="text-2xl font-semibold mb-4 text-gray-700">Who's Online?</p>
            <div className="text-center text-gray-400 mt-6">[No one online currently]</div>
          </motion.div> */}

          {/* Recent Activity */}
          <motion.div
            className="
    bg-white/90 
    backdrop-blur-md 
    shadow-sm 
    rounded-2xl 
    p-4 sm:p-5 md:p-6 
    lg:mt-0 md:mt-0
    w-full 
    border-2
    border-purple-200
    max-w-[100%] sm:max-w-[90%] md:max-w-[100%] lg:max-w-[100%]
  "
          >
            <p className="lg:text-lg md:text-md font-semibold mb-3 sm:mb-4 text-gray-700 text-center sm:text-left">
              Recent Activity
            </p>

            {lastEntry ? (
              <div className="flex lg:flex-col sm:flex-row lg:items-center md:items-start gap-3 sm:gap-4 text-gray-700">
                <Link
                  to="/clock_entries"
                  className="
          bg-indigo-100
          rounded-full 
          hover:bg-indigo-200 
          transition
          flex-shrink-0
          max-[639px]:w-fit
          max-[639px]:h-fit
        "
                >
                  <img
                    className="h-8 w-8 sm:h-10 sm:w-10"
                    src="https://img.icons8.com/sf-regular-filled/48/228BE6/exit.png"
                    alt="exit"
                  />
                </Link>

                <p className="lg:text-sm md:text-sm max-[639px]:text-sm text-center sm:text-left leading-relaxed">
                  <span className="font-semibold text-indigo-600">{lastWorker}</span>{" "}
                  {lastClockType} from{" "}
                  <span className="font-semibold text-blue-600">{lastProject}</span>
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-center text-sm sm:text-base">
                No recent activity
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}