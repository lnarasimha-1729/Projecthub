import React, { useContext, useState, useRef, useEffect, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import "react-toastify/dist/ReactToastify.css";

export default function Workers() {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { addWorker, workers, projects } = useContext(UsersContext);
  const workersList = workers.filter((item) => item.workerType === "Worker");
  const [role, setRole] = useState("user");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role);
      } catch (error) {
        console.error("Invalid token", error);
      }
    }
  }, []);

  const onProject = useMemo(() => {
    const busyWorkers = new Set();
    projects.forEach((project) => {
      if (project.projectStatus === "active") {
        project.assignedWorkers?.forEach((worker) => busyWorkers.add(worker.Name));
      }
    });
    return busyWorkers.size;
  }, [projects, workers]);

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

  const topPerformer = useMemo(() => {
    if (!workersList.length || !projects.length) return null;
    const performanceMap = {};
    workersList.forEach((worker) => (performanceMap[worker.Name] = 0));
    projects.forEach((project) => {
      if (project.projectStatus === "completed") {
        project.assignedWorkers?.forEach((aw) => {
          if (performanceMap[aw.Name] !== undefined) performanceMap[aw.Name] += 1;
        });
      }
    });
    const topWorkerName = Object.keys(performanceMap).reduce((a, b) =>
      performanceMap[a] > performanceMap[b] ? a : b
    );
    return workersList.find((w) => w.Name === topWorkerName) || null;
  }, [workersList, projects]);

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
            <div
              className="w-14 h-14 rounded-full bg-blue-300 flex items-center justify-center text-2xl shadow-lg"

            >
              <img className="w-12 p-1.5" src={item.icon} />
            </div>
            <div>
              <div className="flex flex-col gap-0 font-semibold">
                <span className="text-gray-700 mt-1 text-">{item.title}</span>
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
                {
                  projects.filter((proj) =>
                    proj.assignedWorkers?.some(
                      (aw) =>
                        aw.Name === topPerformer.Name &&
                        proj.projectStatus === "completed"
                    )
                  ).length
                }{" "}
                Completed Projects
              </div>
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
      />
      <Section
        title="Team Members"
        workers={workers}
        projects={projects}
        type="Worker"
        topPerformer={topPerformer}
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
/* Section Component */
function Section({ title, workers, projects, type, topPerformer }) {
  return (
    <div className="mt-10">
      <p className="text-3xl font-semibold mb-4 text-gray-700">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {workers
          .filter((w) => w.workerType === type)
          .map((worker, i) => {
            // Determine assigned projects based on workerId
            const assignedProjects = projects.filter((proj) =>
              type === "Supervisor"
                ? Array.isArray(proj.supervisors) &&
                  proj.supervisors.some(
                    (sup) => sup?.trim().toLowerCase() === worker.Name.trim().toLowerCase()
                  )
                : proj.assignedWorkers?.some(
                    (aw) => aw.workerId.toString() === worker._id.toString()
                  )
            );

            const isBusy = assignedProjects.length > 0;

            return (
              <motion.div
                key={i}
                className="bg-white rounded-3xl p-4 shadow-lg transition-transform transform-gpu relative"
              >
                {topPerformer?.Name === worker.Name && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-yellow-400 text-black font-bold text-xs shadow-lg animate-pulse">
                    ⭐ Top
                  </div>
                )}

                <div className="flex items-center gap-4 mb-3">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg ${isBusy ? "ring-2 ring-red-500" : "ring-2 ring-green-400"
                      }`}
                    style={{ background: "linear-gradient(135deg,#22C55E,#8b5cf6)" }}
                  >
                    {worker.Name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{worker.Name}</div>
                    <div className="text-gray-700">{worker.Role}</div>
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
