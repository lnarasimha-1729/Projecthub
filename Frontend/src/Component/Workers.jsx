import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import WorkerCard from "./WorkerCard";

export default function Workers() {
  const [showAllModal, setShowAllModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { addWorker, clockEntries, workers = [], users, projects = [], backendUrl, token } = useContext(UsersContext);

  const [role, setRole] = useState("user");
  const inputRef = useRef(null);
  const [formData, setFormData] = useState({ Name: "", Role: "", workerType: "" });

  function getLastProfileImage(user) {
  if (!user || !user.image) return null;

  let img = null;

  // 🧠 Case 1: image is an array (take last or most recent)
  if (Array.isArray(user.image) && user.image.length > 0) {
    // if image objects have a date or timestamp, sort them by time
    if (typeof user.image[0] === "object" && user.image[0]?.uploadedAt) {
      const sorted = [...user.image].sort(
        (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
      );
      img = sorted[0];
    } else {
      // otherwise, just take the last element
      img = user.image[user.image.length - 1];
    }
  } else if (typeof user.image === "string") {
    // 🧠 Case 2: image is a single string (URL or base64)
    img = user.image;
  }

  // 🧠 Case 3: image is object containing base64 or buffer data
  if (img && typeof img === "object") {
    if (img.data && typeof img.data === "string") {
      return img.data.startsWith("data:")
        ? img.data
        : `data:${img.mimetype || "image/png"};base64,${img.data}`;
    }

    // handle cases where you have direct base64 in "img" itself
    if (img.base64) {
      return `data:image/png;base64,${img.base64}`;
    }

    // if it’s just a URL inside object
    if (img.url) {
      return img.url;
    }
  }

  // 🧠 Case 4: direct base64 or URL string
  if (typeof img === "string") {
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    if (/^[A-Za-z0-9+/=]+$/.test(img) && img.length > 100)
      return `data:image/png;base64,${img}`;
  }

  return null;
}

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      try {
        const decoded = jwtDecode(t);
        setRole(decoded.role);
      } catch (error) {
        console.error("Invalid token", error);
      }
    }
  }, []);

  // include both Workers and Supervisors (handles different field names/casing)
