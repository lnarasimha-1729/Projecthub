import React, { useContext, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { motion } from "framer-motion";

export default function TopPerformer() {
  const { clockEntries } = useContext(UsersContext);

  const workerStats = useMemo(() => {
    const stats = {};
    if (!Array.isArray(clockEntries) || clockEntries.length === 0) return stats;

    const grouped = {};
    clockEntries.forEach((entry) => {
      if (!entry.worker || !entry.time) return;
      if (!grouped[entry.worker]) grouped[entry.worker] = [];
      grouped[entry.worker].push(entry);
    });

    Object.entries(grouped).forEach(([workerName, entries]) => {
      entries.sort((a, b) => new Date(a.time) - new Date(b.time));

      let totalMinutes = 0;
      let lastIn = null;
      const projectCount = {};

      entries.forEach((e) => {
        // Extract project name safely
        const projectName =
          typeof e.project === "string"
            ? e.project.trim()
            : e.project?.projectName || e.project?.name || e.project?._id || null;

        if (projectName) {
          projectCount[projectName] = (projectCount[projectName] || 0) + 1;
        }

        if (e.type === "clock-in") {
          lastIn = new Date(e.time);
        } else if (e.type === "clock-out" && lastIn) {
          const diffMins = (new Date(e.time) - lastIn) / (1000 * 60);
          if (diffMins > 0) totalMinutes += diffMins;
          lastIn = null;
        }
      });

      const hours = Math.round((totalMinutes / 60) * 100) / 100;
      const topProject =
        Object.entries(projectCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "No Projects";

      stats[workerName] = { hours, topProject };
    });

    return stats;
  }, [clockEntries]);

  const topPerformer = useMemo(() => {
    if (!workerStats || Object.keys(workerStats).length === 0) return null;
    const sorted = Object.entries(workerStats).sort(
      (a, b) => b[1].hours - a[1].hours
    );
    return { Name: sorted[0][0], ...sorted[0][1] };
  }, [workerStats]);

  if (!topPerformer)
    return (
      <div className="bg-white rounded-2xl shadow p-6 text-center">
        <p className="text-gray-500 text-sm">No performance data available</p>
      </div>
    );

  return (
    <motion.div
      className="bg-white rounded-2xl shadow p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        🏆 Top Performer
      </h2>

      <div className="flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-blue-600">
          {topPerformer.Name}
        </div>

        <div className="text-sm text-gray-600 mt-2">
          ⏱ {topPerformer.hours} hrs total
        </div>

        <div className="mt-3 text-center">
          <p className="font-semibold text-gray-800 mb-1">Top Project:</p>
          <div className="text-gray-600 text-sm">
            {topPerformer.topProject}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
