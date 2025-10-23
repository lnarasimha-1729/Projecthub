import React, { useState, useContext } from "react";
import { UsersContext } from "../Context/UserContext";
import { toast } from "react-toastify"; // ✅ import toast
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
      setStatusCounts({ All: 0, Open: 0, "In progress": 0, Resolved: 0 });
    }
  }, [queries, activeStatus]);


console.log(queries);




  const [form, setForm] = useState({
    queryTitle: "",
    queryDescription: "",
    queryProject: "",
    queryWorker: "",
    queryPriority: "",
  });

  const priorities = ["Low Priority", "Medium Priority", "High Priority"];
  const statuses = ["All", "Open", "In progress", "Resolved"];

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

  const token = localStorage.getItem("token");
  let role = "user";

  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role;
    } catch (error) {
      console.error("Invalid token");
    }
  }

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

  console.log(role);



  const openModal = () => {
    setForm({
      queryTitle: "",
      queryDescription: "",
      queryProject: "",
      queryWorker: "",
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

  console.log(allQueries);





  return (
    <div className="bg-gray-100 min-h-screen mt-26 p-6 w-full">
      <div className="mb-8">
        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-1">
          Team Queries & Support
        </p>
        <p className="mb-6 text-gray-600">
          Collaborate, ask questions, and share knowledge with your team
        </p>
      </div>

      {/* Search and tabs */}
      <div className="flex items-center gap-3 mb-8 w-full">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 h-14 w-[320px] shadow bg-white"
          placeholder="Search by query, project, or worker..."
        />

        {statuses.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveStatus(tab)}
            className={`flex px-3 py-1 h-14 rounded shadow-lg transition
      ${activeStatus === tab
                ? "bg-blue-600 text-white rounded-2xl"
                : "bg-white text-gray-700 hover:bg-blue-50 rounded-lg"
              }`}
          >
            {tab}{" "}
            <span
              className={`ml-0 -mr-6 text-sm font-semibold -mt-4 p-1 w-7 h-7 rounded-full ${activeStatus === tab ? "text-blue-400 bg-white" : "text-white bg-blue-600"
                }`}
            >
              {statusCounts[tab] || 0}
            </span>
          </button>
        ))}



        {/* Modal trigger */}
        <button
          onClick={openModal}
          type="button"
          className="ml-auto flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 shadow font-semibold hover:opacity-90 transition rounded"
        >
          <span className="text-xl">+</span>
          Post Query
        </button>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
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
          }).map((query, index) => (
              <motion.div
                key={index}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                className="relative bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-200 overflow-hidden"
              >
                {/* Accent Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                {/* Content */}
                <div className="p-6 flex flex-col gap-5">
                  {/* Worker + Project */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-gray-800 font-semibold">
                        <User className="w-4 h-4 text-indigo-500" />
                        {query.queryWorker}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Folder className="w-4 h-4 text-gray-400" />
                        {query.queryProject}
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-xs text-gray-400">
                      <div className="flex items-center gap-1">
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

                  {/* Title + Description */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {query.queryTitle}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {query.queryDescription}
                    </p>
                  </div>

                  {/* Status + Priority */}
                  <div className="flex justify-between items-center">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full shadow-sm ${query.status === "Resolved"
                        ? "bg-green-100 text-green-700"
                        : query.status === "In progress"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {query.status}
                    </span>

                    <span
                      className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full shadow-sm ${query.queryPriority === "High Priority"
                        ? "bg-red-100 text-red-700"
                        : query.queryPriority === "Medium Priority"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-blue-100 text-blue-700"
                        }`}
                    >
                      <Flag className="w-3 h-3" />
                      {query.queryPriority}
                    </span>
                    {role === "admin" ?
                      (<button
                        onClick={() => {
                          queryStatus(query._id, query.status);
                        }}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        Solve
                      </button>) : ("")}
                    <button onClick={() => handleDelete(query._id)}>Delete</button>


                  </div>
                </div>
              </motion.div>
            ))}
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Post a New Query</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body overflow-scroll">
                  <form>
                    {/* Title */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Query Title</label>
                      <input
                        type="text"
                        className="form-control"
                        name="queryTitle"
                        value={form.queryTitle}
                        onChange={handleFieldChange}
                        placeholder="Query title"
                      />
                    </div>
                    {/* Description */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Detailed Description
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        name="queryDescription"
                        value={form.queryDescription}
                        onChange={handleFieldChange}
                        placeholder="Describe your issue..."
                      ></textarea>
                    </div>
                    {/* Project + Worker */}
                    <div className="flex gap-4">
                      <div className="mb-3 w-1/2">
                        <label className="form-label fw-semibold">Project</label>
                        <select
                          className="form-select"
                          name="queryProject"
                          value={form.queryProject}
                          onChange={handleFieldChange}
                        >
                          <option value="">Select a project</option>
                          {projects.map((proj) => (
                            <option key={proj._id} value={proj.projectName}>
                              {proj.projectName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mb-3 w-1/2">
                        <label className="form-label fw-semibold">Worker</label>
                        <select
                          className="form-select"
                          name="queryWorker"
                          value={form.queryWorker}
                          onChange={handleFieldChange}
                        >
                          <option value="">Select a worker</option>
                          {workers.map((worker) => (
                            <option key={worker._id} value={worker.Name}>
                              {worker.Name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Priority</label>
                      <select
                        className="form-select"
                        name="queryPriority"
                        value={form.queryPriority}
                        onChange={handleFieldChange}
                      >
                        <option value="">Select priority</option>
                        {priorities.map((priority, i) => (
                          <option key={i} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </div>
                  </form>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleCreateQuery} // ✅ fixed
                    disabled={loading}
                  >
                    {loading ? "Posting..." : "Post Query"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Backdrop */}
          <div
            className="modal-backdrop fade show"
            onClick={() => setShowModal(false)}
          ></div>
        </>
      )}
    </div>
  );
}