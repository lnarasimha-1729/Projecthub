import React, { useState, useEffect, useContext, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Calendar component with per-day per-project progress saving.
 * 
 * - Auto-triggers backend daily progress save on mount
 * - Allows manual "Run Auto-Save" for testing
 * - Fetches per-day project progress data
 * - Falls back to localStorage if backend is missing/unavailable
 */

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  const [activitiesByDate, setActivitiesByDate] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [progressValue, setProgressValue] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [dailyProgress, setDailyProgress] = useState([]);

  const { projects = [], backendUrl, token } = useContext(UsersContext);

  // ✅ Fetch daily progress data from backend
useEffect(() => {
  const fetchDailyProgress = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/project-progress/daily-progress");
      console.log(res);
      
      setDailyProgress(res.data.data || []);
    } catch (error) {
      console.error("Error fetching daily progress:", error);
      setDailyProgress([]);
    }
  };
  fetchDailyProgress();
}, []);


  useEffect(() => {
    const fetchData = async () => {
      const data = setDailyProgress();
      setDailyProgress(data);
    };
    fetchData();
  }, []);

  console.log(dailyProgress);
  

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthNames = useMemo(
    () => [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ],
    []
  );

  const STORAGE_KEY = "projectProgressByDate_v1";

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setActivitiesByDate(JSON.parse(raw));
    } catch (err) {
      console.warn("Failed to read localStorage", err);
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activitiesByDate));
    } catch (err) {
      console.warn("Failed to save localStorage", err);
    }
  }, [activitiesByDate]);

  const dateKey = (d) => d.toDateString();

  // Fetch month data from backend
  useEffect(() => {
    let cancelled = false;
    const fetchMonthProgress = async () => {
      if (!backendUrl) return;
      try {
        setLoading(true);
        const res = await axios.get(`${backendUrl}/api/project-progress`, {
          params: { year, month: month + 1 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (cancelled) return;
        if (res?.data) {
          const newMap = {};
          (res.data || []).forEach((entry) => {
            const d = new Date(entry.date);
            const key = d.toDateString();
            newMap[key] = newMap[key] || [];
            newMap[key].push({
              _id: entry._id,
              projectId: entry.projectId,
              projectName: entry.projectName || findProjectName(entry.projectId),
              progress: entry.progress,
              note: entry.note || "",
              dateISO: entry.date,
            });
          });
          setActivitiesByDate(newMap);
        }
      } catch (err) {
        console.warn("Failed to fetch monthly progress", err);
        toast.info("Could not load progress from server — using local copy");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMonthProgress();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, backendUrl, token]);

  // 🟢 Auto-run backend daily save when Calendar mounts
  useEffect(() => {
    if (!backendUrl) return;
    const runAutoSave = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/test-auto-save`);
        if (res.status === 200) {
          // Optional: refresh calendar after auto-save
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        console.warn("Auto-save trigger failed", err);
        toast.info("Could not auto-save (server may be offline)");
      }
    };
    runAutoSave();
  }, [backendUrl]);

  // Find project name helper
  function findProjectName(projectId) {
    const p = projects.find(
      (x) =>
        String(x._id) === String(projectId) || String(x.id) === String(projectId)
    );
    return p ? p.projectName || p.name || p.title || p.Name : "Unknown Project";
  }

  // Save progress manually
  const handleSaveProgress = async () => {
    if (!selectedDate) return toast.error("Select a date first");
    if (!selectedProjectId) return toast.error("Select a project");
    const progress = Number(progressValue);
    if (isNaN(progress) || progress < 0 || progress > 100)
      return toast.error("Progress must be 0–100");

    const payload = {
      projectId: selectedProjectId,
      projectName: findProjectName(selectedProjectId),
      date: selectedDate.toISOString(),
      progress,
      note: note || "",
    };

    const key = dateKey(selectedDate);
    const newEntryLocal = {
      _id: `local-${Date.now()}`,
      projectId: payload.projectId,
      projectName: payload.projectName,
      progress: payload.progress,
      note: payload.note,
      dateISO: payload.date,
      synced: false,
    };
    setActivitiesByDate((prev) => {
      const copy = { ...(prev || {}) };
      copy[key] = copy[key] ? [...copy[key], newEntryLocal] : [newEntryLocal];
      return copy;
    });

    if (!backendUrl) {
      toast.success("Saved locally (no backend configured)");
      setProgressValue("");
      setNote("");
      setSelectedProjectId("");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${backendUrl}/api/project-progress`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const saved = res?.data;
      setActivitiesByDate((prev) => {
        const copy = { ...(prev || {}) };
        const arr = copy[key] || [];
        const filtered = arr.filter(
          (e) =>
            !(
              e.projectId === newEntryLocal.projectId &&
              e.dateISO === newEntryLocal.dateISO &&
              e._id === newEntryLocal._id
            )
        );
        const normalized = {
          _id: saved._id || saved.id || `srv-${Date.now()}`,
          projectId: saved.projectId || payload.projectId,
          projectName: saved.projectName || payload.projectName,
          progress: saved.progress ?? payload.progress,
          note: saved.note ?? payload.note,
          dateISO: saved.date || payload.date,
          synced: true,
        };
        copy[key] = [...filtered, normalized];
        return copy;
      });

      toast.success("Progress saved to server");
    } catch (err) {
      console.error("Failed to save progress to server:", err);
      toast.error("Failed to save to server — saved locally");
    } finally {
      setLoading(false);
      setProgressValue("");
      setNote("");
      setSelectedProjectId("");
    }
  };

  const handlePrevMonth = () =>
    setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () =>
    setCurrentDate(new Date(year, month + 1, 1));

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={"empty-" + i} className="p-3" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const hasEntries =
        Array.isArray(activitiesByDate[key]) && activitiesByDate[key].length > 0;

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`p-3 border rounded-lg cursor-pointer hover:bg-blue-100 transition
            ${selectedDate?.toDateString() === key ? "bg-blue-200" : ""}
            ${hasEntries ? "bg-green-50" : ""}`}
        >
          <p className="font-medium">{day}</p>
          {hasEntries && (
            <div className="mt-1 space-y-1">
              {activitiesByDate[key].slice(0, 2).map((e, idx) => (
                <div key={e._id || idx} className="text-xs text-green-700 truncate">
                  {e.projectName} — {e.progress}%{e.synced === false ? " (local)" : ""}
                </div>
              ))}
              {activitiesByDate[key].length > 2 && (
                <div className="text-xs text-gray-500">
                  +{activitiesByDate[key].length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    return days;
  };

  const handleDeleteEntry = async (entry) => {
    if (!selectedDate || !entry) return;
    const key = dateKey(selectedDate);
    setActivitiesByDate((prev) => {
      const copy = { ...(prev || {}) };
      copy[key] = (copy[key] || []).filter((e) => e._id !== entry._id);
      if (!copy[key].length) delete copy[key];
      return copy;
    });

    if (backendUrl && entry._id && !String(entry._id).startsWith("local-")) {
      try {
        await axios.delete(`${backendUrl}/api/project-progress/${entry._id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        toast.success("Deleted from server");
      } catch (err) {
        console.error("Failed deleting on server", err);
        toast.error("Failed to delete on server");
      }
    } else {
      toast.info("Deleted locally");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 mt-26">
      <ToastContainer position="top-right" autoClose={2500} />
      <div className="bg-white p-6 rounded-2xl shadow-md w-[90%] max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <button onClick={handlePrevMonth} className="text-blue-600 font-bold">←</button>
          <h2 className="text-xl font-semibold">{monthNames[month]} {year}</h2>
          <button onClick={handleNextMonth} className="text-blue-600 font-bold">→</button>
        </div>

        {/* 🟢 Manual Auto-Save Trigger */}
        {backendUrl && (
          <div className="flex justify-end mb-4">
            <button
              onClick={async () => {
                try {
                  const res = await axios.get(`${backendUrl}/api/test-auto-save`);
                  if (res.status === 200) toast.success("Manual auto-save executed!");
                } catch (err) {
                  toast.error("Manual auto-save failed");
                }
              }}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
            >
              Run Auto-Save
            </button>
          </div>
        )}

        <div className="grid grid-cols-7 gap-2 text-center font-medium text-gray-700 mb-2">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">{renderDays()}</div>

        {selectedDate && (
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-700">
              {selectedDate.toDateString()}
            </h3>

            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-2">Existing progress</div>
              {(activitiesByDate[dateKey(selectedDate)] || []).length === 0 && (
                <div className="text-sm text-gray-400">No entries yet for this date</div>
              )}
              <div className="space-y-2">
                {(activitiesByDate[dateKey(selectedDate)] || []).map((entry) => (
                  <div key={entry._id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                    <div>
                      <div className="text-sm font-semibold">{entry.projectName}</div>
                      <div className="text-xs text-gray-500">{entry.progress}% • {entry.note || "No note"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteEntry(entry)}
                        className="text-red-500 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="mt-1 w-full p-2 rounded-md border"
              >
                <option value="">— Select project —</option>
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.projectName || p.name || p.title || p.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress (%)</label>
                <input
                  value={progressValue}
                  onChange={(e) => setProgressValue(e.target.value)}
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 25"
                  className="mt-1 p-2 w-full rounded-md border"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Note</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="optional note"
                  className="mt-1 p-2 w-full rounded-md border"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProgress}
              disabled={loading}
              className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            >
              {loading ? "Saving..." : "Save Progress"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
