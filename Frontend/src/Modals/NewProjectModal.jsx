import React from "react";
import { motion } from "framer-motion";

const ProjectModal = ({
  totalSupervisors = [],
  formData = {},
  handleChange = () => {},
  handleImageUpload = () => {},
  handlePDFUpload = () => {},
  handleSubmit = () => {},
  loading = false,
  onClose = () => {},
}) => (
  <div
    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="
        relative 
        bg-white 
        backdrop-blur-xl 
        border border-gray-200 
        shadow-2xl 
        rounded-3xl 
        w-[80%] 
        max-w-3xl 
        max-h-[90vh] 
        overflow-auto 
        p-6 md:p-8
      "
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <p className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">
          Create New Project
        </p>
        <button
          onClick={onClose}
          disabled={loading}
          className="text-gray-700 hover:text-white hover:bg-red-500 rounded-full w-8 h-8 flex items-center justify-center font-bold transition-all"
        >
          ✕
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
        {/* Row 1 */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <label className="text-sm font-semibold text-gray-700">
              Project Name
            </label>
            <input
              name="projectName"
              placeholder="Enter project name..."
              value={formData.projectName}
              onChange={handleChange}
              className="
                w-full md:h-9 border border-gray-300 
                rounded-lg px-2 py-1 
                text-sm md:text-sm 
                placeholder:text-sm placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-200
              "
            />
          </div>

          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <label className="text-sm font-semibold text-gray-700">
              Project Description
            </label>
            <textarea
              name="projectDescription"
              placeholder="Enter project description..."
              value={formData.projectDescription}
              onChange={handleChange}
              className="
                w-full md:h-9 border border-gray-300 
                rounded-lg px-2 lg:py-1.5 md:py-1 
                h-10 resize-none 
                text-sm md:text-sm
                placeholder:text-sm placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-200
              "
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <label className="text-sm font-semibold text-gray-700">
              Assign Supervisor
            </label>
            <select
              name="supervisors"
              value={formData.supervisors}
              onChange={handleChange}
              className="
                w-full md:h-9 border border-gray-300 
                rounded-md px-2 py-1 
                text-xs md:text-sm 
                bg-white text-gray-800
                focus:outline-none focus:ring-1 focus:ring-blue-300
              "
            >
              <option value="" disabled className="text-gray-400 text-xs">
                Select Supervisor
              </option>
              {totalSupervisors.map((sup) => (
                <option
                  key={sup._id}
                  value={sup.Name}
                  className="text-xs md:text-sm text-gray-800"
                >
                  {sup.Name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <label className="text-sm font-semibold text-gray-700">
              Project Budget
            </label>
            <input
              type="number"
              name="projectbudget"
              value={formData.projectbudget}
              onChange={handleChange}
              placeholder="Allocate budget..."
              className="
                w-full md:h-9 border border-gray-300 
                rounded-lg px-2 py-1 
                text-sm md:text-sm 
                placeholder:text-xs placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-200
              "
            />
          </div>
        </div>

        {/* Row 3 */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <label className="text-sm font-semibold text-gray-700">
              Upload Images
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleImageUpload(Array.from(e.target.files))}
              className="
                border border-gray-300 px-2 py-1 
                rounded-lg text-black text-sm 
                file:mr-4 file:py-1 file:px-3 
                file:rounded-lg file:border-0 
                file:bg-gray-200 file:text-gray-700 
                hover:file:bg-gray-300 cursor-pointer
              "
            />
          </div>

          <div className="flex flex-col gap-2 w-full md:w-1/2">
            <label className="text-sm font-semibold text-gray-700">
              Upload PDFs
            </label>
            <input
              type="file"
              multiple
              accept="application/pdf"
              onChange={(e) => handlePDFUpload(Array.from(e.target.files))}
              className="
                border border-gray-300 px-2 py-1 
                rounded-lg text-black text-sm 
                file:mr-4 file:py-1 file:px-3 
                file:rounded-lg file:border-0 
                file:bg-gray-200 file:text-gray-700 
                hover:file:bg-gray-300 cursor-pointer
              "
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">
            Project Status
          </label>
          <div className="flex flex-wrap gap-3">
            {["active", "completed", "hold"].map((s) => (
              <label
                key={s}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition-all duration-300
                  ${
                    formData.projectStatus === s
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
              >
                <input
                  type="radio"
                  name="projectStatus"
                  value={s}
                  checked={formData.projectStatus === s}
                  onChange={handleChange}
                  className="hidden"
                />
                <span className="capitalize text-sm">{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          disabled={loading}
          type="submit"
          className="
            w-full py-2 
            rounded font-semibold text-white 
            bg-gradient-to-r from-blue-500 to-purple-600
            shadow-md hover:shadow-lg
            transition-all
          "
        >
          {loading ? "Creating..." : "Create Project"}
        </motion.button>
      </form>
    </motion.div>
  </div>
);

export default ProjectModal;