const staffList = useMemo(() => {
  return (workers || []).filter((w) => {
    const t = String(w.workerType || w.Role || w.role || "").toLowerCase().trim();
    // match exact or contains (covers "Worker", "worker", "Supervisor", "supervisor", "worker-lead", etc.)
    return t === "worker" || t === "supervisor" || t.includes("worker") || t.includes("supervisor");
  });
}, [workers]);


  /* -----------------------------------------
     Build worker statistics from clockEntries
     - totalMinutes per worker
     - project minutes per worker
     ----------------------------------------- */
  const workerStatsMap = useMemo(() => {
    // We'll produce a map keyed by whatever entry.worker contains (string),
    // and each value will be: { totalMinutes, totalHours, projects: { [projectName]: minutes }, topProjects: [{project, minutes, hours}] }
    const map = {};
    if (!Array.isArray(clockEntries) || clockEntries.length === 0) return map;

    // Group entries by worker key
    const groupedByWorker = {};
    for (const entry of clockEntries) {
      if (!entry) continue;
      const wk = entry.worker || entry.workerId || entry.workerEmail || "";
      if (!wk) continue;
      const key = String(wk);
      if (!groupedByWorker[key]) groupedByWorker[key] = [];
      groupedByWorker[key].push(entry);
    }

    // For each worker, sort entries and pair in/out. Track project per session.
    Object.entries(groupedByWorker).forEach(([workerKey, entries]) => {
      // sort ascending by time
      entries.sort((a, b) => new Date(a.time) - new Date(b.time));

      let totalMinutes = 0;
      const projects = {}; // projectName -> minutes
      let lastIn = null;
      let lastInProject = null;

      for (const e of entries) {
        const type = (e.type || "").toString().toLowerCase();
        const t = e.time ? new Date(e.time) : null;
        // normalize project name
        const proj = (e.projectName || e.project || e.projectId || e.project?.name || "").toString() || null;

        if (type.includes("in")) {
          lastIn = t;
          // prefer project from clock-in, fallback to null
          lastInProject = proj || null;
        } else if (type.includes("out")) {
          if (lastIn && t && t > lastIn) {
            const diffMins = (t - lastIn) / (1000 * 60);
            if (diffMins > 0) {
              totalMinutes += diffMins;
              const p = proj || lastInProject || "Unknown";
              projects[p] = (projects[p] || 0) + diffMins;
            }
          }
          // reset
          lastIn = null;
          lastInProject = null;
        }
        // ignore other types
      }

      // Build topProjects array sorted by minutes desc
      const projectEntries = Object.entries(projects).map(([project, minutes]) => ({
        project,
        minutes: Math.round(minutes),
        hours: Math.round((minutes / 60) * 100) / 100,
      }));
      projectEntries.sort((a, b) => b.minutes - a.minutes);

      map[workerKey] = {
        totalMinutes: Math.round(totalMinutes),
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        projects,
        topProjects: projectEntries,
      };
    });

    return map;
  }, [clockEntries]);

  // Helper to resolve a worker's stats by trying a few possible keys (id, name, email)
  const getStatsForWorker = (worker) => {
    if (!worker) return null;
    const tryKeys = [
      String(worker._id || ""),
      String(worker.id || ""),
      String(worker.Name || "").toString(),
      String(worker.email || worker.Email || "").toString(),
    ].map((k) => k && k.toLowerCase());

    for (const key of tryKeys) {
      if (!key) continue;
      // workerStatsMap uses original entry.worker keys which may be mixed-case; compare case-insensitive
      // find exact key in map ignoring case
      const foundKey = Object.keys(workerStatsMap).find((k) => String(k).toLowerCase() === key);
      if (foundKey) return workerStatsMap[foundKey];
    }
    // no match
    return null;
  };

  const enrichedWorkers = useMemo(
  () =>
    (staffList || []).map((w) => {
      const stats = getStatsForWorker(w);
      return {
        ...w,
        totalHoursWorked: stats?.totalHours ?? 0,
        topProjects: stats?.topProjects ?? [],
      };
    }),
  [staffList, workerStatsMap]
);

  
  

  const workersWithImages = useMemo(() => {
  if (!Array.isArray(enrichedWorkers) || !Array.isArray(users)) return enrichedWorkers;

  return enrichedWorkers.map(worker => {
    // Normalize worker identifiers
    const workerEmail = (worker.email || worker.Email || "").toLowerCase();
    const workerName = (worker.name || worker.Name || "").toLowerCase();

    // 1️⃣ Try exact email match
    let matchedUser = users.find(u => (u.email || "").toLowerCase() === workerEmail);

    // 2️⃣ If email mismatch, try by normalized name
    if (!matchedUser) {
      matchedUser = users.find(u => (u.name || "").toLowerCase() === workerName);
    }

    // 3️⃣ If still no match, try email username part (before @)
    if (!matchedUser && workerName) {
      matchedUser = users.find(u =>
        (u.email?.split("@")[0].split(".")[0] || "").toLowerCase() === workerName
      );
    }

    // 4️⃣ Get the user’s last profile image safely
    const image = getLastProfileImage(matchedUser);

    return { ...worker, profileImage: image };
  });
}, [enrichedWorkers, users]);




  // Sort workers by completedProjects (desc) while using enrichedWorkers
  const sortedByCompleted = useMemo(() => {
    const arr = (enrichedWorkers || []).slice();
    arr.sort((a, b) => Number(b.completedProjects || 0) - Number(a.completedProjects || 0));
    return arr;
  }, [enrichedWorkers]);

  // Build ranksMap from sortedByCompleted (ties handled)
  const ranksMap = useMemo(() => {
    const map = {};
    let rank = 1;
    let prevScore = null;
    let sameRankCount = 0;

    for (let i = 0; i < sortedByCompleted.length; i++) {
      const w = sortedByCompleted[i];
      const score = Number(w.completedProjects || 0);

      if (prevScore === null) {
        prevScore = score;
        sameRankCount = 1;
        map[String(w._id)] = rank;
      } else {
        if (score === prevScore) {
          map[String(w._id)] = rank;
          sameRankCount++;
        } else {
          rank = rank + sameRankCount;
          sameRankCount = 1;
          prevScore = score;
          map[String(w._id)] = rank;
        }
      }
    }
    return map;
  }, [sortedByCompleted]);

  // Top performer (with image)
