import React, { useState, useContext, useEffect, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion, AnimatePresence } from "framer-motion";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "react-toastify";


const TaskModal = ({
  show = false,
  onClose = () => {},
  projectId,
  projectName,
  onProgressChange,
}) => {
  const {
    projects,
    backendUrl,
    updateProgress,
    addTaskToProject,
    addMilestoneToTask,
    updateMilestoneStatus,
    token: contextToken,
  } = useContext(UsersContext);

  const workers = projects.filter((item)=>item._id === projectId)
  
  

  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState({});
  const [openMilestones, setOpenMilestones] = useState({});
  const [address, setAddress] = useState(null);
  const [progress, setProgress] = useState(0);
  const [role, setRole] = useState("");
  const [assignments, setAssignments] = useState({});
  const [closingBudget, setClosingBudget] = useState("");


  const [filter, setFilter] = useState("all");
const [filteredTasks, setFilteredTasks] = useState([]);

useEffect(() => {
  applyFilter(filter);
}, [tasks, filter]);

const applyFilter = (type) => {
  if (type === "completed") {
    setFilteredTasks(tasks.filter((t) => getTaskStatus(t) === "Completed"));
  } else if (type === "inprogress") {
    setFilteredTasks(tasks.filter((t) => getTaskStatus(t) === "In Progress"));
  } else {
    setFilteredTasks(tasks);
  }
};

  

  const activeProject = useMemo(() => projects.find((p) => p._id === projectId), [projects, projectId]);
  const projectWorkers = useMemo(() => {
    if (!activeProject) return [];
    const raw = activeProject.assignedWorkers || activeProject.workers || [];
    return raw.map((w) =>
      typeof w === "object"
        ? { _id: w._id || w.id, name: w.name || w.email }
        : { _id: w, name: `id:${String(w).slice(0, 6)}...` }
    );
  }, [activeProject]);

  // Load tasks for current project
  useEffect(() => {
  if (projectId) {
    const project = projects.find((p) => p._id === projectId);
    setTasks(project?.tasks || []);
    // ⛔ Do not call calculateProgress() here directly
    // Just calculate for UI only:
    const p = project?.tasks || [];
    let total = 0;
    p.forEach((t) => {
      const m = Array.isArray(t.milestones) ? t.milestones : [];
      if (m.length > 0) total += (m.filter((x) => x.completed).length / m.length) * 100;
    });
    setProgress(Math.round(total / Math.max(1, p.length)));
  }
}, [projectId, projects]);


  const token = localStorage.getItem("token")

  const handleWorkerAssign = async (taskId, workerId) => {
  try {
    await axios.put(
      `${backendUrl}/api/${projectId}/task/${taskId}/assign`,
      { workerId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    toast.success("Worker assigned successfully");
  } catch (error) {
    console.error("Worker assign failed:", error);
    toast.error("Worker assignment failed");
  }
};


  // Decode role from token (prefer token from context, fallback to localStorage)
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

  // Fetch user address
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await res.json();
        if (data?.address) setAddress(data.address);
      } catch (err) {
        console.error("Reverse geocode failed", err);
      }
    });
  }, []);

  // ✅ Calculate project progress and sync with backend
