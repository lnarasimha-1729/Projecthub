import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";

export default function Workers() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { addWorker, workers, projects, backendUrl, token } = useContext(UsersContext);

  // NOTE: If backendUrl & token are not provided via context, adjust accordingly.
  const [role, setRole] = useState("user");

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

  // Only show actual workers with workerType === "Worker"
  const workersList = workers?.filter((item) => item.workerType === "Worker") || [];

  // Count workers currently on active projects (by workerId)
  const onProject = useMemo(() => {
    const busy = new Set();
    projects.forEach((project) => {
      if (project.projectStatus === "active") {
        project.assignedWorkers?.forEach((w) => {
          // adapt to shape { workerId, Name } or just id/name
          const id = w?.workerId || w?._id || w;
          if (id) busy.add(id.toString());
        });
      }
    });
    return busy.size;
  }, [projects]);

  const available = Math.max(workersList.length - onProject, 0);

  const teamStats = [
    { title: "Total Workers", value: workersList.length, icon: "https://img.icons8.com/wired/64/workers-male.png" },
    { title: "Available", value: available, icon: "https://img.icons8.com/wired/64/workers-male.png" },
    { title: "On Projects", value: onProject, icon: "https://img.icons8.com/ios/50/document--v1.png" },
  ];

  const [formData, setFormData] = useState({ Name: "", Role: "", workerType: "" });
  const inputRef = useRef(null);

  useEffect(() => {
    if (showModal && inputRef.current) inputRef.current.focus();
  }, [showModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    } catch {
      toast.error("❌ Failed to add worker. Try again!");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------
     Ranking logic (frontend)
     ------------------------- */
  // Create an array copy sorted by completedProjects descending
  const sortedByCompleted = useMemo(() => {
    const arr = (workersList || []).slice();
    arr.sort((a, b) => {
      const pa = Number(a.completedProjects || 0);
      const pb = Number(b.completedProjects || 0);
      return pb - pa;
    });
    return arr;
  }, [workersList]);

  // Map workerId -> rank (1 = highest completedProjects). Workers with same count get same rank.
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
        map[w._id] = rank;
      } else {
        if (score === prevScore) {
          // tie: same rank as previous
          map[w._id] = rank;
          sameRankCount++;
        } else {
          // advance rank by number of tied items
          rank = rank + sameRankCount;
          sameRankCount = 1;
          prevScore = score;
          map[w._id] = rank;
        }
      }
    }
    return map;
  }, [sortedByCompleted]);

  // Top performer: first item in sortedByCompleted (if any)
  const topPerformer = useMemo(() => {
    if (!sortedByCompleted.length) return null;
    return sortedByCompleted[0];
  }, [sortedByCompleted]);

  /* Optionally sync ranks to backend so userModel.rank is updated */
  useEffect(() => {
    // Only sync if admin and backendUrl & token are available
    if (role !== "admin" || !backendUrl || !token) return;

    // Prepare payload: [{ id, rank }, ...]
    const payload = Object.entries(ranksMap).map(([id, rank]) => ({ id, rank }));

    if (!payload.length) return;

    // Do not block UI — fire-and-forget; but handle errors with toast
    const sync = async () => {
      try {
        await axios.post(
          `${backendUrl}/api/user/update-ranks`,
          { ranks: payload },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        // optionally notify success, but avoid spamming toasts on every workers change
        // toast.success("Ranks synced");
      } catch (err) {
        console.error("Failed syncing ranks:", err);
        // Only show toast on explicit failures rarely
      }
    };
    sync();
  }, [ranksMap, role, backendUrl, token]);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
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
          <p className="text-3xl font-extrabold mb-6 text-gray-700">🏆 Top Performer</p>
          <motion.div className="bg-white rounded-3xl p-6 shadow-lg flex items-center gap-5 hover:scale-105 transition-transform duration-300">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
              style={{ background: "linear-gradient(135deg,#ffd700,#ff8c00)" }}
            >
              {topPerformer.Name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-xl text-gray-900">{topPerformer.Name}</div>
              <div className="text-gray-700">{topPerformer.Role}</div>
              <div className="text-yellow-500 font-semibold mt-1">
                {Number(topPerformer.completedProjects || 0)} Completed Projects
              </div>
              <div className="mt-1 text-sm text-gray-500">Rank: #{ranksMap[topPerformer._id]}</div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Sections */}
      <Section
        title="Supervisors"
        workers={workers}
        projects={projects}
        type="Supervisor"
        topPerformer={topPerformer}
        ranksMap={ranksMap}
      />
      <Section
        title="Team Members"
        workers={workers}
        projects={projects}
        type="Worker"
        topPerformer={topPerformer}
        ranksMap={ranksMap}
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
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-300 hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  disabled={loading}
                >
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
function Section({ title, workers, projects, type, topPerformer, ranksMap }) {
  const filtered = (workers || []).filter((w) => w.workerType === type);

  return (
    <div className="mt-10">
      <p className="text-3xl font-semibold mb-4 text-gray-700">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filtered.map((worker, i) => {
          const assignedProjects = projects.filter((proj) =>
            type === "Supervisor"
              ? Array.isArray(proj.supervisors) &&
                proj.supervisors.some(
                  (sup) => sup?.trim().toLowerCase() === worker.Name.trim().toLowerCase()
                )
              : proj.assignedWorkers?.some(
                  (aw) => (aw.workerId && aw.workerId.toString()) === worker._id.toString()
                )
          );

          const isBusy = assignedProjects.length > 0;

          return (
            <motion.div
              key={worker._id || i}
              className="bg-white rounded-3xl p-4 shadow-lg transition-transform transform-gpu relative"
            >
              {topPerformer?.Name === worker.Name && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-yellow-400 text-black font-bold text-xs shadow-lg animate-pulse">
                  ⭐ Top
                </div>
              )}

              <div className="flex items-center gap-4 mb-3">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${isBusy ? "ring-2 ring-red-500" : "ring-2 ring-green-400"}`}
                  style={{ background: "linear-gradient(135deg,#22C55E,#8b5cf6)" }}
                >
                  {worker.Name?.[0]?.toUpperCase() || "?"}
                </div>

                <div className="flex-1">
                  <div className="font-bold text-gray-900">{worker.Name}</div>
                  <div className="text-gray-700">{worker.Role}</div>
                </div>

                {/* Rank badge */}
                <div className="flex flex-col items-end">
                  <div className="text-xs text-gray-400">Rank</div>
                  <div className="mt-1 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                    #{ranksMap[worker._id] || "—"}
                  </div>
                </div>
              </div>

              <p className={`font-semibold ${isBusy ? "text-red-500" : "text-green-400"}`}>
                {isBusy ? "Busy" : "Available"}
              </p>

              {isBusy && assignedProjects.length > 0 && (
                <div className="mt-3">
                  <span>On Projects:</span>
                  <div className="grid grid-cols-3 gap-2 gap-y-2 mt-2">
                    {assignedProjects.map((proj, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-50 p-2 rounded-xl text-gray-800 text-sm font-medium shadow-inner overflow-x-hidden"
                      >
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
