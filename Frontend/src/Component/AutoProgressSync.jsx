import React, { useEffect, useContext, useState } from "react";
import axios from "axios";
import { UsersContext } from "../Context/UserContext";

// Utility: get current date string in IST ("YYYY-MM-DD")
function getISTDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).formatToParts(new Date());
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  return `${year}-${month}-${day}`;
}

export default function AutoProgressSync() {
  const { projects } = useContext(UsersContext);
  const [lastSync, setLastSync] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState("");

  // 🔹 Function to send daily progress to backend
  const sendDailyProgress = async () => {
    if (!projects || projects.length === 0) {
      console.warn("No projects found in context");
      return;
    }

    const today = getISTDateString();
    const payload = projects.map((p) => ({
      projectId: p._id,
      projectName: p.projectName,
      date: today,
      progress: p.progress ?? 0,
    }));

    try {
      setIsSyncing(true);
      setStatus("Syncing...");
      const res = await axios.post("http://localhost:4000/api/progress/snapshot", payload);
      setStatus(`Synced successfully on ${today}`);
      setLastSync(today);
      console.log("Progress sync response:", res.data);
    } catch (err) {
      console.error("Error syncing progress:", err);
      setStatus("Error syncing data");
    } finally {
      setIsSyncing(false);
    }
  };

  // 🔹 Automatically run once per day (IST)
  useEffect(() => {
    const today = getISTDateString();
    const lastSyncLocal = localStorage.getItem("lastSyncDate");

    // Run only if it hasn't run today
    if (lastSyncLocal !== today) {
      sendDailyProgress();
      localStorage.setItem("lastSyncDate", today);
    }

    // Schedule next run at IST midnight
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const nextMidnightIST = new Date(istNow);
    nextMidnightIST.setDate(istNow.getDate() + 1);
    nextMidnightIST.setHours(0, 0, 0, 0);
    const delay = nextMidnightIST.getTime() - istNow.getTime();

    const timer = setTimeout(() => {
      sendDailyProgress();
    }, delay);

    return () => clearTimeout(timer);
  }, [projects]);

  return (
    <div className="p-4 bg-gray-50 rounded-xl border mt-4">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">
        Daily Project Progress Sync
      </h3>
      <p className="text-sm text-gray-600 mb-3">
        Automatically saves all project progress to backend every midnight (IST).
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={sendDailyProgress}
          disabled={isSyncing}
          className={`px-4 py-2 rounded-lg text-white ${
            isSyncing ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
        {lastSync && (
          <span className="text-sm text-gray-500">
            Last synced: {lastSync}
          </span>
        )}
      </div>
      {status && (
        <div className="text-sm mt-2 text-gray-700 font-medium">{status}</div>
      )}
    </div>
  );
}