// ✅ Improved calculateProgress: average across tasks (tasks without milestones count as 0%)
const calculateProgress = async (taskList = tasks) => {
  if (!taskList || taskList.length === 0) {
    setProgress(0);
    if (onProgressChange) onProgressChange(projectId, 0);
    return;
  }

  // Sum of per-task percentages
  let totalTaskPercent = 0;
  const totalTasks = taskList.length;

  taskList.forEach((task) => {
    const milestones = Array.isArray(task.milestones) ? task.milestones : [];

    if (milestones.length > 0) {
      const completedCount = milestones.filter((m) => m.completed).length;
      const taskPercent = (completedCount / milestones.length) * 100;
      totalTaskPercent += taskPercent;
    } else {
      // If task has no milestones treat as 0%
      // Optionally, if you want to treat task.completed === true as 100%, uncomment below:
      // totalTaskPercent += task.completed ? 100 : 0;
      totalTaskPercent += 0;
    }
  });

  // Average across tasks
  const newProgress = Math.round(totalTaskPercent / Math.max(1, totalTasks));

  // update UI
  setProgress(newProgress);

  // Send calculated value to backend (use newProgress, not progress state)
  try {
    await axios.post(
      `${backendUrl}/api/update-project-progress`,
      { projectId, progress: newProgress },
      { headers: { Authorization: `Bearer ${contextToken || localStorage.getItem("token")}` } }
    );
  } catch (err) {
    console.error("❌ Failed to update project progress:", err);
  }

  // notify parent if present
  if (onProgressChange) onProgressChange(projectId, newProgress);
};





  // Add new task
  const handleAddTask = async () => {
    if (!newTaskTitle) return alert("Task title is required");
    const res = await addTaskToProject(projectId, newTaskTitle);
    if (res?.project) {
      setTasks(res.project.tasks);
      setNewTaskTitle("");
      calculateProgress(res.project.tasks);
    }
  };

  // Add new milestone
  const handleAddMilestone = async (taskId) => {
  const title = newMilestoneTitle[taskId];
  if (!title) return alert("Milestone title is required");

  const res = await addMilestoneToTask(projectId, taskId, title);

  if (res?.project) {
    const updatedTasks = res.project.tasks.map((task) => {
      if (task._id === taskId) {
        // 👇 Reset completion time when new milestone is added
        return { ...task, completedAt: null };
      }
      return task;
    });

    setTasks(updatedTasks);
    setNewMilestoneTitle((prev) => ({ ...prev, [taskId]: "" }));
    calculateProgress(updatedTasks);
  }
};


  // Toggle milestone completion (unchanged logic)
// helper: update/clear task.completedAt based on its milestones
const updateTaskCompletionState = (task) => {
  const allCompleted =
    task.milestones?.length > 0 && task.milestones.every((ms) => ms.completed);

  if (allCompleted && !task.completedAt) {
    task.completedAt = new Date().toISOString();
  } else if (!allCompleted) {
    task.completedAt = null;
  }

  return task;
};

// ✅ Helper: get latest milestone date
const getLatestMilestoneDate = (milestones = []) => {
  const completed = milestones.filter((m) => m.completed && m.completedAt);
  if (completed.length === 0) return null;
  return completed.reduce((latest, m) =>
    new Date(m.completedAt) > new Date(latest.completedAt) ? m : latest
  ).completedAt;
};