const topPerformer = useMemo(() => {
  if (!workersWithImages.length) return null;

  const sorted = [...workersWithImages].sort(
    (a, b) => Number(b.completedProjects || 0) - Number(a.completedProjects || 0)
  );

  // Only return if top performer has completed > 0 projects
  if (sorted[0] && Number(sorted[0].completedProjects) > 0) {
    return sorted[0];
  }

  return null; // No performer with completed projects
}, [workersWithImages]);


  // Team stats
  const onProject = useMemo(() => {
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
  

  // before: const available = Math.max((workersList?.length || 0) - onProject, 0);
const available = Math.max((staffList?.length || 0) - onProject, 0);

// before: { title: "Total Workers", value: workersList.length, ...}
const teamStats = [
  { title: "Total Members", value: staffList.length, icon: "https://img.icons8.com/wired/64/workers-male.png" },
  { title: "Available", value: available, icon: "https://img.icons8.com/wired/64/workers-male.png" },
  { title: "On Projects", value: onProject, icon: "https://img.icons8.com/ios/50/document--v1.png" },
];


  // handlers for modal form
  useEffect(() => {
    if (showModal && inputRef.current) inputRef.current.focus();
  }, [showModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();
    if (!formData.Name || !formData.Role || !formData.workerType) {
      toast.error("Please fill all fields!");
      return;
    }
    setLoading(true);
    try {
      await addWorker(formData);
      toast.success("✅ Worker added successfully!");
      setFormData({ Name: "", Role: "", workerType: "" });
      setShowModal(false);
    } catch (err) {
      console.error("addWorker failed", err);
      toast.error("❌ Failed to add worker. Try again!");
    } finally {
      setLoading(false);
    }
  };
  

  // small UI helper to render top projects chips
  const renderTopProjectsChips = (topProjects = []) => {
    if (!topProjects || topProjects.length === 0) return <div className="text-sm text-gray-400">No projects</div>;
    return topProjects.slice(0, 3).map((p, idx) => (
      <span key={idx} className="bg-indigo-50 px-3 py-1 rounded-full text-sm text-indigo-700 font-medium">
        {p.project} · {Math.round(p.minutes / 60)}h
      </span>
    ));
  };

  // Helper: get stats for top performer safely
  const topPerformerStats = topPerformer ? getStatsForWorker(topPerformer) : null;

  return (
    <div className="min-h-screen mt-26 bg-gradient-to-br from-indigo-50 via-white to-purple-100 p-8">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Team Management
          </p>
          <p className="text-gray-700 mt-2">Manage your team members and track their status</p>
        </div>
        {role === "admin" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            className="px-6 py-3 mt-4 md:mt-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded shadow-lg font-semibold"
          >
            + Add Worker
          </motion.button>
        )}
      </div>

      {/* View All Workers Modal — Table Layout (sorted by projects completed desc) */}
{showAllModal && (
  <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 0.18 }}
    className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
  >
    <div className="bg-white rounded-2xl p-4 w-full max-w-6xl shadow-xl overflow-hidden w-50">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800">All Workers</h2>
        <button
          onClick={() => setShowAllModal(false)}
          className="text-gray-600 hover:text-gray-800 text-lg"
        >
          ✕
        </button>
      </div>

      {(() => {
        // build filtered worker list (only role = worker)
        const onlyWorkers = (workersWithImages || [])
          .filter((w) => {
            const roleField = (w.workerType || w.Role || w.role || "").toString().toLowerCase();
            return roleField === "worker";
          })
          // compute stats, 
          // totalHours and totalProjects
          .map((w) => {
            const stats = getStatsForWorker(w) || {};
            const totalHours = stats.totalHours ?? w.totalHoursWorked ?? 0;
            const completedFromField = Number(w.completedProjects ?? w.totalProjects ?? 0);
            const projectsCountFromStats = stats.projects ? Object.keys(stats.projects).length : 0;
            const projectsCountFromTop = stats.topProjects ? stats.topProjects.length : 0;
            const totalProjects = completedFromField || projectsCountFromStats || projectsCountFromTop || 0;
            return { ...w, stats, totalHours, totalProjects: Number(totalProjects) };
          })
          // sort by totalProjects desc, tie-breaker by totalHours desc
          .sort((a, b) => {
            if (b.totalProjects !== a.totalProjects) return b.totalProjects - a.totalProjects;
            return (b.totalHours || 0) - (a.totalHours || 0);
          });

        if (!onlyWorkers.length) {
          return <div className="py-12 text-center text-gray-500 italic">No worker data available.</div>;
        }

        return (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Image</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Role</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Hours Worked</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total Projects</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {onlyWorkers.map((w, i) => (
                  <tr key={w._id || i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{i + 1}</td>

                    {/* Image */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        {w.profileImage ? (
                          <img
                            src={w.profileImage}
                            alt={w.Name}
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              (e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png")
                            }
                          />
                        ) : (
                          <div className="text-gray-600 font-medium">{w.Name?.[0] || "?"}</div>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{w.Name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{w.email || w.Email || ""}</div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{w.Role || w.workerType || "-"}</td>

                    {/* Hours Worked */}
                    <td>
                    {role === "worker" ? (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-indigo-600 font-medium">
                      {Number(w.totalHours).toFixed ? Number(w.totalHours).toFixed(2) : Number(w.totalHours)} hrs
                    </td>
                    ):("")}
                    </td>

                    {/* Total Projects */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-800 font-semibold">
                      {w.totalProjects ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  </motion.div>
)}



      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-12">
        {teamStats.map((item, idx) => (
          <motion.div
            key={idx}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="relative rounded-xl py-3 border border-gray-400 flex items-center justify-center gap-4 bg-white shadow-md transition-transform duration-100 hover:bg-blue-100"
          >
            <div className="w-14 h-14 rounded-full bg-blue-300 flex items-center justify-center text-2xl shadow-lg">
              <img className="w-12 p-1.5" src={item.icon} alt={item.title} />
            </div>
            <div>
              <div className="flex flex-col gap-0 font-semibold">
                <span className="text-gray-700 mt-1">{item.title}</span>
                <p className="text-2xl">{item.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top Performer */}
      {topPerformer && (
        <div className="mt-10">
          <div className="flex justify-between">
          <p className="text-3xl font-extrabold mb-6 text-gray-700">🏆 Top Performer</p>
          <button
  onClick={() => setShowAllModal(true)}
  className="text-indigo-600 font-semibold hover:underline"
>
  View All
</button>

          </div>

          <motion.div className="bg-white rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
<div className="flex-shrink-0">
  <div className="w-28 h-28 rounded-full overflow-hidden shadow-xl ring-4 ring-yellow-400 flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500">
    {topPerformer.profileImage ? (
      <img
        src={topPerformer.profileImage}
        alt={topPerformer.Name}
        className="w-full h-full object-cover"
      />
    ) : (
      <div className="text-white font-bold text-3xl">
        {topPerformer.Name?.[0]?.toUpperCase() || "?"}
      </div>
    )}
  </div>
</div>



            {/* Info */}
            <div className="flex-1">
              <div className="flex justify-between">
              <div>
              <div className="font-bold text-xl text-gray-900">{topPerformer.Name}</div>
              <div className="text-gray-700">{topPerformer.Role}</div>
              </div>
              <div className="mt-1 text-sm text-gray-500">Rank: #{ranksMap[String(topPerformer._id)]}</div>
              </div>

              <div className="text-yellow-500 font-semibold mt-1">
                {Number(topPerformer.completedProjects || 0)} Completed Projects
              </div>

              

              {/* Hours Worked */}
              <div className="mt-2 text-indigo-600 font-medium">
                ⏱ Hours Worked:{" "}
                <span className="text-blue-600 mt-1 font-semibold">{(topPerformer.totalHoursWorked ?? getStatsForWorker(topPerformer)?.totalHours) || 0} hrs</span>
              </div>

              {/* Top Projects */}
              <div className="mt-3 flex">
                <p className="font-semibold text-gray-800 mb-2">Top Projects : </p>
                <div className="flex flex-wrap gap-2 p-0">
                  {topPerformer.topProjects && topPerformer.topProjects.length > 0
                    ? renderTopProjectsChips(topPerformer.topProjects)
                    : renderTopProjectsChips(topPerformerStats?.topProjects)}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sections */}
      <Section
        title="Supervisors"
        workers={workersWithImages}
        projects={projects}
        type="Supervisor"
        topPerformer={topPerformer}
        ranksMap={ranksMap}
        workerStatsMap={workerStatsMap}
        getStatsForWorker={getStatsForWorker}
      />
      <Section
        title="Team Members"
        workers={workersWithImages}
        projects={projects}
        type="Worker"
        topPerformer={topPerformer}
        ranksMap={ranksMap}
        workerStatsMap={workerStatsMap}
        getStatsForWorker={getStatsForWorker}
      />

      {/* Add Worker Modal */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
        >
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">Add Worker</h2>
            <form onSubmit={handleAddWorker} className="flex flex-col gap-4">
              <input
                ref={inputRef}
                type="text"
                name="Name"
                placeholder="Name"
                value={formData.Name}
                onChange={handleChange}
                className="p-3 rounded-xl bg-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                name="Role"
                placeholder="Role"
                value={formData.Role}
                onChange={handleChange}
                className="p-3 rounded-xl bg-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                name="workerType"
                value={formData.workerType}
                onChange={handleChange}
                className="p-3 rounded-xl bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Type</option>
                <option value="Worker">Worker</option>
                <option value="Supervisor">Supervisor</option>
              </select>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
                  {loading ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* Section Component */
function Section({ title, workers = [], projects = [], type, topPerformer, ranksMap = {}, workerStatsMap = {}, getStatsForWorker = () => null }) {
  const filtered = (workers || []).filter((w) => {
  const roleField = (w.workerType || w.Role || w.role || "").toString().toLowerCase();
  return roleField === type.toLowerCase();
});


  // small UI helper for a worker's top projects
  const renderWorkerTop = (worker) => {
    const stats = getStatsForWorker(worker);
    const top = worker.topProjects?.length ? worker.topProjects : stats?.topProjects || [];
    if (!top || top.length === 0) return <div className="text-sm text-gray-400">—</div>;
    return top.slice(0, 3).map((p, idx) => (
      <span key={idx} className="bg-indigo-50 p-2 rounded-xl text-gray-800 text-sm font-medium shadow-inner overflow-x-hidden">
        {p.project} · {Math.round(p.minutes / 60)}h
      </span>
    ));
  };

  return (
    <div className="mt-10">
      <p className="text-3xl font-semibold mb-4 text-gray-700">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {filtered.map((worker, i) => {
          const workerIdStr = String(worker._id || worker.id || "");
          const assignedProjects = projects.filter((proj) =>
            type === "Supervisor"
              ? Array.isArray(proj.supervisors) &&
                proj.supervisors.some((sup) => sup?.trim().toLowerCase() === worker.Name?.trim().toLowerCase())
              : proj.assignedWorkers?.some((aw) => String((aw.workerId && (aw.workerId._id || aw.workerId)) || aw) === workerIdStr)
          );
          const isBusy = assignedProjects.length > 0;
          const stats = getStatsForWorker(worker);

          return (
            <motion.div
              key={worker._id || i}
              className="bg-white rounded-3xl p-4 shadow-md transition-transform transform-gpu relative"
            >
              {topPerformer?.Name === worker.Name && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-yellow-400 text-black font-bold text-xs shadow-lg animate-pulse">⭐ Top</div>
              )}

              <div className="flex items-center gap-4 mb-3">
                <div
  className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shadow-lg ${isBusy ? "ring-2 ring-red-500" : "ring-2 ring-green-400"}`}
>
  {worker.profileImage ? (
    <img
      src={worker.profileImage}
      alt={worker.Name}
      className="w-full h-full object-cover"
    />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
      style={{ background: "linear-gradient(135deg,#22C55E,#8b5cf6)" }}
    >
      {worker.Name?.[0]?.toUpperCase() || "?"}
    </div>
  )}
</div>

                <div className="flex-1">
                  <div className="font-bold text-gray-900">{worker.Name}</div>
                  <div className="text-gray-700">{worker.Role}</div>
                  <WorkerCard key={worker._id} worker = {worker}/>

                  {/* <div className="text-sm text-gray-500 mt-1">Hours: <span className="font-semibold text-gray-800">{stats?.totalHours ?? worker.totalHoursWorked ?? 0}h</span></div> */}
                </div>
              </div>

              <p className={`font-semibold ${isBusy ? "text-red-500" : "text-green-400"}`}>
                {isBusy ? "Busy" : "Available"}
              </p>

              {isBusy && assignedProjects.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-gray-400">On Projects:</span>
                  <div className="grid grid-cols-3 gap-2 gap-y-2 mt-2">
                    {assignedProjects.map((proj, idx) => (
                      <span key={idx} className="bg-indigo-50 p-2 rounded-xl text-gray-800 text-sm font-medium shadow-inner overflow-x-hidden">
                        {proj.projectName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
