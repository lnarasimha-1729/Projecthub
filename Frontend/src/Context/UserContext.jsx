import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "axios";

export const UsersContext = createContext();

const UserContext = ({ children }) => {
  const [token, setToken] = useState("");
  const [projects, setProjects] = useState(() => JSON.parse(localStorage.getItem("projects")) || []);
  const [users, setUsers] = useState([]);
  const [workers, setWorkers] = useState(() => JSON.parse(localStorage.getItem("workers")) || []);
  const [queries, setQueries] = useState(() => JSON.parse(localStorage.getItem("queries")) || []);
  const [clockEntries, setClockEntries] = useState([]);
  const [getDailyProgress, setGetDailyProgress] = useState([])
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  // -------------------- TOKEN LOAD --------------------
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) setToken(savedToken);
  }, []);

  const fetchDailyProgress = async()=>{
    try{
      const res = await axios.get(backendUrl + "/api/getDailyProgress", {headers : {token}})
      setGetDailyProgress(res.data.dailyProgress)
      return res.data
    }
    catch(error){
      console.log(error);
      
    }
  }
  

  // -------------------- FETCHERS --------------------
  const fetchProjects = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/get-projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(data.projects || []);
      localStorage.setItem("projects", JSON.stringify(data.projects || []));
    } catch (err) {
      console.error("Error fetching projects:", err?.response?.data || err.message);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${backendUrl}/api/user/get-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data.users || []);
      localStorage.setItem("users", JSON.stringify(data.users || []));
    } catch (err) {
      console.error("Error fetching users:", err?.response?.data || err.message);
    }
  };
  const updateWorkerHours = async (workerId, totalHoursWorked) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/update-hours`,
        { workerId, totalHoursWorked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    } catch (err) {
      console.error("Failed to update hours:", err);
      throw err;
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
          (v, i, a) =>
            a.findIndex(e => (e._id && v._id && e._id === v._id) || (e.id && v.id && e.id === v.id)) === i
        );
        setClockEntries(merged);
        localStorage.setItem("clockEntries", JSON.stringify(merged));
      }
    } catch (err) {
      console.error("Failed to fetch clock entries:", err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProjects();
      fetchUsers();
      fetchWorkers();
      fetchQueries();
      fetchClockEntries();
      fetchDailyProgress()
    }
  }, [token]);

  // -------------------- PROJECT FUNCTIONS --------------------
  const Progress = async (projectId, progress) => {
    try {
      const response = await axios.post(
        `${backendUrl}/api/update-progresses`,
        { id: projectId, progress },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating project progress:", error.message);
      throw error;
    }
  };

  const newProject = async (formData) => {
    if (!token || !formData) return;
    try {
      await axios.post(`${backendUrl}/api/new`, formData, {
        headers: { "Content-Type": "multipart/form-data", token },
      });
      await fetchProjects();
      toast.success("✅ Project created successfully!");
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("❌ Failed to create project");
    }
  };

  const updateProgress = async (projectId, payload, images) => {
    if (!token) {
      console.warn("No token available; cannot update progress.");
      return null;
    }

    try {
      let formData;
      if (payload instanceof FormData) {
        formData = payload;
        if (!formData.get("id")) formData.append("id", projectId);
      } else {
        formData = new FormData();
        formData.append("id", projectId);
        formData.append("progress", payload);
        if (images && Array.isArray(images)) images.forEach((f) => formData.append("images", f));
      }

      const { data } = await axios.post(`${backendUrl}/api/update-progress`, formData, {
        headers: { "Content-Type": "multipart/form-data", token },
      });

      if (data && data.project) {
        setProjects((prev) => prev.map((p) => (p._id === projectId ? data.project : p)));
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
      const { data } = await axios.post(
        `${backendUrl}/api/update-status`,
        { projectId },
        { headers: { token } }
      );
      await fetchProjects();
      return data;
    } catch (err) {
      console.error("Error updating project status:", err);
    }
  };

  const assignWorkerToProject = async (projectId, workerId) => {
    if (!token) return null;
    try {
      const { data } = await axios.put(
        `${backendUrl}/api/projects/${projectId}/assign`,
        { workerId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (data?.project) {
        setProjects(prev => prev.map(p => (p._id === data.project._id ? data.project : p)));
        await fetchWorkers();
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
      return data;
    } catch (err) {
      console.error("Error adding task:", err);
      toast.error("❌ Failed to add task");
    }
  };

  const addMilestoneToTask = async (projectId, taskId, title) => {
    if (!token) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/add-milestone`,
        { projectId, taskId, title },
        { headers: { token } }
      );
      const updatedProject = data.project;
      if (updatedProject) setProjects(prev => prev.map(p => (p._id === projectId ? updatedProject : p)));
      toast.success(`✅ Milestone "${title}" added!`);
      return data;
    } catch (err) {
      console.error("Error adding milestone:", err);
      toast.error("❌ Failed to add milestone");
    }
  };

  const updateTaskStatus = async (projectId, taskId, completed, completedAt = null) => {
    try {
      const payload = { projectId, taskId, completed };
      if (completedAt !== undefined) payload.completedAt = completedAt;

      const res = await axios.post(
        `${backendUrl}/api/update-task-status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.updatedProject) {
        setProjects(prev => prev.map(p => (p._id === projectId ? res.data.updatedProject : p)));
      } else {
        await fetchProjects();
      }
      return res.data;
    } catch (err) {
      console.error("Error updating task:", err.response?.data || err.message);
      return null;
    }
  };

  const updateMilestoneStatus = async (projectId, taskId, milestoneId, completed) => {
    try {
      const completedAt = completed ? new Date().toISOString() : null;
      const res = await axios.post(
        `${backendUrl}/api/update-milestone-status`,
        { projectId, taskId, milestoneId, completed, completedAt },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res?.data?.updatedProject) {
        const updatedProject = res.data.updatedProject;
        setProjects(prev => prev.map(p => (p._id === updatedProject._id ? updatedProject : p)));
      } else {
        await fetchProjects();
      }
    } catch (err) {
      console.error("Error updating milestone:", err.response?.data || err.message);
    }
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
      const { data } = await axios.post(
        `${backendUrl}/api/query`,
        { queryTitle, queryDescription, queryProject, queryWorker, queryPriority },
        { headers: { token } }
      );
      await fetchQueries();
      return data;
    } catch (err) {
      console.error("Error creating query:", err);
    }
  };

  const queryStatus = async (id, currentStatus) => {
    if (!token) return;
    try {
      const nextStatus =
        currentStatus === "Open"
          ? "InProgress"
          : currentStatus === "InProgress"
          ? "Resolved"
          : "Open";

      const { data } = await axios.post(
        `${backendUrl}/api/update-querystatus`,
        { id, status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data?.query) {
        setQueries(prev => prev.map(q => (q._id === id ? { ...q, status: data.query.status } : q)));
        toast.success(`✅ Query marked as ${data.query.status}`);
      }
    } catch (err) {
      console.error("Error updating query status:", err.response?.data || err.message);
      toast.error("❌ Failed to update query status");
    }
  };

  const deleteQuery = async (id) => {
    if (!token) return;
    try {
      const { data } = await axios.delete(`${backendUrl}/api/delete-query`, {
        headers: { token },
        data: { id },
      });
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

    setClockEntries(prev => {
      const updated = [...prev, newEntry];
      localStorage.setItem("clockEntries", JSON.stringify(updated));
      return updated;
    });

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/clock`,
        { worker, project, type, time: newEntry.time },
        { headers: { token } }
      );

      setClockEntries(prev =>
        prev.map(e =>
          e.id === newEntry.id ? { ...e, synced: true, _id: data.clock?._id || data._id } : e
        )
      );
    } catch (err) {
      console.error("Failed to post clock entry:", err.message);
    }
  };

  const syncClockEntries = async () => {
    if (!token || !navigator.onLine) return;
    const unsynced = clockEntries.filter(e => !e.synced && e.ownerToken === token);
    for (const entry of unsynced) {
      try {
        const { data } = await axios.post(
          `${backendUrl}/api/clock`,
          { worker: entry.worker, project: entry.project, type: entry.type, time: entry.time },
          { headers: { token } }
        );
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
    <UsersContext.Provider
      value={{
        token,
        setToken,
        navigate,
        backendUrl,
        projects,
        getDailyProgress,
        setProjects,
        fetchProjects,
        newProject,
        updateProgress,
        updateProjectStatus,
        updateTaskStatus,
        workers,
        setWorkers,
        fetchWorkers,
        addWorker,
        assignWorkerToProject,
        queries,
        setQueries,
        fetchQueries,
        newQuery,
        queryStatus,
        deleteQuery,
        clockEntries,
        setClockEntries,
        createClockEntry,
        syncClockEntries,
        users,
        Progress,
        addTaskToProject,
        addMilestoneToTask,
        updateMilestoneStatus,
        updateWorkerHours,
        logout,
      }}
    >
      {children}
    </UsersContext.Provider>
  );
};

export default UserContext;