// ✅ Main handler
const handleToggleMilestone = async (taskId, milestoneId, currentStatus) => {
  try {
    const res = await updateMilestoneStatus(projectId, taskId, milestoneId, !currentStatus);

    if (res?.project) {
      // get the updated task
      const updatedTask = res.project.tasks.find((t) => t._id === taskId);

      if (updatedTask) {
        // calculate task.completedAt from latest milestone
        const latestTime = getLatestMilestoneDate(updatedTask.milestones);
        const allCompleted = updatedTask.milestones.every((m) => m.completed);
        updatedTask.completedAt = allCompleted ? latestTime : null;

        // update UI
        setTasks(res.project.tasks);
        calculateProgress(res.project.tasks);
      }
    } else {
      // fallback local optimistic update
      const nextTasks = tasks.map((t) => {
        if (t._id !== taskId) return t;

        const updatedMilestones = t.milestones.map((m) =>
          m._id === milestoneId
            ? {
                ...m,
                completed: !currentStatus,
                completedAt: !currentStatus ? new Date().toISOString() : null,
              }
            : m
        );

        const allCompleted = updatedMilestones.every((m) => m.completed);
        const latestTime = getLatestMilestoneDate(updatedMilestones);

        return {
          ...t,
          milestones: updatedMilestones,
          completedAt: allCompleted ? latestTime : null,
        };
      });

      setTasks(nextTasks);
      calculateProgress(nextTasks);
    }
  } catch (error) {
    console.error("❌ Error toggling milestone:", error);
    toast.error("Failed to update milestone");
  }
};





  

  // Toggle milestone visibility
  const toggleMilestoneVisibility = (taskId) => {
    setOpenMilestones((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Determine task status
  const getTaskStatus = (task) => {
    if (!task.milestones || task.milestones.length === 0) return "Pending";
    if (task.milestones.every((ms) => ms.completed)) return "Completed";
    if (task.milestones.some((ms) => ms.completed)) return "In Progress";
    return "Pending";
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto"
        >
          <motion.div
            initial={{ scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative"
          >
            {/* Close */}
            <button
              onClick={onClose}
              aria-label="Close task modal"
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 rounded-full w-9 h-9 flex items-center justify-center text-2xl"
            >
              ×
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-2xl font-semibold leading-tight">{projectName}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage tasks & milestones for this project
                </p>
              </div>

              {/* Progress + quick controls */}
              <div className="flex items-center gap-4">
                <div className="w-56">
                  <div className="text-xs font-medium text-gray-600 mb-1">Project progress</div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-right text-xs text-gray-500 mt-1">{progress}%</div>
                </div>

                {/* Add Task inline (only for editors) */}
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <input
                      aria-label="New task title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="New task title"
                      className="border border-gray-200 rounded-xl px-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      onClick={handleAddTask}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow"
                    >
                      + Task
                    </motion.button>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Tasks list */}
              <div className="md:col-span-2 space-y-4 max-h-[60vh] overflow-auto pr-2">
                {tasks.length === 0 && (
                  <div className="p-6 border rounded-lg bg-gray-50 text-center text-gray-500">
                    No tasks yet. {canEdit ? "Add one above!" : ""}
                  </div>
                )}

                {filteredTasks.map((task) => (

                  <article
                    key={task._id}
                    className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-semibold truncate">{task.title}</h4>

                        <div className="text-xs text-gray-600 mt-1">
                          {task.completedAt && (
  <p className="text-xs text-green-600 mt-1">
    ✅ Completed at: {new Date(task.completedAt).toLocaleString()}
  </p>
)}

</div>


                        {(role === "supervisor" || role === "admin") && (
                        <div className="mt-2">
                          <label className="text-xs text-gray-500 mr-2">Assign Worker:</label>
                          <select
                            value={assignments[task._id] || ""}
                            onChange={(e) => handleWorkerAssign(task._id, e.target.value)}
                            className="border rounded-lg px-2 py-1 text-sm"
                          >
                            <option value="">Select worker</option>
                            {projectWorkers.map((w) => (
                              <option key={w._id} value={w.name}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Show assigned workers */}
{task.assignedWorkers && task.assignedWorkers.length > 0 && (
  <div className="mt-2 text-sm text-gray-700">
    <span className="font-medium">Assigned Workers: </span>
    <ul className="list-disc list-inside text-gray-600">
      {task.assignedWorkers.map((worker, index) => (
        <li key={index}>{worker}</li>
      ))}
    </ul>
  </div>
)}
{(!task.assignedWorkers || task.assignedWorkers.length === 0) && (
  <div className="mt-2 text-sm text-gray-400">
    No workers assigned yet
  </div>
)}


                        {/* small meta row */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${
                              getTaskStatus(task) === "Completed"
                                ? "bg-green-100 text-green-700"
                                : getTaskStatus(task) === "In Progress"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {getTaskStatus(task)}
                          </span>

                          {task.milestones?.length !== undefined && (
                            <span>
                              {task.milestones.length} milestone
                              {task.milestones.length !== 1 ? "s" : ""}
                            </span>
                          )}

                        </div>

                        {address && (
                          <p className="text-xs text-gray-400 mt-2">
                            {address.house_number ? address.house_number + ", " : ""}
                            {address.road}, {address.suburb || address.neighbourhood},{" "}
                            {address.city || address.town}, {address.state}, {address.country}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => toggleMilestoneVisibility(task._id)}
                          className="text-sm text-blue-600 font-medium px-2 py-1"
                        >
                          {openMilestones[task._id] ? "Hide ▲" : "Show ▼"}
                        </button>
                      </div>
                    </div>

                    {/* Milestones accordion content */}
                    <AnimatePresence>
                      {openMilestones[task._id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-3"
                        >
                          {task.milestones?.length === 0 && (
                            <div className="text-sm text-gray-400">No milestones yet</div>
                          )}

                          {task.milestones?.map((ms) => (
                            <div
                              key={ms._id}
                              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={ms.completed}
                                  onChange={() =>
                                    handleToggleMilestone(task._id, ms._id, ms.completed)
                                  }
                                  className="w-5 h-5 accent-green-500"
                                />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate">{ms.title}</div>
                                  {ms.completedAt && (
                                    <div className="text-xs text-green-600 mt-1">
                                      {new Date(ms.completedAt).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* optional small action area */}
                              <div className="text-xs text-gray-400">
                                {ms.notes ? "Has notes" : ""}
                              </div>
                            </div>
                          ))}

                          {/* Add milestone row */}
                          {canEdit && (
                            <div className="flex gap-2 mt-2">
                              <input
                                value={newMilestoneTitle[task._id] || ""}
                                onChange={(e) =>
                                  setNewMilestoneTitle((prev) => ({
                                    ...prev,
                                    [task._id]: e.target.value,
                                  }))
                                }
                                placeholder="Add milestone..."
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-200"
                              />
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                onClick={() => handleAddMilestone(task._id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg"
                              >
                                + Milestone
                              </motion.button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </article>
                ))}
              </div>

              {/* Right: summary & quick actions */}
              <aside className="md:col-span-1 bg-gray-50 rounded-xl p-4 h-fit">
                <div className="mb-4">
                  <h5 className="text-sm font-semibold text-gray-700">Overview</h5>
                  <p className="text-xs text-gray-500 mt-2">
                    Tasks: <span className="font-medium">{tasks.length}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Progress: <span className="font-medium">{progress}%</span>
                  </p>
                </div>
                {/* Closing Budget Form - only visible when 100% */}
{progress === 100 && (
  <div className="mt-4 border-t pt-4">
    <h5 className="text-sm font-semibold text-gray-700 mb-2">
      Submit Closing Budget
    </h5>
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          const res = await axios.post(
            `${backendUrl}/api/update-closing-budget`,
            { projectId, closingBudget },
            { headers: { Authorization: `Bearer ${contextToken || localStorage.getItem("token")}` } }
          );
          toast.success("Closing budget submitted successfully");
        } catch (err) {
          console.error("Failed to submit closing budget:", err);
          toast.error("Failed to submit budget");
        }
      }}
      className="flex flex-col gap-2"
    >
      <input
        type="number"
        placeholder="Enter budget amount"
        value={closingBudget}
        onChange={(e) => setClosingBudget(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
        required
      />
      <motion.button
        whileHover={{ scale: 1.03 }}
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded-lg"
      >
        Submit Budget
      </motion.button>
    </form>
  </div>
)}


                <div className="flex flex-col gap-2 mt-2">
  <button
    className={`text-sm text-left px-3 py-2 rounded-md border ${
      filter === "all" ? "bg-blue-100 border-blue-400" : "bg-white"
    }`}
    onClick={() => setFilter("all")}
  >
    All tasks
  </button>
  <button
    className={`text-sm text-left px-3 py-2 rounded-md border ${
      filter === "inprogress" ? "bg-blue-100 border-blue-400" : "bg-white"
    }`}
    onClick={() => setFilter("inprogress")}
  >
    In progress
  </button>
  <button
    className={`text-sm text-left px-3 py-2 rounded-md border ${
      filter === "completed" ? "bg-blue-100 border-blue-400" : "bg-white"
    }`}
    onClick={() => setFilter("completed")}
  >
    Completed
  </button>
</div>


                <div>
                  <h5 className="text-sm font-semibold text-gray-700">Location</h5>
                  <p className="text-xs text-gray-500 mt-2">
                    {address ? (
                      <>
                        {address.road || address.suburb || address.city
                          ? `${address.road || ""} ${address.suburb || ""} ${address.city || ""}`
                          : "Location available"}
                      </>
                    ) : (
                      "Location not available"
                    )}
                  </p>
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
