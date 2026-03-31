import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

export default function Workers() {
  const [showAllModal, setShowAllModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { query, addWorker, clockEntries, workers = [], users, projects = [], backendUrl, token } = useContext(UsersContext);

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

  console.log(workers);
  

  // include both Workers and Supervisors (handles different field names/casing)
  const staffList = useMemo(() => {
    return (workers || []).filter((w) => {
      const t = String(w.workerType || w.Role || w.role || "").toLowerCase().trim();
      // match exact or contains (covers "Worker", "worker", "Supervisor", "supervisor", "worker-lead", etc.)
      return t === "worker" || t.includes("worker")
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100 p-3 md:p-4 lg:p-6">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      {/* Header */}
      <div className="flex flex-col md:flex-row max-[639px]:flex-row justify-between items-start md:items-center mb-4">
        <div className="flex flex-col">
          <span className="text-lg md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Team Management
          </span>
          <span className="text-gray-500 text-xs md:text-sm lg:text-sm mt-2 font-medium">Manage your team members and track their status</span>
        </div>
        {role === "admin" && (
          <motion.button
            onClick={() => setShowModal(true)}
            className="lg:px-4 md:!-mt-6 md:px-3 max-[639px]:px-2 lg:py-3 md:py-2 max-[639px]:py-1.5 text-xs            /* default (mobile) */
  text-xs            /* default (mobile) */
  max-[639px]:!text-xs         /* small screens */
  md:text-base       /* medium screens */
  lg:!text-md         /* large screens */
  xl:text-xl mt-4 text-nowrap bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded shadow-md font-semibold"
          >
            + Add Worker
          </motion.button>
        )}
      </div>

      {/* View All Workers Modal — Table Layout (sorted by projects completed desc) */}
      {showAllModal && (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center 
               bg-black/50 backdrop-blur-md p-4"
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="
        w-[70%] max-w-6xl 
        max-h-[90vh] overflow-hidden
        bg-white/80 backdrop-blur-xl
        border border-white/30 shadow-2xl
        rounded-3xl
        flex flex-col
      "
    >
      {/* Header */}
      <div className="
        px-5 py-4 
        flex items-center justify-between
        bg-white/70 backdrop-blur-xl 
        border-b border-gray-200/60 sticky top-0 z-20
      ">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          👷‍♂️ All Workers
        </h2>

        <button
          onClick={() => setShowAllModal(false)}
          className="
            w-10 h-10 flex items-center justify-center
            rounded-full hover:bg-red-100 
            text-gray-600 hover:text-red-600
            transition-all text-xl
          "
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6">

        {(() => {
          const onlyWorkers = (workersWithImages || [])
            .filter((w) => {
              const roleField = (w.workerType || w.Role || w.role || "").toLowerCase();
              return roleField === "worker";
            })
            .map((w) => {
              const stats = getStatsForWorker(w) || {};
              const totalHours = stats.totalHours ?? w.totalHoursWorked ?? 0;
              const completedFromField = Number(w.completedProjects ?? w.totalProjects ?? 0);
              const projectsCountFromStats = stats.projects ? Object.keys(stats.projects).length : 0;
              const projectsCountFromTop = stats.topProjects ? stats.topProjects.length : 0;
              const totalProjects =
                completedFromField || projectsCountFromStats || projectsCountFromTop || 0;

              return { ...w, stats, totalHours, totalProjects: Number(totalProjects) };
            })
            .sort((a, b) => b.totalProjects - a.totalProjects || b.totalHours - a.totalHours);

          if (!onlyWorkers.length)
            return (
              <div className="py-16 text-center text-gray-500 italic">
                No worker data available.
              </div>
            );

          return (
            <div className="overflow-x-auto rounded-xl border border-gray-200/70 bg-white/50">
              <table className="w-full text-sm sm:text-base">
                <thead className="bg-gradient-to-r from-indigo-50 to-blue-50 sticky top-0 z-10 shadow">
                  <tr>
                    {["#", "Worker", "Role", "Hours", "Projects"].map((t, idx) => (
                      <th
                        key={idx}
                        className="
                          px-4 py-3 text-left 
                          font-semibold text-gray-600 
                          uppercase text-xs tracking-wide
                        "
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200/60">
                  {onlyWorkers.map((w, i) => (
                    <motion.tr
                      key={w._id || i}
                      whileHover={{ backgroundColor: "rgba(240,245,255,0.6)" }}
                      transition={{ duration: 0.15 }}
                      className="
                        transition-all
                        even:bg-white odd:bg-gray-50/60
                      "
                    >
                      <td className="px-4 py-3 text-gray-600 font-medium">{i + 1}</td>

                      {/* Worker */}
                      <td className="px-4 py-3 flex items-center gap-3 min-w-[180px]">
                        <div className="
                          w-12 h-12 rounded-full overflow-hidden 
                          bg-gray-100 flex items-center justify-center 
                          border border-gray-200 shadow-sm
                        ">
                          {w.profileImage ? (
                            <img
                              src={w.profileImage}
                              alt={w.Name}
                              className="w-full h-full object-cover"
                              onError={(e) =>
                                (e.target.src =
                                  'https://cdn-icons-png.flaticon.com/512/149/149071.png')
                              }
                            />
                          ) : (
                            <span className="text-gray-500 font-semibold text-lg">
                              {w.Name?.[0] || "?"}
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-gray-900 text-sm sm:text-base">
                            {w.Name}
                          </div>
                          <div className="text-xs text-gray-500 break-all">
                            {w.email || w.Email || ""}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-gray-700 capitalize">
                        {w.Role || w.workerType || "-"}
                      </td>

                      <td className="px-4 py-3 text-indigo-600 font-semibold text-right">
                        {Number(w.totalHours || 0).toFixed(2)} hrs
                      </td>

                      <td className="px-4 py-3 text-gray-800 font-bold text-right">
                        {w.totalProjects}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>
    </motion.div>
  </motion.div>
)}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-5">
        {teamStats.map((item, idx) => (
          <motion.div
            key={idx}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="relative rounded-xl md:rounded-xl lg:rounded-2xl py-1 md:py-1 lg:py-2 border border-gray-400 flex items-center justify-center gap-4 bg-white shadow-sm transition-transform duration-100 hover:bg-blue-100"
          >
            <div className="lg:w-14 md:w-10 max-[639px]:w-8 lg:h-14 md:h-10 max-[639px]:h-8 rounded-full bg-blue-300 flex items-center justify-center text-2xl shadow-lg">
              <img className="lg:w-12 md:w-7 lg:p-1.5 md:p-0.5 max-[639px]:p-1" src={item.icon} alt={item.title} />
            </div>
            <div>
              <div className="flex flex-col gap-0 font-semibold">
                <span className="lg:text-base md:text-sm max-[639px]:text-xs text-gray-700 mt-1">{item.title}</span>
                <p className="lg:text-xl md:text-md max-[639px]:text-xs">{item.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Top Performer */}
      {topPerformer && (
  <section className="max-[639px]:mt-6 md:mt-8 lg:mt-10 relative">
    {/* Header */}
    <div className="flex justify-between items-center mb-2">
      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
        <span className="max-[639px]:text-base md:text-xl bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-transparent bg-clip-text">
          🏆 Top Performer
        </span>
      </h2>

      <motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.97 }}
  onClick={() => setShowAllModal(true)}
  className="
    px-2 md:px-5 py-1.5 md:py-2
    max-[639px]:!text-xs md:!text-sm lg:!text-sm      /* ← Responsive font sizes */
    font-semibold text-indigo-700 bg-indigo-50
    hover:bg-indigo-100 rounded shadow-sm
    transition-all
  "
>
  View All →
</motion.button>

    </div>

    {/* Card */}
    <motion.div
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="
        relative overflow-hidden rounded-3xl p-3 md:p-7 lg:p-10
        bg-white
        shadow-sm border border-gray-200/60 backdrop-blur-xl
        flex flex-col gap-8
      "
    >
      {/* Glow */}
      <div className="absolute inset-0 to-transparent blur-3xl pointer-events-none" />

      <div className="flex">
      {/* Top Row */}
      <div className="flex items-center justify-between gap-6 flex-wrap">

        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="
            w-13 h-13 md:w-24 md:h-24 lg:w-28 lg:h-28
            rounded-full overflow-hidden shadow-sm
            ring-4 ring-yellow-400 bg-gradient-to-tr
            from-indigo-600 to-purple-600 flex items-center justify-center
          ">
            {topPerformer.profileImage ? (
              <img
                src={topPerformer.profileImage}
                alt={topPerformer.Name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white max-[639px]:text-xl text-3xl font-extrabold">
                {topPerformer.Name?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>

        {/* Name & Role */}
        <div className="flex flex-col flex-1 min-w-[160px]">
          <div>
          <span className="text-lg md:text-xl lg:text-xl font-bold text-gray-900">
            {topPerformer.Name}
          </span>
          <p className="text-gray-600 text-xs md:text-md lg:text-md">
            {topPerformer.Role}
          </p>
          </div>
          <div className="flex gap-2 md:gap-2 lg:gap-2">
        {/* Completed Projects */}
        <div className="
          bg-white/80 rounded-xl p-2 lg:p-3 md:py-2 md:px-2 text-center
          border border-gray-100 w-full lg:h-16 md:h-16 h-14
        ">
          <span className="text-nowrap text-gray-500 text-xs block">Completed Projects</span>
          <p className="text-yellow-600 text-xs md:text-md lg:text-sm font-semibold">
            {Number(topPerformer.completedProjects || 0)}
          </p>
        </div>

        {/* Hours Worked */}
        <div className="
          bg-white/80 rounded-xl p-2 lg:p-4 md:py-2 md:px-3 text-center
          border border-gray-100 w-full lg:h-16 md:h-16 h-14
        ">
          <span className="text-gray-500 text-xs block">Hours Worked</span>
          <p className="text-indigo-600 text-xs lg:text-sm md:text-md font-semibold">
            {(topPerformer.totalHoursWorked ??
              getStatsForWorker(topPerformer)?.totalHours) || 0}{" "}
            hrs
          </p>
        </div>
      </div>
        </div>

      </div>

      {/* Stats */}
      
      </div>

      {/* Top Projects */}
      <div>
        <p className="text-gray-800 font-semibold mb-2 text-xs md:text-sm">
          🌟 Top Projects
        </p>
        <div
  className="
    flex flex-wrap gap-2
    text-[10px]          /* tiny mobile */
    sm:text-xs           /* normal small text */
    md:text-sm           /* medium for tablet */
    lg:text-sm           /* same for desktop */
    max-[639px]:gap-1
  "
>
  {topPerformer.topProjects?.length > 0
    ? renderTopProjectsChips(topPerformer.topProjects)
    : renderTopProjectsChips(topPerformerStats?.topProjects)}
</div>


      </div>
    </motion.div>
  </section>
)}



      {/* Sections */}
      {/* <Section
        title="Supervisors"
        workers={workersWithImages}
        projects={projects}
        type="Supervisor"
        topPerformer={topPerformer}
        ranksMap={ranksMap}
        workerStatsMap={workerStatsMap}
        getStatsForWorker={getStatsForWorker}
      /> */}
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
          <div className="max-[639px]:w-[80%] max-[639px]:h-fit bg-white rounded-2xl p-8 w-full max-w-md shadow-lg relative">
            <p className="lg:text-2xl md:text-xl max-[639px]:text-lg font-bold mb-4">Add Worker</p>
            <form onSubmit={handleAddWorker} className="flex flex-col lg:gap-4 md:gap-3 max-[639px]:gap-3">
              <input
                ref={inputRef}
                type="text"
                name="Name"
                placeholder="Name"
                value={formData.Name}
                onChange={handleChange}
                className="lg:p-3 md:p-2.5 max-[639px]:p-2 lg:rounded-xl md:rounded-lg max-[639px]:rounded-md bg-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                name="Role"
                placeholder="Role"
                value={formData.Role}
                onChange={handleChange}
                className="lg:p-3 md:p-2.5 max-[639px]:p-2 lg:rounded-xl md:rounded-lg max-[639px]:rounded-md bg-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                name="workerType"
                value={formData.workerType}
                onChange={handleChange}
                className="lg:p-3 md:p-2.5 max-[639px]:p-2 lg:rounded-xl md:rounded-lg max-[639px]:rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Type</option>
                <option value="Worker">Worker</option>
                <option value="Supervisor">Supervisor</option>
              </select>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setShowModal(false)} className="w-50 px-4 py-2 rounded bg-gray-300 hover:bg-gray-400">
                  Cancel
                </button>
                <button type="submit" className="w-50 px-6 lg:py-2 md:py-2 max-[639px]:py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50" disabled={loading}>
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
  const { query } = useContext(UsersContext);

const filtered = (workers || [])
  // Filter by worker type
  .filter((w) => {
    const roleField = (w.workerType || w.Role || w.role || "").toLowerCase();
    return roleField === type.toLowerCase();
  })
  // Filter by search text
  .filter((w) => {
    if (!query) return true;
    const q = query.toLowerCase();

    return (
      w.Name?.toLowerCase().includes(q) ||
      w.Role?.toLowerCase().includes(q) ||
      w.email?.toLowerCase().includes(q) ||
      w.Email?.toLowerCase().includes(q)
    );
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
    <div className="lg:mt-10 md:mt-8 max-[639px]:mt-5">
      <span className="lg:text-xl max-[639px]:text-md font-bold lg:mb-4 text-gray-700">{title}</span>
      <div className="grid grid-cols-1 max-[639px]:grid-cols-2 md:grid-cols-3 gap-2.5 max-[639px]:p-0">
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
              className="bg-white mt-2 lg:rounded-3xl md:rounded-2xl max-[639px]:rounded-xl md:p-4 lg:p-4 max-[639px]:p-3 shadow-md transition-transform transform-gpu relative"
            >
              {topPerformer?.Name === worker.Name && (
                <div className="absolute top-3 right-3 lg:px-3 lg:py-1 md:px-3 md:py-1 max-[639px]:p-1 rounded-lg bg-yellow-400 text-black font-bold text-xs shadow-lg max-[639px]:w-13 text-nowrap">⭐ Top</div>
              )}

              <div className="flex items-center lg:gap-4 md:gap-2 max-[639px]:gap-2 mb-3">
                <div
                  className={`lg:w-14 md:w-12 max-[639px]:w-8 lg:h-14 md:h-12 max-[639px]:h-8 rounded-full overflow-hidden flex items-center justify-center shadow-lg ${isBusy ? "ring-2 ring-red-500" : "ring-2 ring-green-400"}`}
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
                  <div className="font-bold text-gray-900 md:text-sm max-[639px]:text-xs">{worker.Name}</div>
                  <div className="text-gray-700 md:text-sm max-[639px]:text-xs">{worker.Role}</div>

                  {/* <div className="text-sm text-gray-500 mt-1">Hours: <span className="font-semibold text-gray-800">{stats?.totalHours ?? worker.totalHoursWorked ?? 0}h</span></div> */}
                </div>
              </div>

              <p className={`md:text-sm max-[639px]:text-xs font-semibold ${isBusy ? "text-red-500" : "text-green-400"}`}>
                {isBusy ? "Busy" : "Available"}
              </p>

              {isBusy && assignedProjects.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-gray-400">On Projects:</span>
                  <div className="grid grid-cols-3 gap-2 gap-y-2 mt-2">
                    {assignedProjects.map((proj, idx) => (
                      <span key={idx} className="bg-indigo-50 lg:p-2 md:p-1.5 max-[639px]:p-1 lg:rounded-xl md:rounded-lg max-[639px]:rounded-md text-gray-800 lg:text-sm md:text-xs max-[639px]:text-xs font-medium shadow-inner overflow-x-hidden">
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
