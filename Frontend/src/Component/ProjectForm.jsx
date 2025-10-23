import React, { useContext, useState, useEffect } from "react";
import { UsersContext } from "../Context/UserContext";
import { toast, ToastContainer } from "react-toastify";
import Donut from "./Donut";
import Team_Allocation from "./Team_Allocation";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import ProjectModal from "./ProjectModal";
import TaskModal from "./TaskModal";
import { motion } from "framer-motion";
import ProgressModal from "./ProgressModal";

const Projects = () => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [imageModal, setImageModal] = useState({ open: false, files: [], index: 0 });
  const [pdfModal, setPdfModal] = useState({ open: false, files: [], index: 0 });
  const [formData, setFormData] = useState({
    projectName: "",
    projectDescription: "",
    supervisors: "",
    projectStatus: "",
    projectbudget: 0,
    images: [],
    pdf: null,
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState({});
  const [progressValue, setProgressValue] = useState(0);
  const [progressImages, setProgressImages] = useState([]);
  const [progressPdfs, setProgressPdfs] = useState([]);
  const [progressModal, setProgressModal] = useState({ open: false, project: null });
  const [role, setRole] = useState("user");
  const [userId, setUserId] = useState(null);

  const {
    newProject,
    projects,
    updateProgress,
    addTaskToProject,
    workers,
    assignWorkerToProject,
    backendUrl,
    fetchProjects,
  } = useContext(UsersContext);

  const baseUrl = backendUrl || "http://localhost:4000";
  const totalWorkers = (workers || []).filter((w) => w.workerType === "Worker");
  const totalSupervisors = (workers || []).filter((w) => w.workerType === "Supervisor");

  // Decode token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setRole(decoded.role || "user");
        setUserId(decoded.email?.split("@")[0].split(".")[0] || null);
      } catch (err) {
        console.error("Invalid token", err);
      }
    }
  }, []);

  // --- Modal Handlers ---
  const openImageModal = (images = [], index = 0) =>
    setImageModal({ open: true, files: Array.isArray(images) ? images : [], index });
  const closeImageModal = () => setImageModal({ open: false, files: [], index: 0 });

  const openPdfModal = (pdfs = [], index = 0) =>
    setPdfModal({ open: true, files: Array.isArray(pdfs) ? pdfs : [], index });
  const closePdfModal = () => setPdfModal({ open: false, files: [], index: 0 });

  // --- Filter projects based on role ---
  const filteredProjects = (projects || []).filter((p) => {
    if (role === "admin") return true;
    if (role === "supervisor") {
      if (Array.isArray(p.supervisors)) return p.supervisors.includes(userId);
      return p.supervisors === userId;
    }
    if (role === "worker") {
      if (Array.isArray(p.assignedWorkers))
        return p.assignedWorkers.some(
          (w) => w._id === userId || w.Name?.toLowerCase() === userId?.toLowerCase()
        );
    }
    return false;
  });

  const activeProjects = filteredProjects.filter(
    (p) => p.projectStatus === "active" || p.projectStatus === "completed"
  );
  const onHoldProjects = filteredProjects.filter((p) => p.projectStatus === "hold");

  // --- Input Handlers ---
  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleImageUpload = (e) =>
    setFormData((prev) => ({ ...prev, images: Array.from(e.target.files || []) }));
  const handlePDFUpload = (e) =>
    setFormData((prev) => ({ ...prev, pdf: e.target.files[0] || null }));

  // --- Create Project ---
  const handleCreateProject = async (e) => {
  e.preventDefault();

  if (
    !formData.projectName ||
    !formData.projectStatus ||
    !formData.supervisors
  ) {
    toast.error("Please enter project name, select status, and assign a supervisor!");
    return;
  }

  setLoading(true);
  try {
    const data = new FormData();
    data.append("projectName", formData.projectName);
    data.append("projectDescription", formData.projectDescription);
    data.append("projectStatus", formData.projectStatus);
    data.append("projectbudget", formData.projectbudget);
    data.append("supervisors", JSON.stringify(formData.supervisors)); // or formData.supervisors if string

    // Append images (if any)
    if (formData.images && formData.images.length > 0) {
      formData.images.forEach((img) => data.append("images", img));
    }

    // Append PDFs (if any)
    if (formData.pdf) {
      data.append("pdfs", formData.pdf);
    }

    await newProject(data);

    toast.success("✅ Project created successfully!");
    setShowModal(false);

    // Reset form
    setFormData({
      projectName: "",
      projectDescription: "",
      projectStatus: "",
      projectbudget: 0,
      supervisors: "",
      images: [],
      pdf: null,
    });

    if (fetchProjects) await fetchProjects();
  } catch (err) {
    console.error("❌ Error creating project:", err);
    toast.error("❌ Failed to create project. Try again!");
  } finally {
    setLoading(false);
  }
};


  // --- Progress Modal Handlers ---
  const openProgressModal = (project) => {
    setProgressModal({ open: true, project });
    setProgressValue(project.progress || 0);
    setProgressImages([]);
    setProgressPdfs([]);
  };

  const handleProgressImages = (e) => setProgressImages(Array.from(e.target.files || []));
  const handleProgressPdfs = (e) => setProgressPdfs(Array.from(e.target.files || []));
  const handleProgressUpdate = async () => {
    const id = progressModal.project?._id;
    if (!id) return toast.error("❌ Project ID not found!");
    try {
      setLoading(true);
      const data = new FormData();
      data.append("progress", progressValue);
      [...progressImages, ...progressPdfs].forEach((file) => data.append("files", file));
      await updateProgress(id, data);
      toast.success("✅ Progress & files uploaded successfully!");
      setProgressModal({ open: false, project: null });
      setProgressImages([]);
      setProgressPdfs([]);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to update progress!");
    } finally {
      setLoading(false);
    }
  };

  // --- Assign Worker ---
  const handleAssignWorker = async (projectId, workerId) => {
    if (!workerId) return toast.error("❌ Please select a worker first!");
    const workerName = workers.find((w) => w._id === workerId)?.Name || "";
    try {
      await assignWorkerToProject(projectId, workerId);
      toast.success(`✅ ${workerName} assigned to project!`);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to assign worker. Try again!");
    }
  };

  // Add this function inside Projects.jsx
