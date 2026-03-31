import React, { useState, useContext, useEffect, useMemo, useRef } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "react-toastify";

/**
 * Utility: reverse geocode (keeps your implementation but defensive).
 * Caller can pass an AbortController.signal to cancel.
 */
const getReadableLocation = async (latitude, longitude, { signal } = {}) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=19&addressdetails=1`,
      {
        headers: {
          "User-Agent": "WorkerApp/1.0 (youremail@example.com)",
        },
        signal,
      }
    );
    const data = await res.json();
    if (!data?.address) return "Unknown location";

    const addr = data.address;
    return [
      addr.road,
      addr.suburb || addr.locality || addr.neighbourhood,
      addr.city || addr.town || addr.county,
      addr.state,
    ]
      .filter(Boolean)
      .join(", ");
  } catch (err) {
    if (err.name === "AbortError") return "Unknown location";
    console.error("Error fetching location:", err);
    return "Unknown location";
  }
};

const TaskModal = ({ show = false, onClose = () => {}, projectId, projectName, onProgressChange }) => {
  const {
    workers = [],
    projects = [],
    backendUrl,
    addTaskToProject,
    addMilestoneToTask,
    updateMilestoneStatus,
    token: contextToken,
  } = useContext(UsersContext) || {};

  // ====== LOCATION CACHE & FETCH ======
  const [workerLocations, setWorkerLocations] = useState({});
  const locationCacheRef = useRef({});

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const fetchAllLocations = async () => {
      if (!Array.isArray(workers) || workers.length === 0) {
        if (mounted) setWorkerLocations({});
        return;
      }

      const map = {};

      const promises = workers.map(async (w) => {
        const id = w?._id;
        const lat = w?.location?.latitude;
        const lon = w?.location?.longitude;

        if (!id) return;
        if (locationCacheRef.current[id]) {
          map[id] = locationCacheRef.current[id];
          return;
        }

        if (lat == null || lon == null) {
          map[id] = "No coordinates";
          return;
        }

        try {
          const readable = await getReadableLocation(lat, lon, { signal: controller.signal });
          if (!mounted) return;
          map[id] = readable || "Unknown location";
          locationCacheRef.current[id] = map[id];
        } catch (err) {
          if (!mounted) return;
          map[id] = "Unknown location";
        }
      });

      await Promise.all(promises);
      if (mounted) setWorkerLocations(map);
    };

    fetchAllLocations();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [workers]);

  // ====== TASKS & UI STATE ======
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState({});
  const [openMilestones, setOpenMilestones] = useState({});
  const [progress, setProgress] = useState(0);
  const [role, setRole] = useState("");
  const [assignments, setAssignments] = useState({});
  const [closingBudget, setClosingBudget] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [sortBy, setSortBy] = useState("priority"); // example sorting
  const [loading, setLoading] = useState(false);

  // derived project + workers
  const activeProject = useMemo(() => projects.find((p) => p._id === projectId), [projects, projectId]);
  const projectWorkers = useMemo(() => {
    if (!activeProject) return [];
    const raw = activeProject.assignedWorkers || activeProject.workers || [];
    return raw.map((w) =>
      typeof w === "object" ? { _id: w._id || w.id, name: w.name || w.Name || w.email } : { _id: w, name: `id:${String(w).slice(0, 6)}...` }
    );
  }, [activeProject]);

  // ====== LOAD TASKS WHEN PROJECT CHANGES ======
  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p._id === projectId);
      setTasks(project?.tasks || []);
      // calculate progress quickly for UI
      const p = project?.tasks || [];
      let total = 0;
      p.forEach((t) => {
        const m = Array.isArray(t.milestones) ? t.milestones : [];
        if (m.length > 0) total += (m.filter((x) => x.completed).length / m.length) * 100;
      });
      const calc = Math.round(total / Math.max(1, p.length));
      setProgress(calc);
    } else {
      setTasks([]);
      setProgress(0);
    }
  }, [projectId, projects]);

  // ====== ROLE FROM TOKEN ======
  useEffect(() => {
    const t = contextToken || localStorage.getItem("token");
    if (t) {
      try {
        const decoded = jwtDecode(t);
        setRole(decoded.role || "worker");
      } catch (err) {
        console.error("Invalid token", err);
        setRole("worker");
      }
    } else {
      setRole("worker");
    }
  }, [contextToken]);

  const canEdit = role && role !== "worker";

  // ====== HELPERS: STATUS & DATES ======
  const getTaskStatus = (task) => {
    if (!task.milestones || task.milestones.length === 0) return "Pending";
    if (task.milestones.every((ms) => ms.completed)) return "Completed";
    if (task.milestones.some((ms) => ms.completed)) return "In Progress";
    return "Pending";
  };

  const getLatestMilestoneDate = (milestones = []) => {
    const completed = milestones.filter((m) => m.completed && m.completedAt);
    if (!completed.length) return null;
    return completed.reduce((latest, m) => (new Date(m.completedAt) > new Date(latest.completedAt) ? m : latest)).completedAt;
  };

  // ====== PROGRESS CALCULATION & SYNC ======
  const calculateProgress = async (taskList = tasks) => {
    if (!taskList || taskList.length === 0) {
      setProgress(0);
      if (onProgressChange) onProgressChange(projectId, 0);
      return;
    }
    let totalTaskPercent = 0;
    const totalTasks = taskList.length;
    taskList.forEach((task) => {
      const milestones = Array.isArray(task.milestones) ? task.milestones : [];
      if (milestones.length > 0) {
        const completedCount = milestones.filter((m) => m.completed).length;
        totalTaskPercent += (completedCount / milestones.length) * 100;
      } else {
        totalTaskPercent += 0;
      }
    });
    const newProgress = Math.round(totalTaskPercent / Math.max(1, totalTasks));
    setProgress(newProgress);

    // sync backend (non-blocking)
    try {
      await axios.post(
        `${backendUrl}/api/update-project-progress`,
        { projectId, progress: newProgress },
        { headers: { Authorization: `Bearer ${contextToken || localStorage.getItem("token")}` } }
      );
    } catch (err) {
      console.error("Failed to update project progress:", err);
    }
    if (onProgressChange) onProgressChange(projectId, newProgress);
  };

  // ====== CRUD HANDLERS ======
  const token = localStorage.getItem("token") || contextToken;

  const handleAddTask = async () => {
    if (!newTaskTitle?.trim()) return toast.error("Milestone title required");
    setLoading(true);
    try {
      const res = await addTaskToProject(projectId, newTaskTitle.trim());
      if (res?.project) {
        setTasks(res.project.tasks || []);
        setNewTaskTitle("");
        await calculateProgress(res.project.tasks);
        toast.success("Milestone added");
      }
    } catch (err) {
      console.error("Add task failed", err);
      toast.error("Failed to add milestone");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async (taskId) => {
    const title = (newMilestoneTitle[taskId] || "").trim();
    if (!title) return toast.error("Task title is required");
    setLoading(true);
    try {
      const res = await addMilestoneToTask(projectId, taskId, title);
      if (res?.project) {
        // keep tasks consistent
        const updatedTasks = res.project.tasks.map((task) => (task._id === taskId ? { ...task, completedAt: null } : task));
        setTasks(updatedTasks);
        setNewMilestoneTitle((p) => ({ ...p, [taskId]: "" }));
        await calculateProgress(updatedTasks);
        toast.success("Task added");
      }
    } catch (err) {
      console.error("Add milestone failed", err);
      toast.error("Failed to add task");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMilestone = async (taskId, milestoneId, currentStatus) => {
    try {
      const res = await updateMilestoneStatus(projectId, taskId, milestoneId, !currentStatus);
      if (res?.project) {
        // update tasks with response from backend
        const updatedTask = res.project.tasks.find((t) => t._id === taskId);
        if (updatedTask) {
          const latestTime = getLatestMilestoneDate(updatedTask.milestones);
          const allCompleted = updatedTask.milestones.every((m) => m.completed);
          updatedTask.completedAt = allCompleted ? latestTime : null;
        }
        setTasks(res.project.tasks || []);
        await calculateProgress(res.project.tasks || []);
      } else {
        // optimistic local fallback
        const nextTasks = tasks.map((t) => {
          if (t._id !== taskId) return t;
          const updatedMilestones = (t.milestones || []).map((m) =>
            m._id === milestoneId ? { ...m, completed: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : null } : m
          );
          const allCompleted = updatedMilestones.every((m) => m.completed);
          const latestTime = getLatestMilestoneDate(updatedMilestones);
          return { ...t, milestones: updatedMilestones, completedAt: allCompleted ? latestTime : null };
        });
        setTasks(nextTasks);
        await calculateProgress(nextTasks);
      }
    } catch (err) {
      console.error("Toggle milestone failed", err);
      toast.error("Failed to update task");
    }
  };

  const handleWorkerAssign = async (taskId, workerId) => {
    try {
      await axios.put(
        `${backendUrl}/api/${projectId}/task/${taskId}/assign`,
        { workerId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Worker assigned");
      // optimistic UI: update assignments map
      setAssignments((p) => ({ ...p, [taskId]: workerId }));
    } catch (err) {
      console.error("Worker assign failed:", err);
      toast.error("Worker assignment failed");
    }
  };

  // open/close milestone panels
  const toggleMilestoneVisibility = (taskId) => setOpenMilestones((p) => ({ ...p, [taskId]: !p[taskId] }));

  // ====== FILTER / SEARCH / SORT ======
  const filteredTasks = useMemo(() => {
    const q = (searchQ || "").trim().toLowerCase();
    let list = Array.isArray(tasks) ? tasks.slice() : [];
    if (filter === "completed") list = list.filter((t) => getTaskStatus(t) === "Completed");
    if (filter === "inprogress") list = list.filter((t) => getTaskStatus(t) === "In Progress");
    if (q) list = list.filter((t) => (t.title || "").toLowerCase().includes(q) || (t.milestones || []).some((m) => (m.title || "").toLowerCase().includes(q)));
    if (sortBy === "latest") list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    if (sortBy === "priority") list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    return list;
  }, [tasks, filter, searchQ, sortBy]);

  // small keyboard accessibility: close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && show) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  // UX: trap scroll when modal open (simple)
  useEffect(() => {
    if (show) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => (document.body.style.overflow = "");
  }, [show]);

  // ====== RENDER ======
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
        >
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* modal panel */}
          <motion.div
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 24, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-50 w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] bg-white backdrop-blur-lg border border-white/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* header */}
            <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200/50 bg-gradient-to-r from-white/50 to-white/30">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{projectName}</h3>
                <p className="text-xs text-gray-500">Manage milestones & tasks</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-3 bg-white/40 px-2 rounded-full border border-gray-100">
                  <input
                    aria-label="Search tasks"
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Search tasks or milestones..."
                    className="text-sm bg-transparent outline-none px-2 py-2"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* <div className="text-xs text-gray-600 mr-2 text-right">
                    <div className="text-xs">Project progress</div>
                    <div className="text-sm font-medium text-gray-800">{progress}%</div>
                  </div> */}

                  {/* <div className="w-36 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-green-400 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
                  </div> */}

                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="ml-2 w-9 h-9 rounded-md flex items-center justify-center bg-white/40 hover:bg-white/60 border border-gray-100"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </header>

            {/* body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {/* left: main tasks list */}
              <div className="md:col-span-2 overflow-auto pr-2">
                {/* action add */}
                {canEdit && (
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      aria-label="New milestone title"
                      placeholder="Add new milestone title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white/70 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <button
                      onClick={handleAddTask}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                    >
                      + Milestone
                    </button>
                  </div>
                )}

                {filteredTasks.length === 0 ? (
                  <div className="p-6 rounded-lg border border-dashed border-gray-200 bg-white/60 text-center text-gray-500">
                    No milestones found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTasks.map((task) => (
                      <article key={task._id} className="bg-white/70 border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-md font-semibold text-gray-800">{task.title}</h4>
                              <div className="text-xs text-gray-500">{task.createdAt ? new Date(task.createdAt).toLocaleDateString() : ""}</div>
                            </div>
                            {task.completedAt && <div className="text-xs text-green-600 mt-1">✅ Completed at: {new Date(task.completedAt).toLocaleString()}</div>}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className={`text-xs px-2 py-1 rounded-full ${getTaskStatus(task) === "Completed" ? "bg-green-100 text-green-800" : getTaskStatus(task) === "In Progress" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"}`}>
                                {getTaskStatus(task)}
                              </span>
                              <span className="text-xs text-gray-500">{(task.milestones || []).length} task{(task.milestones || []).length !== 1 ? "s" : ""}</span>
                              {task.priority && <span className="text-xs px-2 py-1 rounded bg-red-50 text-red-700">P{task.priority}</span>}
                            </div>
                          </div>

                          <div className="flex items-start gap-2 ml-3">
                            <button
                              onClick={() => toggleMilestoneVisibility(task._id)}
                              className="text-sm text-blue-600 hover:text-blue-800"
                              aria-expanded={!!openMilestones[task._id]}
                            >
                              {openMilestones[task._id] ? "Hide ▲" : "Show ▼"}
                            </button>
                          </div>
                        </div>

                        {/* small progress bar */}
                        {(task.milestones || []).length > 0 && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${getTaskStatus(task) === "Completed" ? "bg-green-500" : getTaskStatus(task) === "In Progress" ? "bg-yellow-400" : "bg-gray-300"}`}
                                style={{ width: `${((task.milestones.filter((m) => m.completed).length / (task.milestones.length || 1)) * 100) || 0}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* assign dropdown */}
                        {canEdit && (
                          <div className="mt-3">
                            <label className="text-xs text-gray-500">Assign Worker</label>
                            <div className="mt-1 flex gap-2">
                              <select value={assignments[task._id] || ""} onChange={(e) => handleWorkerAssign(task._id, e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white/70 text-sm">
                                <option value="">Unassigned</option>
                                {projectWorkers.map((w) => (
                                  <option key={w._id} value={w._id}>
                                    {w.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* assigned workers list */}
                        <div className="mt-3 space-y-2">
                          {(task.assignedWorkers || []).map((assignedWorker, idx) => {
                            let fullWorker = null;
                            if (assignedWorker && typeof assignedWorker === "object") {
                              fullWorker = workers.find((w) => String(w._id) === String(assignedWorker._id)) || assignedWorker;
                            } else if (typeof assignedWorker === "string") {
                              fullWorker = workers.find((w) => String(w._id) === assignedWorker) || workers.find((w) => (w.Name || w.name || "").toLowerCase() === assignedWorker.toLowerCase());
                            }

                            const workerId = fullWorker?._id;
                            const displayName = fullWorker?.Name || fullWorker?.name || assignedWorker || "Unknown";
                            const locationText = workerId ? workerLocations[workerId] || locationCacheRef.current[workerId] || "Fetching location..." : fullWorker?.location ? "Coords present but no id" : "Worker not found";

                            return (
                              <div key={idx} className="flex items-center justify-between bg-white/60 border border-gray-100 rounded-lg px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">{(displayName || "?")[0]}</div>
                                  <div>
                                    <div className="font-medium text-gray-800">{displayName}</div>
                                    <div className="text-xs text-gray-500">{fullWorker?.email || fullWorker?.Email || ""}</div>
                                  </div>
                                </div>

                                {(role === "admin" || role === "supervisor") && <div className="text-xs text-blue-500">📍 {locationText}</div>}
                              </div>
                            );
                          })}
                        </div>

                        {/* milestone accordion */}
                        <AnimatePresence initial={false}>
                          {openMilestones[task._id] && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                              {(task.milestones || []).length === 0 && <div className="text-sm text-gray-400">No tasks yet</div>}

                              {(task.milestones || []).map((ms) => (
                                <div key={ms._id} className="flex items-center justify-between gap-3 bg-white/60 border border-gray-100 rounded-lg px-3 py-2">
                                  <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={ms.completed} onChange={() => handleToggleMilestone(task._id, ms._id, ms.completed)} className="w-5 h-5 accent-green-600" />
                                    <div>
                                      <div className={`text-sm ${ms.completed ? "text-gray-500 line-through" : "text-gray-800"}`}>{ms.title}</div>
                                      {ms.completedAt && <div className="text-xs text-green-600">{new Date(ms.completedAt).toLocaleString()}</div>}
                                    </div>
                                  </div>

                                  <div className="text-xs text-gray-400">{ms.eta ? `ETA: ${new Date(ms.eta).toLocaleDateString()}` : ""}</div>
                                </div>
                              ))}

                              {canEdit && (
                                <div className="flex gap-2">
                                  <input value={newMilestoneTitle[task._id] || ""} onChange={(e) => setNewMilestoneTitle((p) => ({ ...p, [task._id]: e.target.value }))} placeholder="Add a new task..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white/70" />
                                  <button onClick={() => handleAddMilestone(task._id)} className="px-4 py-2 bg-green-600 text-white rounded-lg">+ Add</button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              {/* right: summary & quick actions */}
              <aside className="md:col-span-1 overflow-auto">
                <div className="bg-white/60 border border-gray-100 rounded-xl p-4 sticky top-4">
                  <h4 className="text-sm font-semibold text-gray-800">Overview</h4>
                  <div className="mt-2 text-xs text-gray-600">
                    <div>Milestones: <span className="font-medium text-gray-800">{tasks.length}</span></div>
                    <div>Progress: <span className="font-medium text-gray-800">{progress}%</span></div>
                    <div>Workers: <span className="font-medium text-gray-800">{projectWorkers.length}</span></div>
                  </div>

                  {/* closing budget when complete */}
                  {progress === 100 && (
                    <div className="mt-4 border-t pt-4">
                      <label className="text-sm font-medium text-gray-700">Closing Budget</label>
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        try {
                          const res = await axios.post(
                            `${backendUrl}/api/update-closing-budget`,
                            { projectId, closingBudget },
                            { headers: { Authorization: `Bearer ${contextToken || localStorage.getItem("token")}` } }
                          );
                          toast.success("Closing budget submitted");
                        } catch (err) {
                          console.error("Failed to submit closing budget:", err);
                          toast.error("Failed to submit budget");
                        }
                      }} className="mt-3 space-y-2">
                        <input type="number" placeholder="Amount" value={closingBudget} onChange={(e) => setClosingBudget(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white/70" required />
                        <button type="submit" className="w-full px-3 py-2 bg-green-600 text-white rounded-lg">Submit</button>
                      </form>
                    </div>
                  )}

                  {/* filters */}
                  <div className="mt-4 border-t pt-4 space-y-2">
                    <div className="text-xs font-medium text-gray-600">Filters</div>
                    <div className="flex flex-col gap-2 mt-2">
                      <button onClick={() => setFilter("all")} className={`text-sm text-left px-3 py-2 rounded ${filter === "all" ? "bg-blue-50 border border-blue-200" : "bg-white/60 border border-gray-100"}`}>All Milestones</button>
                      <button onClick={() => setFilter("inprogress")} className={`text-sm text-left px-3 py-2 rounded ${filter === "inprogress" ? "bg-blue-50 border border-blue-200" : "bg-white/60 border border-gray-100"}`}>In progress</button>
                      <button onClick={() => setFilter("completed")} className={`text-sm text-left px-3 py-2 rounded ${filter === "completed" ? "bg-blue-50 border border-blue-200" : "bg-white/60 border border-gray-100"}`}>Completed</button>
                    </div>

                    <div className="mt-3">
                      <label className="text-xs text-gray-500">Sort</label>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-lg border border-gray-200 bg-white/70 text-sm">
                        <option value="priority">Priority</option>
                        <option value="latest">Latest</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* small help / legend */}
                <div className="mt-3 text-xs text-gray-400">
                  Tip: Click <span className="font-medium text-gray-700">Show</span> to expand tasks. Use the search to quickly locate milestones.
                </div>
              </aside>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskModal;
