// components/ProjectCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

export default function ProjectCard({
  item,
  percent,
  openImageModal,
  openPdfModal,
  handleAssignWorker,
  openProgressModal,
  workers,
  selectedWorkers,
  setSelectedWorkers,
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="relative bg-white/90 backdrop-blur border border-gray-200 shadow-lg hover:shadow-2xl rounded-2xl p-6 flex flex-col overflow-hidden transition-all duration-300"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-800 text-lg">{item.projectName}</h3>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            item.projectStatus === "active" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {item.projectStatus}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-1 mb-3 w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full"
          style={{ width: `${percent}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <p className="text-xs text-gray-500 mb-2">{percent}% completed</p>

      {/* Supervisor */}
      <div className="mb-3">
        <p className="font-medium text-gray-700">Supervisor</p>
        <span className="text-sm bg-purple-100 text-purple-800 rounded-full px-3 py-1 mt-1 inline-block">
          {Array.isArray(item.supervisors) ? item.supervisors.join(", ") : item.supervisors}
        </span>
      </div>

      {/* Assigned Workers */}
      <div className="mb-3">
        <p className="font-medium text-gray-700">Team</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {item.assignedWorkers?.length > 0 ? (
            item.assignedWorkers.map((w) => (
              <span
                key={w.workerId}
                className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full"
              >
                {w.name}
              </span>
            ))
          ) : (
            <p className="text-xs text-gray-400">No team assigned</p>
          )}
        </div>
      </div>

      {/* Files */}
      <div className="mb-3 flex gap-2">
        {item.images?.length > 0 && (
          <button
            onClick={() => openImageModal(item.images)}
            className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100"
          >
            <img className="w-4" src="https://img.icons8.com/color/48/image.png" alt="images" />
            {item.images.length}
          </button>
        )}
        {item.pdfs?.length > 0 && (
          <button
            onClick={() => openPdfModal(item.pdfs)}
            className="flex items-center gap-2 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium hover:bg-red-100"
          >
            <img className="w-4" src="https://img.icons8.com/ios-filled/50/pdf.png" alt="pdfs" />
            {item.pdfs.length}
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mt-auto">
        <select
          className="border border-gray-300 rounded-lg p-2 w-full text-sm focus:ring-2 focus:ring-blue-400"
          value={selectedWorkers[item._id] || ""}
          onChange={(e) =>
            setSelectedWorkers((prev) => ({ ...prev, [item._id]: e.target.value }))
          }
        >
          <option value="">Assign a worker</option>
          {workers.map((worker) => (
            <option key={worker._id} value={worker._id}>
              {worker.Name}
            </option>
          ))}
        </select>

        <button
          onClick={() => handleAssignWorker(item._id, selectedWorkers[item._id])}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
        >
          Assign
        </button>

        <button
          onClick={() => openProgressModal(item)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-all"
        >
          Update
        </button>
      </div>
    </motion.div>
  );
}