const handleTaskCheckProgress = async (projectId, progress) => {
  try {
    setLoading(true);
    const data = new FormData();
    data.append("progress", progress);
    await updateProgress(projectId, data); // Backend API call
    toast.success(`✅ Progress updated to ${progress}%`);
    fetchProjects(); // Refresh projects to reflect updated progress
  } catch (err) {
    console.error(err);
    toast.error("❌ Failed to update progress!");
  } finally {
    setLoading(false);
  }
};


  // --- Helpers ---
  const fileNameOf = (file) => {
    if (!file) return "";
    if (typeof file === "string") return file;
    return file.fileName || file.filename || file.name || "";
  };
  const uploaderOf = (file) => {
    if (!file) return "Unknown";
    if (typeof file === "string") return "Unknown";
    return file.uploader || file.uploadedBy || file.uploaderName || "Unknown";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-100 px-8 pb-12 mt-30 w-full">
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />

      {/* HEADER */}
      <div className="flex justify-between items-center pt-12">
        <div>
          <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
            Project Dashboard
          </p>
          <p className="text-gray-600 font-medium mt-2">
            Manage and visualize all your projects beautifully
          </p>
        </div>
        {role === "admin" && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded"
          >
            + New Project
          </motion.button>
        )}
      </div>

      <div className="mt-4">
        {activeProjects.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {activeProjects.map((item) => (
              <motion.div
                key={item._id}
                whileHover={{ scale: 1.05, rotateY: 5 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="relative z-0 bg-white border rounded-2xl shadow-xl hover:shadow-2xl p-6 flex flex-col overflow-hidden"
              >
                <div className="absolute bg-gradient-to-br from-purple-100/40 via-blue-100/30 to-pink-100/30 opacity-60 rounded-3xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center justify-between w-full">
                      <div className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                        <img src="https://img.icons8.com/fluency-systems-regular/24/228BE6/project.png" alt="project" />
                        <p className="text-black font-bold truncate mt-3">{item.projectName}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full shadow-inner transition-colors ${
                            item.projectStatus === "completed"
                              ? "bg-green-200 text-green-800"
                              : item.projectStatus === "active"
                              ? "bg-yellow-200 text-yellow-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {item.projectStatus}
                        </span>
                        <motion.img
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-8 mt-2 cursor-pointer"
                          src="https://img.icons8.com/fluency/48/tasklist--v1.png"
                          alt="tasklist"
                          onClick={() => { setSelectedProject(item); setShowTaskModal(true); }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-3 leading-relaxed line-clamp-3">{item.projectDescription}</p>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all" style={{ width: `${item.progress || 0}%` }}></div>
                  </div>
                  <p className="text-sm text-gray-700 mb-4 font-medium">Progress: {item.progress || 0}%</p>

                  <div className="mb-4">
                    <p className="font-semibold text-gray-700 mb-2">Supervisor:</p>
                    {item.supervisors ? (
                      <motion.span whileHover={{ scale: 1.05 }} className="bg-gradient-to-r from-purple-200 to-purple-300 text-purple-800 text-sm font-medium px-3 py-1 rounded-full shadow">
                        {Array.isArray(item.supervisors) ? item.supervisors.join(", ") : item.supervisors}
                      </motion.span>
                    ) : <p className="text-sm text-gray-400">No supervisor assigned</p>}
                  </div>

                  <div className="mb-4">
                    <p className="font-semibold text-gray-700 mb-2">Assigned Team:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.assignedWorkers?.length > 0 ? (
                        item.assignedWorkers.map((w) => (
                          <motion.span key={w._id} whileHover={{ scale: 1.1 }} className="bg-gradient-to-r from-blue-200 to-blue-300 text-blue-800 text-sm font-medium px-3 py-1 rounded-full shadow">{w.Name}</motion.span>
                        ))
                      ) : <p className="text-sm text-gray-400">No workers assigned</p>}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="font-semibold text-gray-700 mb-2">Files:</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(item.images) && item.images.length > 0) && (
                        <motion.button
                          onClick={() => openImageModal(item.images)}
                          className="flex items-center px-3 py-1 bg-blue-200 text-blue-800 rounded shadow"
                        >
                          <img className="w-8" src="https://img.icons8.com/color/50/google-images.png" alt="google-images" />
                          <span>({item.images.length})</span>
                        </motion.button>
                      )}
                      {(Array.isArray(item.pdfs) && item.pdfs.length > 0) && (
                        <motion.button
                          onClick={() => openPdfModal(item.pdfs)}
                          className="flex items-center px-3 py-1 bg-blue-200 text-blue-800 rounded shadow"
                        >
                          <img className="w-8" src="https://img.icons8.com/ultraviolet/40/pdf-2.png" alt="pdf-2" />
                          <span>({item.pdfs.length})</span>
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-auto">
                    <select
                      className="border border-gray-300 rounded-xl p-2 w-full text-sm focus:ring-2 focus:ring-blue-400"
                      value={selectedWorkers[item._id] || ""}
                      onChange={(e) => setSelectedWorkers(prev => ({ ...prev, [item._id]: e.target.value }))}
                    >
                      <option value="">Assign a worker</option>
                      {totalWorkers.map((worker) => <option key={worker._id} value={worker._id}>{worker.Name}</option>)}
                    </select>
                    <motion.button whileHover={{ scale: 1.05 }} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-indigo-500 hover:to-blue-600 text-white px-4 py-2 rounded-xl font-medium shadow-md" onClick={() => handleAssignWorker(item._id, selectedWorkers[item._id])}>Assign</motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} onClick={() => openProgressModal(item)} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-500 text-white px-4 py-2 rounded-xl font-medium shadow-md">Update</motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="mt-20 flex flex-col items-center justify-center text-center px-4 sm:px-0">
            {role === "admin" ? (
              <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 sm:p-12 max-w-md">
                <h3 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-4">No Projects Yet</h3>
                <p className="text-gray-500 dark:text-gray-300 mb-6">Start your first project and manage it beautifully!</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowModal(true)}
                  className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  + Create Project
                </motion.button>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 sm:p-12 shadow-md max-w-md">
                <p className="text-gray-600 dark:text-gray-300 text-xl font-semibold">
                  You have not been assigned any project.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ON HOLD PROJECTS */}
      <section className="mt-10">
        <h2 className="text-xl font-bold text-gray-700 mb-2">On Hold Projects</h2>
        {onHoldProjects.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {onHoldProjects.map((project) => (
              <div
                key={project._id}
                className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg shadow-sm"
              >
                <h3 className="font-semibold text-lg text-yellow-800">{project.projectName}</h3>
                <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                  {project.projectDescription}
                </p>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEditProject(project)}
                    className="px-3 py-1 text-sm bg-yellow-500 text-white rounded"
                  >
                    Resume / Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic mt-4">No projects on hold.</p>
        )}
      </section>

      {/* STATS */}
      <div className="flex gap-4 mt-6">
        <Donut active={activeProjects} onHold={onHoldProjects} />
        <Team_Allocation projects={activeProjects} />
      </div>

      {/* MODALS */}
      {showModal && (
        <ProjectModal
          show={showModal}
          onClose={() => setShowModal(false)}
          formData={formData}
          handleChange={handleChange}
          handleImageUpload={handleImageUpload}
          handlePDFUpload={handlePDFUpload}
          handleCreateProject={handleCreateProject}
          loading={loading}
          totalSupervisors={totalSupervisors}
        />
      )}

      {showTaskModal && (
  <TaskModal
    show={showTaskModal}
    onClose={() => {
      setShowTaskModal(false);
      setSelectedProject(null);
    }}
    projectName={selectedProject?.projectName}
    projectId={selectedProject?._id}
    onProgressChange={handleTaskCheckProgress}
    role={role} // pass role here
  />
)}



      {/* IMAGE MODAL */}
      {imageModal.open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div
            className="relative bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-700 hover:text-black text-2xl font-bold"
              onClick={closeImageModal}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">
              Images ({imageModal.files.length})
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {imageModal.files.map((file, idx) => {
                const name = fileNameOf(file);
                const uploader = uploaderOf(file);
                return (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 flex flex-col items-center text-center"
                  >
                    <div className="w-full h-36 mb-2 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                      <img
                        src={`${baseUrl}/uploads/${name}`}
                        alt={name}
                        className="object-contain max-h-full"
                      />
                    </div>
                    <div className="text-sm font-medium truncate w-full" title={name}>
                      {name || "Unnamed"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      By: {uploader || "Unknown"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PDF MODAL */}
      {pdfModal.open && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={closePdfModal}
        >
          <div
            className="relative bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-700 hover:text-black text-2xl font-bold"
              onClick={closePdfModal}
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-4">
              PDFs ({pdfModal.files.length})
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {pdfModal.files.map((file, idx) => {
                const name = fileNameOf(file);
                const uploader = uploaderOf(file);
                return (
                  <div
                    key={idx}
                    className="border rounded-lg p-3 flex flex-col items-center text-center"
                  >
                    <div className="w-full h-36 mb-2 flex items-center justify-center bg-gray-50 rounded">
                      <a
                        href={`${baseUrl}/uploads/${name}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center"
                      >
                        <img
                          src="https://img.icons8.com/ios/48/000000/pdf.png"
                          alt="pdf"
                          className="mb-2"
                        />
                        <span className="text-xs underline">Open PDF</span>
                      </a>
                    </div>
                    <div className="text-sm font-medium truncate w-full" title={name}>
                      {name || "Unnamed"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      By: {uploader || "Unknown"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS MODAL */}
      {progressModal.open && (
        <ProgressModal
          type="progress"
          progressImages={progressImages}
          progressPdfs={progressPdfs}
          handleProgressImages={handleProgressImages}
          handleProgressPdfs={handleProgressPdfs}
          handleProgressUpdate={handleProgressUpdate}
          onClose={() => setProgressModal({ open: false, project: null })}
        />
      )}
    </div>
  );
};

export default Projects;