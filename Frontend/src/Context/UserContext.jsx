import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

export const UsersContext = createContext();

const UserContext = ({ children }) => {
  const [token, setToken] = useState("");
  const [projects, setProjects] = useState(() => JSON.parse(localStorage.getItem("projects")) || []);
  const [workers, setWorkers] = useState(() => JSON.parse(localStorage.getItem("workers")) || []);
  const [queries, setQueries] = useState(() => JSON.parse(localStorage.getItem("queries")) || []);
  const [clockEntries, setClockEntries] = useState(() => JSON.parse(localStorage.getItem("clockEntries")) || []);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  console.log(backendUrl);
  

  // Load token from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  // -------------------- FETCHERS --------------------
  const fetchProjects = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/get-projects`, { headers: { Authorization: `Bearer ${token}` } });
      setProjects(data.projects || []);
      localStorage.setItem("projects", JSON.stringify(data.projects || []));
    } catch (err) {
      console.error("Error fetching projects:", err?.response?.data || err.message);
    }
  };

  const fetchWorkers = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/get-workers`, { headers: { token } });
      setWorkers(data.workers || []);
      localStorage.setItem("workers", JSON.stringify(data.workers || []));
    } catch (err) {
      console.error("Error fetching workers:", err.message);
    }
  };

  const fetchQueries = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/get-queries`, { headers: { token } });
      setQueries(data.queries || []);
      localStorage.setItem("queries", JSON.stringify(data.queries || []));
    } catch (err) {
      console.error("Error fetching queries:", err.message);
    }
  };

  const fetchClockEntries = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/get-clocks`, { headers: { token } });
      if (data.success) {
        const backendEntries = data.entries.map(e => ({ ...e, synced: true }));
        const merged = [...clockEntries, ...backendEntries].filter(
          (v, i, a) => a.findIndex(e => (e._id && v._id && e._id === v._id) || (e.id && v.id && e.id === v.id)) === i
        );
        setClockEntries(merged);
        localStorage.setItem("clockEntries", JSON.stringify(merged));
      }
    } catch (err) {
      console.error("Failed to fetch clock entries:", err.message);
    }
  };

  // Auto-fetch when token changes
  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchWorkers();
      fetchQueries();
      fetchClockEntries();
    }
  }, [token]);

  // -------------------- PROJECTS --------------------
  const newProject = async (formData) => {
    if (!token || !formData) return;
    try {
      await axios.post(`${backendUrl}/api/new`, formData, { headers: { "Content-Type": "multipart/form-data", token } });
      await fetchProjects();
      toast.success("✅ Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("❌ Failed to create project");
    }
  };

  const updateProgress = async (projectId, payload, images) => {
    if (!token) return;
    try {
      let formData;
      if (payload instanceof FormData) {
        formData = payload;
        if (!formData.get("id")) formData.append("id", projectId);
      } else {
        formData = new FormData();
        formData.append("id", projectId);
        formData.append("progress", payload);
        if (images) images.forEach(f => formData.append("images", f));
      }

      const { data } = await axios.post(`${backendUrl}/api/update-progress`, formData, { headers: { "Content-Type": "multipart/form-data", token } });

      const updatedProject = data.project;
      if (updatedProject) {
        setProjects(prev => prev.map(p => (p._id === projectId ? updatedProject : p)));
      }
      return data;
    } catch (err) {
      console.error("Error updating progress:", err);
      return null;
    }
  };

  const updateProjectStatus = async (projectId) => {
    if (!token) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/update-status`, { projectId }, { headers: { token } });
      await fetchProjects();
      return data;
    } catch (err) {
      console.error("Error updating project status:", err);
    }
  };

  const assignWorkerToProject = async (projectId, workerId) => {
    console.log(projectId, workerId);
    
  if (!token) return null;

  try {
    const url = `${backendUrl}/api/projects/${projectId}/assign`;

    // Send valid JSON object
    const { data } = await axios.put(
      url,
      { workerId }, // <- this must be an object
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (data?.project) {
      setProjects(prev =>
        prev.map(p => (p._id === data.project._id ? data.project : p))
      );
      await fetchWorkers(); // optional refresh
      return data.project;
    }

    return data;
  } catch (err) {
    console.error("Error assigning worker:", err?.response?.data || err.message);
    return null;
  }
};




  // -------------------- TASKS & MILESTONES --------------------
  const addTaskToProject = async (projectId, title, description = "") => {
    if (!token) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/add-task`,
        { projectId, title, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedProject = data.project;
      if (updatedProject) setProjects(prev => prev.map(p => (p._id === projectId ? updatedProject : p)));
      toast.success(`✅ Task "${title}" added successfully!`);

      // Update progress after adding task
      await recalcProjectProgress(projectId);

      return data;
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("❌ Failed to add task");
    }
  };

  const addMilestoneToTask = async (projectId, taskId, title) => {
    if (!token) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/add-milestone`, { projectId, taskId, title }, { headers: { token } });
      const updatedProject = data.project;
      if (updatedProject) setProjects(prev => prev.map(p => (p._id === projectId ? updatedProject : p)));
      toast.success(`✅ Milestone "${title}" added!`);

      // Update progress after adding milestone
      await recalcProjectProgress(projectId);

      return data;
    } catch (err) {
      console.error("Error adding milestone:", err);
      toast.error("❌ Failed to add milestone");
    }
  };

  const updateTaskStatus = async (projectId, taskId, completed) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/update-task-status`,
        { projectId, taskId, completed },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      setProjects(prev => prev.map(p => (p._id === projectId ? res.data.updatedProject : p)));

      // Update project progress after task toggle
      await recalcProjectProgress(projectId);

    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const updateMilestoneStatus = async (projectId, taskId, milestoneId, completed) => {
  try {
    // Determine timestamp when marking as complete
    const completedAt = completed ? new Date().toISOString() : null;

    const res = await axios.post(
      `${backendUrl}/api/update-milestone-status`,
      { projectId, taskId, milestoneId, completed, completedAt },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    // Update local projects state
    setProjects(prev =>
      prev.map(p => (p._id === projectId ? res.data.updatedProject : p))
    );

    // Recalculate project progress
    await recalcProjectProgress(projectId);

  } catch (err) {
    console.error("Error updating milestone:", err);
  }
};


  // -------------------- RECALC PROJECT PROGRESS --------------------
  const recalcProjectProgress = async (projectId) => {
    const project = projects.find(p => p._id === projectId);
    if (!project) return;

    let totalMilestones = 0;
    let completedMilestones = 0;

    project.tasks.forEach(task => {
      const milestones = task.milestones || [];
      totalMilestones += milestones.length || 1;
      completedMilestones += milestones.filter(ms => ms.completed).length || (milestones.length === 0 && task.completed ? 1 : 0);
    });

    const progress = Math.round((completedMilestones / totalMilestones) * 100);
    await updateProgress(projectId, progress);
  };

  // -------------------- WORKERS --------------------
  const addWorker = async ({ Name, Role, workerType }) => {
    if (!token) return;
    try {
      await axios.post(`${backendUrl}/api/worker`, { Name, Role, workerType }, { headers: { token } });
      await fetchWorkers();
    } catch (err) {
      console.error("Error adding worker:", err);
    }
  };

  // -------------------- QUERIES --------------------
  const newQuery = async (queryTitle, queryDescription, queryProject, queryWorker, queryPriority) => {
    if (!token) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/query`, { queryTitle, queryDescription, queryProject, queryWorker, queryPriority }, { headers: { token } });
      await fetchQueries();
      return data;
    } catch (err) {
      console.error("Error creating query:", err);
    }
  };

  const queryStatus = async (id, status) => {
    if (!token) return;
    try {
      const { data } = await axios.post(`${backendUrl}/api/update-status`, { id, status }, { headers: { token } });
      toast.success("✅ Query status updated!");
      return data.updatedQuery;
    } catch (err) {
      console.error("Error updating query status:", err);
      toast.error("❌ Failed to update status");
      return null;
    }
  };

  const deleteQuery = async (id) => {
    if (!token) return;
    try {
      const { data } = await axios.delete(`${backendUrl}/api/delete-query`, { headers: { token }, data: { id } });
      await fetchQueries();
      return data;
    } catch (err) {
      console.error("Error deleting query:", err);
    }
  };

  // -------------------- CLOCK --------------------
  const createClockEntry = async ({ worker, project, type }) => {
  if (!worker || !project || !type || !token) return;

  const newEntry = {
    id: Date.now(),
    worker,
    project,
    type,
    time: new Date().toISOString(),
    synced: false,
    ownerToken: token,
  };

  // Optimistic UI update
  setClockEntries(prev => {
    const updated = [...prev, newEntry];
    localStorage.setItem("clockEntries", JSON.stringify(updated));
    return updated;
  });

  // Attempt to sync with backend
  try {
    const { data } = await axios.post(
      `${backendUrl}/api/clock`,
      {
        worker,
        project,
        type,
        time: newEntry.time,
      },
      { headers: { token } }
    );

    // Update state with backend response
    setClockEntries(prev => {
      const final = prev.map(e =>
        e.id === newEntry.id
          ? { ...e, synced: true, _id: data.clock?._id || data._id }
          : e
      );
      localStorage.setItem("clockEntries", JSON.stringify(final));
      return final;
    });
  } catch (err) {
    console.error("Failed to post clock entry:", err.response?.data || err.message);
  }
};


  const syncClockEntries = async () => {
    if (!token || !navigator.onLine) return;
    const unsynced = clockEntries.filter(e => !e.synced && e.ownerToken === token);
    for (const entry of unsynced) {
      try {
        const { data } = await axios.post(`${backendUrl}/api/clock`, { worker: entry.worker, project: entry.project, type: entry.type, time: entry.time }, { headers: { token } });
        entry.synced = true;
        entry._id = data.clock?._id || data._id;
      } catch (err) {
        console.error("Sync failed:", err.message);
      }
    }
    setClockEntries([...clockEntries]);
    localStorage.setItem("clockEntries", JSON.stringify(clockEntries));
  };

  // -------------------- LOGOUT --------------------
  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/login");
  };

  return (
    <UsersContext.Provider value={{
      token, setToken, navigate, backendUrl,
      projects, setProjects, fetchProjects, newProject, updateProgress, updateProjectStatus, updateTaskStatus,
      workers, setWorkers, fetchWorkers, addWorker, assignWorkerToProject,
      queries, setQueries, fetchQueries, newQuery, queryStatus, deleteQuery,
      clockEntries, setClockEntries, createClockEntry, syncClockEntries,
      addTaskToProject, addMilestoneToTask, updateMilestoneStatus, logout
    }}>
      {children}
    </UsersContext.Provider>
  );
};

export default UserContext;