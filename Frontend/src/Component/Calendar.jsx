// components/Calendar.jsx
import React, { useContext, useEffect, useState, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/**
 * Calendar that stores daily progress per active project.
 *
 * Behaviour & backend contract (assumptions):
 * - On save: sends one POST per active project to:
 *     POST `${backendUrl}/api/project-progress/daily`
 *   with body: { projectId, date: ISOString, progress }
 * - The backend is expected to create (or upsert) one document per project and
 *   store dates/progress (i.e. "two sets" => two project-documents if 2 projects).
 * - If you have a different endpoint shape, update the `saveEntryToServer` function.
 */

const Calendar = () => {
  const { projects = [], backendUrl, token } = useContext(UsersContext);

  const activeProjects = useMemo(() => projects.filter((p) => p.projectStatus === "active"), [projects]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [progressByProject, setProgressByProject] = useState({}); // { projectId: value }
  const [activitiesByDate, setActivitiesByDate] = useState({}); // { dateKey: [{ projectId, progress, _id, synced }] }
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dateKey = (d) => new Date(d).toDateString();

  // Load existing progress for this month from backend (to mark days with progress)
  useEffect(() => {
    if (!backendUrl) {
      // load localStorage fallback if present
      const localMap = {};
      activeProjects.forEach((p) => {
        const key = `project_daily_${p._id || p.id}`;
        try {
          const store = JSON.parse(localStorage.getItem(key) || "null");
          if (Array.isArray(store)) {
            store.forEach((entry) => {
              const k = dateKey(entry.date);
              localMap[k] = localMap[k] || [];
              localMap[k].push({ projectId: p._id || p.id, progress: entry.progress, _id: entry._id || null, synced: false });
            });
          }
        } catch (err) {
          // ignore parse errors
        }
      });
      setActivitiesByDate(localMap);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        // This assumes your backend supports getting month-wide progress:
        // GET `${backendUrl}/api/project-progress?year=YYYY&month=MM`
        const res = await axios.get(`${backendUrl}/api/project-progress`, {
          params: { year, month: month + 1 },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (cancelled) return;
        const newMap = {};
        (res.data || []).forEach((entry) => {
          // Expecting entries shaped like: { projectId, progress, date, _id, ... }
          const d = new Date(entry.date);
          const k = dateKey(d);
          newMap[k] = newMap[k] || [];
          newMap[k].push({
            _id: entry._id,
            projectId: entry.projectId,
            progress: entry.progress,
            synced: true,
          });
        });
        setActivitiesByDate(newMap);
      } catch (err) {
        console.warn("Failed to load monthly progress, falling back to empty map", err);
        toast.info("Could not load progress from server — calendar will show local/empty state");
        setActivitiesByDate({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, backendUrl, token, /* activeProjects intentionally omitted */]);

  // Render calendar days, marking days that have entries
  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={"empty-" + i} className="p-2" />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const key = dateKey(dateObj);
      const hasEntries = Array.isArray(activitiesByDate[key]) && activitiesByDate[key].length > 0;

      days.push(
        <div
          key={d}
          onClick={() => openDayEditor(dateObj)}
          className={`p-2 text-center border rounded-md hover:bg-blue-50 cursor-pointer relative ${
            selectedDate && dateKey(selectedDate) === key ? "bg-blue-100" : ""
          }`}
        >
          <div className="font-medium">{d}</div>
          {hasEntries && <div className="absolute bottom-1 left-1 right-1 text-[10px] text-green-700">● {activitiesByDate[key].length}</div>}
        </div>
      );
    }
    return days;
  };

  const openDayEditor = (dateObj) => {
    setSelectedDate(dateObj);
    // initialize inputs for each active project (if there's an existing entry, prefill)
    const key = dateKey(dateObj);
    const existing = activitiesByDate[key] || [];
    const map = {};
    activeProjects.forEach((p) => {
      const pid = p._id || p.id;
      const found = existing.find((e) => String(e.projectId) === String(pid));
      map[pid] = found ? found.progress : "";
    });
    setProgressByProject(map);
  };

  const closeDayEditor = () => {
    setSelectedDate(null);
    setProgressByProject({});
  };

  // Save single project's entry to server (or to localStorage fallback)
  const saveEntryToServer = async ({ projectId, dateISO, progress }) => {
    if (!backendUrl) {
      // fallback to localStorage: store array under project_daily_<projectId>
      try {
        const key = `project_daily_${projectId}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const foundIndex = existing.findIndex((e) => new Date(e.date).toDateString() === new Date(dateISO).toDateString());
        if (foundIndex >= 0) {
          existing[foundIndex].progress = progress;
          existing[foundIndex].date = dateISO;
        } else {
          existing.push({ _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: dateISO, progress });
        }
        localStorage.setItem(key, JSON.stringify(existing));
        return { ok: true, local: true };
      } catch (err) {
        return { ok: false, error: err };
      }
    }

    try {
      // Primary assumption: backend accepts a POST to save a single daily entry for a project.
      // Adjust the URL & payload if your backend expects a different shape.
      const res = await axios.post(
        `${backendUrl}/api/project-progress/daily`,
        { projectId, date: dateISO, progress },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return { ok: true, data: res.data };
    } catch (err) {
      console.error("Failed saving entry to server", err);
      return { ok: false, error: err };
    }
  };

  // Handle Save for the selected date — will issue one request per active project that has a numeric progress value
  const handleSaveDaily = async () => {
    if (!selectedDate) return toast.error("Select a date first");
    const dateISO = selectedDate.toISOString();

    // gather entries to save: only include projects with a numeric progress value
    const entriesToSave = activeProjects
      .map((p) => {
        const pid = p._id || p.id;
        const raw = progressByProject[pid];
        const progress = raw === "" || raw === null || raw === undefined ? null : Number(raw);
        if (progress === null || Number.isNaN(progress) || progress < 0 || progress > 100) {
          return null;
        }
        return { projectId: pid, projectName: p.projectName || p.name || "Untitled", progress };
      })
      .filter(Boolean);

    if (entriesToSave.length === 0) {
      toast.info("No valid progress entered for active projects");
      return;
    }

    setLoading(true);
    try {
      // send one request per project (this creates/updates one project document each on backend)
      const results = await Promise.all(
        entriesToSave.map((e) => saveEntryToServer({ projectId: e.projectId, dateISO, progress: e.progress }))
      );

      // optimistic update local map based on successful saves
      setActivitiesByDate((prev) => {
        const copy = { ...(prev || {}) };
        const k = dateKey(selectedDate);
        copy[k] = copy[k] || [];

        entriesToSave.forEach((entry, idx) => {
          const res = results[idx];
          const existingIndex = copy[k].findIndex((x) => String(x.projectId) === String(entry.projectId));
          const newRecord = {
            _id: res.ok && res.data && res.data._id ? res.data._id : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            projectId: entry.projectId,
            progress: entry.progress,
            synced: res.ok && !res.local,
          };
          if (existingIndex >= 0) {
            copy[k][existingIndex] = newRecord;
          } else {
            copy[k].push(newRecord);
          }
        });

        return copy;
      });

      // show results / errors
      const failed = results.filter((r) => !r.ok);
      if (failed.length === 0) {
        toast.success("Saved daily progress for active projects");
      } else {
        toast.warn(`${failed.length} of ${results.length} saves failed — saved remaining locally`);
      }
    } finally {
      setLoading(false);
      closeDayEditor();
    }
  };

  // Delete a project's entry for the selected date (local UI + server delete if applicable)
  const handleDeleteProjectEntry = async (projectId) => {
    if (!selectedDate) return;
    const k = dateKey(selectedDate);

    // optimistic UI remove
    setActivitiesByDate((prev) => {
      const copy = { ...(prev || {}) };
      copy[k] = (copy[k] || []).filter((e) => String(e.projectId) !== String(projectId));
      if (!copy[k].length) delete copy[k];
      return copy;
    });

    if (!backendUrl) {
      // remove from localStorage fallback
      try {
        const key = `project_daily_${projectId}`;
        const existing = JSON.parse(localStorage.getItem(key) || "[]");
        const filtered = existing.filter((e) => new Date(e.date).toDateString() !== selectedDate.toDateString());
        localStorage.setItem(key, JSON.stringify(filtered));
        toast.info("Deleted local entry");
      } catch (err) {
        toast.error("Failed deleting local entry");
      }
      return;
    }

    try {
      // Attempt to delete on server (assumes DELETE /api/project-progress/:projectId?date=ISO )
      await axios.delete(`${backendUrl}/api/project-progress/${projectId}`, {
        params: { date: selectedDate.toISOString() },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      toast.success("Deleted on server");
    } catch (err) {
      console.warn("Server delete failed", err);
      toast.warn("Failed to delete on server (it may be removed locally)");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-6 mt-28">
      <ToastContainer position="top-right" autoClose={2500} />
      <div className="bg-white p-4 rounded-2xl shadow-md w-[95%] max-w-md">
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="text-blue-600 font-bold text-sm">
            ←
          </button>
          <h2 className="text-lg font-semibold">
            {monthNames[month]} {year}
          </h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="text-blue-600 font-bold text-sm">
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center font-medium text-gray-700 mb-2 text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
      </div>

      {/* Day editor modal */}
      {selectedDate && (
        <div className="fixed inset-0 z-30 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black opacity-30" onClick={closeDayEditor} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-lg p-4 z-40">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-semibold">
                {selectedDate.toDateString()}
              </h3>
              <button onClick={closeDayEditor} className="text-gray-500">Close</button>
            </div>

            <div className="space-y-3 max-h-72 overflow-auto">
              {activeProjects.length === 0 && <div className="text-sm text-gray-500">No active projects available.</div>}

              {activeProjects.map((p) => {
                const pid = p._id || p.id;
                return (
                  <div key={pid} className="flex items-center justify-between gap-3 border p-2 rounded-md">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{p.projectName || p.name || "Untitled Project"}</div>
                      <div className="text-xs text-gray-500">Budget: {p.projectbudget ?? "—"}</div>
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={progressByProject[pid] ?? ""}
                        onChange={(e) => setProgressByProject((s) => ({ ...s, [pid]: e.target.value }))}
                        placeholder="0-100"
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <div className="w-12">
                      <button
                        onClick={() => handleDeleteProjectEntry(pid)}
                        className="text-red-500 text-xs"
                        title="Delete entry for this project on this date"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeDayEditor} className="px-3 py-1 rounded border text-sm">Cancel</button>
              <button
                onClick={handleSaveDaily}
                disabled={loading}
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm disabled:opacity-60"
              >
                {loading ? "Saving..." : "Save All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
