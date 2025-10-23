import React from "react";
import { motion } from "framer-motion";

const ProgressModal = ({
  progressImages,
  progressPdfs,
  handleProgressImages,
  handleProgressPdfs,
  handleProgressUpdate,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-lg w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 text-gray-700 hover:text-black text-2xl font-bold"
          onClick={onClose}
        >
          ×
        </button>

        <h3 className="text-xl font-bold mb-4">Update Project Progress</h3>

        

        {/* Upload Images */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Upload Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleProgressImages}
            className="w-full"
          />
          {progressImages.length > 0 && (
            <p className="text-sm mt-1">{progressImages.length} images selected</p>
          )}
        </div>

        {/* Upload PDFs */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Upload PDFs</label>
          <input
            type="file"
            multiple
            accept="application/pdf"
            onChange={handleProgressPdfs}
            className="w-full"
          />
          {progressPdfs.length > 0 && (
            <p className="text-sm mt-1">{progressPdfs.length} PDFs selected</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleProgressUpdate}
            className="bg-green-600 text-white px-4 py-2 rounded font-medium"
          >
            Update
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={onClose}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded font-medium"
          >
            Cancel
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ProgressModal;