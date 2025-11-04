import React, { useState, useContext } from "react";
import { UsersContext } from "../Context/UserContext";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";
import { User, Folder, Flag, Calendar } from "lucide-react";
import { useEffect } from "react";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
};

export default function Queries() {
  const { projects, workers, newQuery, queries, setQueries, queryStatus, deleteQuery } = useContext(UsersContext);

  const [activeStatus, setActiveStatus] = useState("All");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [allQueries, setAllQueries] = useState([])
  const [searchTerm, setSearchTerm] = useState("");
  const [role, setRole] = useState("")

  const [statusCounts, setStatusCounts] = useState({
    All: 0,
    Open: 0,
    "In progress": 0,
    Resolved: 0,
  });

  useEffect(() => {
    if (queries && queries.length > 0) {
      const counts = {
        All: queries.length,
        Open: queries.filter((q) => q.status === "Open").length,
        "In progress": queries.filter((q) => q.status === "InProgress").length,
        Resolved: queries.filter((q) => q.status === "Resolved").length,
      };
      setStatusCounts(counts);
    } else {
      setStatusCounts({ All: 0, Open: 0, Resolved: 0 });
    }
  }, [queries, activeStatus]);




  const [form, setForm] = useState({
    queryTitle: "",
    queryDescription: "",
    queryProject: "",
    queryWorker: "",
    queryPriority: "",
  });

  const priorities = ["Low Priority", "Medium Priority", "High Priority"];
  const statuses = ["All", "Open", "Resolved"];

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateQuery = async (e) => {
    e.preventDefault();
    if (
      !form.queryWorker ||
      !form.queryProject ||
      !form.queryTitle ||
      !form.queryDescription ||
      !form.queryPriority
    ) {
      alert("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const newCreatedQuery = await newQuery(
        form.queryTitle,
        form.queryDescription,
        form.queryProject,
        form.queryWorker,
        form.queryPriority
      );

      // ✅ Immediately update queries in context
      setQueries((prev) => [...prev, newCreatedQuery]);

      toast.success("✅ Query created successfully!");
      setForm({
        queryTitle: "",
        queryDescription: "",
        queryProject: "",
        queryWorker: "",
        queryPriority: "",
      });
      setShowModal(false);
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to create query. Try again!");
    } finally {
      setLoading(false);
    }
  };

const [workerName, setWorkerName] = useState("");

useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) {
    try {
      const decoded = jwtDecode(token);
      setRole(decoded.role || "");
      // Assuming token includes name or email field
      setWorkerName(decoded.name || decoded.email || ""); 
    } catch (error) {
      console.error("Invalid token");
    }
  }
}, []);

  

  const handleDelete = async (id) => {
    try {
      await deleteQuery(id);
      setQueries((prev) => prev.filter((q) => q._id !== id));
      toast.success("🗑️ Query deleted!");
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to delete query");
    }
  };



  const openModal = () => {
  setForm({
    queryTitle: "",
    queryDescription: "",
    queryProject: "",
    queryWorker: workerName, // ✅ auto from token
    queryPriority: "",
  });
  setShowModal(true);
};

  useEffect(() => {
    if (activeStatus === "All") {
      setAllQueries(queries)
    } else if (activeStatus === "Open") {
      setAllQueries(queries.filter((item) => item.status === "Open"))
    } else if (activeStatus === "In progress") {
      setAllQueries(queries.filter((item) => item.status === "InProgress"))
    } else {
      setAllQueries(queries.filter((item) => item.status === "Resolved"))
    }
  }, [activeStatus])

  return (
  <div className="min-h-screen mt-26 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-6 py-10 w-full">
    {/* Header */}
    <div className="mb-4 text-center">
      <p className="text-3xl font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
        Team Queries & Support
      </p>
      <p className="text-gray-600 mt-2 text-sm md:text-base">
        Collaborate, ask questions, and share knowledge with your team.
      </p>
    </div>

    {/* Search & Filter Bar */}
    <div className="flex flex-wrap items-center gap-3 mb-4 bg-white/60 backdrop-blur-xl p-4 rounded-2xl shadow-md border border-gray-200">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="border border-gray-300 rounded-xl px-4 py-3 w-full md:w-1/2 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
        placeholder="🔍 Search by query, project, or worker..."
      />

      <div className="flex gap-2 overflow-x-auto">
        {statuses.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveStatus(tab)}
            className={`flex items-center gap-2 px-5 py-2 rounded-full font-semibold text-sm transition-all duration-300 ${
              activeStatus === tab
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md rounded"
                : "bg-white/70 text-gray-700 hover:bg-blue-50 rounded"
            }`}
          >
            {tab}
            <span
              className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                activeStatus === tab ? "bg-white text-blue-600" : "bg-blue-100 text-blue-700"
              }`}
            >
              {statusCounts[tab] || 0}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={openModal}
        type="button"
        className="ml-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded font-semibold shadow hover:opacity-90 transition-all duration-300"
      >
        ➕ Post Query
      </button>
    </div>

    {/* Query Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-2">
      {allQueries
        .filter((query) => {
          if (!searchTerm.trim()) return true;
          const term = searchTerm.toLowerCase();
          return (
            query.queryTitle?.toLowerCase().includes(term) ||
            query.queryDescription?.toLowerCase().includes(term) ||
            query.queryProject?.toLowerCase().includes(term) ||
            query.queryWorker?.toLowerCase().includes(term)
          );
        })
        .map((query, index) => (
          <motion.div
            key={index}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="relative bg-white/80 backdrop-blur-md border border-gray-200 rounded-lg shadow-md overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

            <div className="p-6 flex flex-col gap-5">
              {/* Worker + Project */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-gray-800">
                    <User className="w-4 h-4 text-indigo-500" />
                    {query.queryWorker}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Folder className="w-4 h-4 text-gray-400" />
                    {query.queryProject}
                  </div>
                </div>

                <div className="text-xs text-gray-400 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    {new Date(query.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <span>
                    {new Date(query.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {query.queryTitle}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {query.queryDescription}
                </p>
              </div>

              {/* Status, Priority & Actions */}
              <div className="flex justify-between items-center mt-2">
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    query.status === "Resolved"
                      ? "bg-green-100 text-green-700"
                      : query.status === "In progress"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {query.status}
                </span>

                <span
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${
                    query.queryPriority === "High Priority"
                      ? "bg-red-100 text-red-700"
                      : query.queryPriority === "Medium Priority"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  <Flag className="w-3 h-3" />
                  {query.queryPriority}
                </span>

                {role !== "worker" && (
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => queryStatus(query._id, query.status)}
                      className="text-blue-600 hover:scale-110 transition-transform"
                    >
                      <img
                        className="w-5 h-5"
                        src="https://img.icons8.com/external-bearicons-glyph-bearicons/64/external-mark-call-to-action-bearicons-glyph-bearicons.png"
                        alt="mark"
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(query._id)}
                      className="text-red-500 hover:scale-110 transition-transform"
                    >
                      <img
                        className="w-5 h-5"
                        src="https://img.icons8.com/material-sharp/24/filled-trash.png"
                        alt="delete"
                      />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
    </div>

    {/* Modal (unchanged) */}
    {showModal && (
      <>
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
              onClick={() => setShowModal(false)}
            >
              ✕
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Post a New Query
            </h2>
            <form className="flex gap-4 flex-col">
              <input
                type="text"
                name="queryTitle"
                value={form.queryTitle}
                onChange={handleFieldChange}
                placeholder="Query Title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              />
              <textarea
                name="queryDescription"
                value={form.queryDescription}
                onChange={handleFieldChange}
                rows={3}
                placeholder="Describe your issue..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              />
              <select
                name="queryProject"
                value={form.queryProject}
                onChange={handleFieldChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Project</option>
                {projects.filter((item)=>item.projectStatus === "active").map((proj) => (
                  <option key={proj._id} value={proj.projectName}>
                    {proj.projectName}
                  </option>
                ))}
              </select>
              <select
                name="queryPriority"
                value={form.queryPriority}
                onChange={handleFieldChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Priority</option>
                {priorities.map((p, i) => (
                  <option key={i} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </form>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQuery}
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90"
              >
                {loading ? "Posting..." : "Post Query"}
              </button>
            </div>
          </div>
        </div>
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setShowModal(false)}
        ></div>
      </>
    )}
  </div>
);

}