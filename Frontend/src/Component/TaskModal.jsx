import React, { useState, useContext, useEffect } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion, AnimatePresence } from "framer-motion";

const TaskModal = ({
  show = false,
  onClose = () => {},
  projectId,
  projectName,
  onProgressChange,
  role,
}) => {
  const {
    projects,
    addTaskToProject,
    addMilestoneToTask,
    updateMilestoneStatus,
  } = useContext(UsersContext);

  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newMilestoneTitle, setNewMilestoneTitle] = useState({});
  const [openMilestones, setOpenMilestones] = useState({});
  const [address, setAddress] = useState(null);
  const [progress, setProgress] = useState(0); // Progress state for progress bar

  // Load tasks for current project
  useEffect(() => {
    if (projectId) {
      const project = projects.find((p) => p._id === projectId);
      setTasks(project?.tasks || []);
      calculateProgress(project?.tasks || []);
    }
  }, [projectId, projects]);

  // Fetch user address
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
      );
      const data = await res.json();
      if (data?.address) setAddress(data.address);
    });
  }, []);

  // Calculate project progress
  const calculateProgress = (taskList = tasks) => {
  if (!taskList || taskList.length === 0) return;

  let totalMilestones = 0;
  let completedMilestones = 0;

  taskList.forEach((task) => {
    const milestones = task.milestones || [];
    // Only count tasks with milestones
    if (milestones.length > 0) {
      totalMilestones += milestones.length;
      completedMilestones += milestones.filter((ms) => ms.completed).length;
    }
  });

  // If there are no milestones at all, progress is 0
  const newProgress =
    totalMilestones === 0 ? 0 : Math.round((completedMilestones / totalMilestones) * 100);

  setProgress(newProgress);
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
      const updatedTask = res.project.tasks.find((t) => t._id === taskId);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)));
      setNewMilestoneTitle((prev) => ({ ...prev, [taskId]: "" }));
      calculateProgress(res.project.tasks);
    }
  };

  // Toggle milestone completion
const handleToggleMilestone = async (taskId, milestoneId, currentStatus) => {
  try {
    // Call UserContext function; it handles completedAt internally
    const res = await updateMilestoneStatus(projectId, taskId, milestoneId, !currentStatus);

    if (res?.project) {
      // Update local tasks state
      const updatedTask = res.project.tasks.find((t) => t._id === taskId);
      setTasks((prev) => prev.map((t) => (t._id === taskId ? updatedTask : t)));

      // Update progress
      calculateProgress(res.project.tasks);
    }
  } catch (err) {
    console.error("Error toggling milestone:", err);
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
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
            className="bg-white rounded-2xl shadow-xl w-1/2 max-w-4xl p-6 relative"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 font-bold text-2xl"
            >
              ×
            </button>

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <p className="text-2xl font-bold mb-2 md:mb-0">
                Milestones for: {projectName}
              </p>
            </div>

            {/* Add Task */}
            {role !== "worker" && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                  type="text"
                  placeholder="New Milestone Title"
                  className="border rounded-xl p-2 flex-1"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-xl"
                  onClick={handleAddTask}
                >
                  + Milestone
                </motion.button>
              </div>
            )}

            {/* Task List */}
            <div className="space-y-4 max-h-[60vh] overflow-auto">
              {tasks.length === 0 && (
                <p className="text-gray-500">No tasks yet. Add one above!</p>
              )}

              {tasks.map((task) => (
                <div
                  key={task._id}
                  className="border rounded-xl p-4 shadow-sm bg-gray-50 hover:shadow-md transition"
                >
                  {/* Task Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-4">
                    <div>
                      <p className="font-semibold text-lg">{task.title}</p>
                      {address && (
                        <p className="text-sm text-gray-500 mt-1">
                          {address.house_number ? address.house_number + ", " : ""}
                          {address.road}, {address.suburb || address.neighbourhood},{" "}
                          {address.city || address.town}, {address.state},{" "}
                          {address.country}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p
                        className={`text-sm font-medium ${
                          getTaskStatus(task) === "Completed"
                            ? "text-green-600"
                            : getTaskStatus(task) === "In Progress"
                            ? "text-yellow-600"
                            : "text-red-500"
                        }`}
                      >
                        {getTaskStatus(task)}
                      </p>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => toggleMilestoneVisibility(task._id)}
                        className="text-sm text-blue-600 font-medium mt-2"
                      >
                        {openMilestones[task._id] ? "Hide Tasks ▲" : "Show Tasks ▼"}
                      </motion.button>
                    </div>
                  </div>

                  {/* Milestones */}
<AnimatePresence>
  {openMilestones[task._id] && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mt-3 space-y-2"
    >
      {task.milestones?.length === 0 && (
        <p className="text-gray-400">No Tasks yet</p>
      )}

      {task.milestones?.map((ms) => (
        <div
          key={ms._id}
          className="flex items-center justify-between bg-white p-3 w-full rounded-lg shadow-sm hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={ms.completed}
              onChange={() => handleToggleMilestone(task._id, ms._id, ms.completed)}
              className="w-5 h-5 accent-green-500"
            />

            {/* Title + Completion */}
            <div className="flex justify-between gap-80 w-full">
              <span className={ms.completed ? "font-medium" : "font-medium"}>
                {ms.title}
              </span>
              {ms.completedAt && (
                <p className="text-xs text-green-600 mt-1">
                  {new Date(ms.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Add New Milestone */}
      {role !== "worker" && (
        <div className="flex flex-col md:flex-row gap-2 mt-3">
          <input
            type="text"
            placeholder="New Task"
            className="border rounded-xl p-2 flex-1"
            value={newMilestoneTitle[task._id] || ""}
            onChange={(e) =>
              setNewMilestoneTitle((prev) => ({
                ...prev,
                [task._id]: e.target.value,
              }))
            }
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="bg-green-500 text-white px-4 py-2 rounded-xl"
            onClick={() => handleAddMilestone(task._id)}
          >
            + Task
          </motion.button>
        </div>
      )}
    </motion.div>
  )}
</AnimatePresence>

                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskModal;