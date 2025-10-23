import React from 'react';
import { motion } from 'framer-motion';

const ProjectModal = ({
  totalSupervisors = [],
  formData = {},
  handleChange = () => { },
  handleImageUpload = () => { },
  handlePDFUpload = () => { },
  handleSubmit = () => { },
  loading = false,
  onClose = () => { },
}) => (

  <div
    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-auto"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative bg-white backdrop-blur-2xl border border-white/30 shadow-xl rounded-3xl p-8 w-2xl max-h-[100vh] overflow-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-6">
        <p className="text-2xl text-black font-bold">
          Create New Project
        </p>
        <button onClick={onClose} disabled={loading} className="text-black hover:text-white text-2xl font-bold">
          X
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        <div className='flex justify-between gap-2'>
        <div className='flex flex-col gap-2 w-1/2'>
          <label className='text-sm font-semibold'>Project Name</label>
        <input className='w-full py-1.5 px-2 rounded-lg border-1 border-gray-300' label="Project Name" name="projectName" value={formData.projectName} onChange={handleChange} />
        </div>

        <div className='flex flex-col gap-2 w-1/2'>
          <label className='text-sm font-semibold'>Project Description</label>
        <textarea className='w-full h-10 py-1.5 px-2 rounded-lg border-1 border-gray-300' label="Description" name="projectDescription" value={formData.projectDescription} onChange={handleChange} />
        </div>
        </div>

        <div className='flex justify-between gap-2'>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-semibold mb-2 text-black">Assign Supervisor</label>
          <select
            name="supervisors"
            value={formData.supervisors}
            onChange={handleChange}
            className="border px-2 py-1.5 rounded-lg text-black"
          >
            <option value="">Select Supervisor</option>
            {totalSupervisors.map((sup) => (
              <option key={sup._id} value={sup.Name}>
                {sup.Name}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-2 w-1/2'>
          <label className='text-sm font-semibold'>Project Budget</label>
        <input
        className="text-black w-full px-2 py-1.5 rounded-lg border-1 border-gray-300"
          label="Budget Allocation"
          type="number"
          name="projectbudget"
          value={formData.projectbudget}
          onChange={handleChange}
          placeholder="Allocate budget for project..."
        />
        </div>
        </div>

        <div className='flex justify-between gap-2'>
        <div className="flex flex-col w-1/2">
          <label className="text-sm font-semibold mb-2 text-black">Upload Images</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleImageUpload(Array.from(e.target.files))}
            className="border px-2 py-1.5 rounded-lg text-black file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-400 file:text-black hover:cursor-pointer cursor-pointer"
          />
        </div>

        <div className="flex flex-col w-1/2">
  <label className="text-sm font-semibold mb-2 text-black">Upload PDFs</label>
  <input
    type="file"
    multiple
    accept="application/pdf"
    onChange={(e) => handlePDFUpload(Array.from(e.target.files))}
    className="border px-2 py-1.5 rounded-lg text-black file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-400 file:shadow-lg file:text-black cursor-pointer"
  />
</div>
</div>
        {/* Status */}
        <div>
          <label className="text-sm font-semibold mb-2 text-black">Status</label>
          <div className="flex gap-4">
            {["active", "completed", "hold"].map((s) => (
              <label
                key={s}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer border transition-all duration-300 ${formData.projectStatus === s
                    ? "bg-green-700 text-white"
                    : "border-white/30 bg-white/5 hover:bg-white/10 text-black text-sm"
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
                <span className="">{s}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          whileHover={{ scale: 1.05 }}
          disabled={loading}
          type="submit"
          className="w-full py-2 rounded text-white font-semibold bg-gradient-to-r from-blue-500 to-purple-600"
        >
          {loading ? "Creating..." : "Create Project 🚀"}
        </button>
      </form>
    </motion.div>
  </div>
);

const Input = ({ label, ...props }) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold mb-2 text-white/90">{label}</label>
    <input
      {...props}
      className="border px-4 py-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-400"
    />
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div className="flex flex-col">
    <label className="text-sm font-semibold mb-2 text-white/90">{label}</label>
    <textarea
      {...props}
      className="border px-4 py-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-purple-400"
      rows={3}
    />
  </div>
);

export default ProjectModal;