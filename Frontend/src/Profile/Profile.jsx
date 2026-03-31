import axios from "axios";
import React, { useContext, useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { UsersContext } from "../Context/UserContext";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

/** same getLastProfileImage helper from before (keeps robustness) */
function getLastProfileImage(user) {
  if (!user) return null;
  const imgField = user.image ?? user.images ?? user.profileImage ?? null;
  if (!imgField) return null;

  let img = null;
  if (Array.isArray(imgField) && imgField.length > 0) {
    if (typeof imgField[0] === "object" && imgField[0]?.uploadedAt) {
      const sorted = [...imgField].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      img = sorted[0];
    } else {
      img = imgField[imgField.length - 1];
    }
  } else if (typeof imgField === "string") {
    img = imgField;
  } else if (typeof imgField === "object") {
    img = imgField;
  }

  if (!img) return null;

  if (typeof img === "object") {
    if (img.data && typeof img.data === "string") {
      return img.data.startsWith("data:") ? img.data : `data:${img.mimetype || "image/png"};base64,${img.data}`;
    }
    if (img.base64 && typeof img.base64 === "string") {
      return img.base64.startsWith("data:") ? img.base64 : `data:image/png;base64,${img.base64}`;
    }
    if (img.url && typeof img.url === "string") return img.url;
    if (img.path && typeof img.path === "string") return img.path;
    if (img.buffer && typeof img.buffer === "string") return img.buffer;
  }

  if (typeof img === "string") {
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    if (/^[A-Za-z0-9+/=\s]+$/.test(img) && img.length > 100) return `data:image/png;base64,${img.trim()}`;
  }

  return null;
}

const Profile = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [email, setEmail] = useState("");
  const [maskedPassword, setMaskedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Context
  const { backendUrl, token, workers = [], users = [], clockEntries = [] } = useContext(UsersContext);
  const fileInputRef = useRef(null);

  // token-derived info
  const userID = useMemo(() => {
    try {
      if (!token) return "";
      const d = jwtDecode(token);
      return d.id || d._id || "";
    } catch {
      return "";
    }
  }, [token]);

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("All fields are required");
      return;
    }

    try {
      const res = await axios.put(
        `${backendUrl}/api/user/profile/${userID}`,
        { name: editName, email: editEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);

        // Update token if new one is returned
        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
        }

        // Refresh latest data
        await fetchUserProfile();
      } else {
        toast.error(res.data.message || "Update failed");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("Profile update failed");
    }
  };

  const userRole = useMemo(() => {
    try {
      if (!token) return "";
      const decoded = jwtDecode(token);
      return decoded.role || "";
    } catch {
      return "";
    }
  }, [token]);

  const userEmailFromToken = useMemo(() => {
    try {
      if (!token) return "";
      return jwtDecode(token).email || "";
    } catch {
      return "";
    }
  }, [token]);

  const userName = useMemo(() => {
    try {
      return (userEmailFromToken?.split("@")[0]?.split(".")[0]?.replace(/[^a-zA-Z0-9_-]/g, "") || "");
    } catch {
      return "";
    }
  }, [userEmailFromToken]);

  // Fetch profile (server copy)
  // 🔹 FETCH USER PROFILE (keeps data in sync)
const fetchUserProfile = async () => {
  if (!userID || !backendUrl) return;
  try {
    const res = await axios.get(`${backendUrl}/api/user/profile/${userID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.data?.success) {
      const user = res.data.user || {};

      // ✅ Make sure we always use the latest updated data
      setEmail(user.email || "");
      setMaskedPassword(user.password ? "*".repeat(user.password.length) : "");
      setProfileImage(getLastProfileImage(user));

      // Update edit fields with latest data
      setEditName(user.Name || user.name || "");
      setEditEmail(user.email || "");
    }
  } catch (err) {
    console.error("Error fetching profile:", err);
  }
};

// 🔹 WHEN CLICKING EDIT BUTTON (always show latest name/email)
const handleEditClick = async () => {
  try {
    await fetchUserProfile(); // ✅ ensure latest data before opening
    setEditName(editName || email?.split("@")[0] || "");
    setEditEmail(email || "");
    setIsEditing(true);
  } catch (err) {
    console.error("Error preparing edit modal:", err);
    toast.error("Failed to load latest data");
  }
};


  useEffect(() => {
    if (userID) fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userID]);

  // Upload image (unchanged)
  const uploadImage = async (file) => {
    if (!file || !userID) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("id", userID);
      formData.append("image1", file);

      const response = await axios.post(`${backendUrl}/api/user/profile`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data?.success) {
        toast.success("Profile image updated");
        await fetchUserProfile();
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(response.data?.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  // Resolve current worker (same robust matching)
  const currentWorker = useMemo(() => {
    if (!workers || workers.length === 0) return null;
    const tokenEmail = (userEmailFromToken || "").toString().toLowerCase();
    const tokenName = (userName || "").toString().toLowerCase();
    const tokenId = String(userID || "");

    if (tokenEmail) {
      const byEmail = workers.find((w) => (w.email || w.Email || "").toString().toLowerCase() === tokenEmail);
      if (byEmail) return byEmail;
    }

    if (tokenName) {
      const byName = workers.find((w) => (w.Name || w.name || "").toString().toLowerCase() === tokenName);
      if (byName) return byName;
    }

    const byId = workers.find((w) => String(w._id || w.id || "") === tokenId);
    if (byId) return byId;

    if (tokenName) {
      const byEmailUserPart = workers.find((w) => {
        const wEmail = (w.email || w.Email || "").toString().toLowerCase();
        if (!wEmail) return false;
        const usernamePart = wEmail.split("@")[0].split(".")[0];
        return usernamePart === tokenName;
      });
      if (byEmailUserPart) return byEmailUserPart;
    }

    const fallback = workers.find((w) => {
      const we = (w.email || w.Email || w.Name || "").toString().toLowerCase();
      return tokenEmail ? we.includes(tokenEmail.split("@")[0]) : tokenName ? we.includes(tokenName) : false;
    });

    return fallback || null;
  }, [workers, userEmailFromToken, userName, userID]);

  // Backfill profile image from users[] if fetch didn't produce one
  useEffect(() => {
    if (profileImage) return;
    if (!currentWorker || !users || users.length === 0) return;
    const match = users.find((u) => {
      const ue = (u.email || "").toString().toLowerCase();
      const wn = (currentWorker.email || currentWorker.Email || currentWorker.Name || "").toString().toLowerCase();
      return ue && wn && (ue === wn || ue.includes(wn) || wn.includes(ue));
    });
    if (match) {
      const img = getLastProfileImage(match);
      if (img) setProfileImage(img);
    }
  }, [profileImage, currentWorker, users]);

  // Format helper
  const formatHoursFriendly = (hoursOrMins) => {
    if (hoursOrMins == null || hoursOrMins === "") return "—";
    if (typeof hoursOrMins === "number" && Math.abs(hoursOrMins) > 24) {
      const totalMins = Math.round(hoursOrMins);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      return `${h}h ${m}m`;
    }
    const totalMins = Math.round(Number(hoursOrMins) * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  };

  // Build worker-specific stats from clockEntries (copied from earlier)
  const {
    totalHoursWorked,
    todayHours,
    topProject,
    topProjectsBreakdown,
    recentSessions,
  } = useMemo(() => {
    if (!currentWorker || !Array.isArray(clockEntries)) {
      return { totalHoursWorked: 0, todayHours: 0, topProject: null, topProjectsBreakdown: [], recentSessions: [] };
    }

    const cwEmail = (currentWorker.email || currentWorker.Email || "").toString().toLowerCase();
    const cwName = (currentWorker.Name || currentWorker.name || "").toString().toLowerCase();
    const cwId = String(currentWorker._id || currentWorker.id || "");

    const matchEntries = (clockEntries || []).filter((e) => {
      if (!e) return false;
      const w = e.worker;
      const workerEmailInEntry = (e.workerEmail || "").toString().toLowerCase();
      if (String(w) === cwId) return true;
      if ((w || "").toString().toLowerCase() === cwName && cwName) return true;
      if (workerEmailInEntry && cwEmail && workerEmailInEntry === cwEmail) return true;
      return false;
    });

    matchEntries.sort((a, b) => new Date(a.time) - new Date(b.time));

    const sessions = [];
    let lastIn = null;
    let lastInProject = null;

    for (const e of matchEntries) {
      const t = e.time ? new Date(e.time) : null;
      const type = (e.type || "").toString().toLowerCase();
      const proj = e.project || e.projectName || e.projectId || null;

      if (type.includes("in")) {
        lastIn = t;
        lastInProject = proj || lastInProject;
      } else if (type.includes("out")) {
        if (lastIn && t && t > lastIn) {
          const mins = Math.round((t - lastIn) / (1000 * 60));
          if (mins > 0) {
            sessions.push({
              in: lastIn,
              out: t,
              minutes: mins,
              project: (proj || lastInProject || "Unknown").toString(),
            });
          }
        }
        lastIn = null;
        lastInProject = null;
      }
    }

    // include ongoing session up to now if present
    const lastRawEntry = matchEntries[matchEntries.length - 1];
    if (lastRawEntry && (lastRawEntry.type || "").toString().toLowerCase().includes("in")) {
      const ongoingIn = new Date(lastRawEntry.time);
      const now = new Date();
      if (now > ongoingIn) {
        const minsNow = Math.round((now - ongoingIn) / (1000 * 60));
        sessions.push({
          in: ongoingIn,
          out: now,
          minutes: minsNow,
          project: (lastRawEntry.project || lastRawEntry.projectName || "Unknown").toString(),
          ongoing: true,
        });
      }
    }

    const totalMinutes = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
    const totalHoursWorkedVal = Math.round((totalMinutes / 60) * 100) / 100;

    const todayKey = new Date().toLocaleDateString();
    const todayMinutes = sessions.reduce((acc, s) => {
      const key = s.in.toLocaleDateString();
      return acc + (key === todayKey ? (s.minutes || 0) : 0);
    }, 0);
    const todayHoursVal = Math.round((todayMinutes / 60) * 100) / 100;

    const projectCount = {};
    sessions.forEach((s) => {
      const p = (s.project || "Unknown").toString();
      projectCount[p] = (projectCount[p] || 0) + (s.minutes || 0);
    });
    const projectEntries = Object.entries(projectCount).map(([project, minutes]) => ({ project, minutes }));
    projectEntries.sort((a, b) => b.minutes - a.minutes);
    const topProjectVal = projectEntries.length ? projectEntries[0].project : null;

    const recentSessionsVal = sessions
      .slice(-10)
      .reverse()
      .map((s) => ({
        date: s.in.toLocaleDateString(),
        in: s.in.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        out: s.out ? s.out.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—",
        minutes: s.minutes,
        project: s.project,
        ongoing: !!s.ongoing,
      }));
      

    return {
      totalHoursWorked: totalHoursWorkedVal,
      todayHours: todayHoursVal,
      topProject: topProjectVal,
      topProjectsBreakdown: projectEntries,
      recentSessions: recentSessionsVal,
    };
  }, [currentWorker, clockEntries]);

  const copyEmail = async () => {
    const toCopy = email || currentWorker?.email || currentWorker?.Email;
    if (!toCopy) return;
    try {
      await navigator.clipboard.writeText(toCopy);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  useEffect(() => {
  const updateWorkerHours = async () => {
    if (!currentWorker || totalHoursWorked === 0) return;
    try {
      await axios.put(
        `${backendUrl}/api/update-hours`,
        {
          workerId: currentWorker._id,
          totalHoursWorked,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.error("❌ Failed to update total hours:", err);
    }
  };

  // only update when clockEntries change (after Clock In / Out)
  updateWorkerHours();
}, [clockEntries, totalHoursWorked, currentWorker, backendUrl, token]);


  

  // Render project bars
  const renderProjectBars = () => {
    if (!topProjectsBreakdown || topProjectsBreakdown.length === 0) return <div className="text-sm text-gray-400">No project data</div>;
    const max = Math.max(...topProjectsBreakdown.map((p) => p.minutes)) || 1;
    return (
      <div className="space-y-2">
        {topProjectsBreakdown.slice(0, 5).map((p) => {
          const pct = Math.round((p.minutes / max) * 100);
          return (
            <div key={p.project} className="flex items-center gap-3">
              <div className="text-sm w-36 truncate">{p.project}</div>
              <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-gray-500 w-12 text-right">{Math.round(p.minutes / 60)}h</div>
            </div>
          );
        })}
      </div>
    );
  };

  /** ---------- Edit profile logic ---------- **/

  // who can edit? allow when token user matches currentWorker OR userRole === 'admin'
  const canEdit = useMemo(() => {
    if (!userID) return false;
    if (!currentWorker) {
      // admins can edit any user profile (if you want to restrict, change)
      return userRole === "admin";
    }
    return String(userID) === String(currentWorker._id) || userRole === "admin";
  }, [userID, currentWorker, userRole]);

  // open edit modal and prefill values
  const openEditModal = () => {
    setEditName(currentWorker?.Name || currentWorker?.name || "");
    setEditEmail(currentWorker?.email || currentWorker?.Email || email || "");
    setEditPassword(""); // don't prefill password for security
    setShowEditModal(true);
  };

  // submit edit form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName || !editEmail) {
      toast.error("Name and email are required");
      return;
    }
    setEditLoading(true);
    try {
      // prepare payload; only include password when user entered something
      const payload = { Name: editName, email: editEmail };
      if (editPassword && editPassword.length >= 6) payload.password = editPassword;

      // attempt PUT to a sensible endpoint
      // NOTE: your backend route may differ; this is a best-effort path.
      const url = `${backendUrl}/api/user/profile/${userID}`;
      const res = await axios.put(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        toast.success("Profile updated");
        // Update local UI: refresh profile and workers lists by fetching profile
        await fetchUserProfile();
        // optionally update currentWorker if you maintain workers in context upstream (we assume fetchUserProfile is enough)
        setShowEditModal(false);
      } else {
        // If server returns non-success, show message if available
        toast.error(res.data?.message || "Update failed");
      }
    } catch (err) {
      console.error("Profile update failed:", err);
      // if backend returns validation errors
      const msg = err?.response?.data?.message || err?.message || "Update failed";
      toast.error(String(msg));
    } finally {
      setEditLoading(false);
    }
  };

  // remove profile image (best-effort)
  const handleRemoveImage = async () => {
    if (!userID) return;
    const confirmDelete = window.confirm("Remove your profile image?");
    if (!confirmDelete) return;
    try {
      // best-effort delete endpoint - adapt backend if different
      const url = `${backendUrl}/api/user/profile/${userID}/image`;
      const res = await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success("Profile image removed");
        setProfileImage(null);
        await fetchUserProfile();
      } else {
        toast.error(res.data?.message || "Failed to remove image");
      }
    } catch (err) {
      console.error("Delete image failed:", err);
      // Some backends may not implement DELETE; fallback: show message
      toast.error("Could not remove image (backend route may differ)");
    }
  };

  const resolvedRole = useMemo(() => {
  return (
    currentWorker?.Role || 
    currentWorker?.role || 
    currentWorker?.workerType || 
    userRole || 
    "No role assigned"
  );
}, [currentWorker, userRole]);

const navigate = useNavigate()


  /** ---------- End edit logic ---------- **/

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-100 p-1 lg:p-4">
      <span className="cursor-pointer" onClick={()=>navigate("/")}>Back</span>
  <div className="min-h-screen flex items-center justify-center px-4 py-16 -mt-10 lg:mt-0">
    
    <div className="w-full max-w-5xl bg-white/80 backdrop-blur-lg rounded-xl shadow-sm border border-gray-100 p-0 lg:p-0 lg:p-0">
      {/* Conditional Layout */}
      {userRole === "worker" ? (
        /* ---------- WORKER FULL VIEW ---------- */
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-4">
          {/* LEFT PANEL */}
          <div className="bg-blue-800 p-4 rounded w-full lg:w-3/10 flex flex-col items-center text-center space-y-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-35 h-35 lg:w-40 lg:h-40 rounded-full overflow-hidden shadow-sm border-4 border-indigo-100 bg-gray-50">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) =>
                      (e.currentTarget.src =
                        "https://cdn-icons-png.flaticon.com/512/149/149071.png")
                    }
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-12 h-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 20C3.732 14.943 8.523 11 12 11s8.268 3.943 9.542 9H2.458z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* ✅ Image Upload (for all roles) */}
              <label
                htmlFor="profile-upload"
                className="absolute bottom-2 lg:bottom-5 lg:right-4 transform translate-x-3 translate-y-3 bg-indigo-600 hover:bg-indigo-700 transition text-white p-2 rounded-full shadow-md cursor-pointer"
              >
                <input
                  id="profile-upload"
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="sr-only"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                            <img className="w-4 h-4" src="https://img.icons8.com/ios/50/FFFFFF/camera--v4.png" alt="camera--v4"/>
                )}
              </label>
            </div>

            <h2 className="text-2xl font-semibold text-gray-800 capitalize">
              {editName || currentWorker?.Name || currentWorker?.name || userName}
            </h2>
            <p className="text-sm text-gray-500">
              {currentWorker?.Role || currentWorker?.workerType || userRole || "—"}
            </p>

            <button
              onClick={handleEditClick}
              className="mt-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200 transition font-medium"
            >
              Edit Profile
            </button>

            <div className="text-xs text-gray-500 flex items-center gap-2 mt-3">
              <span className="break-all">
                {email || currentWorker?.email || "—"}
              </span>
              <button
                onClick={copyEmail}
                className="text-indigo-600 hover:underline"
              >
                Copy
              </button>
            </div>

            {/* Worker Stats */}
            <div className="flex flex-col gap-2 w-full mt-6">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-1 rounded-xl">
                <p className="text-xs text-indigo-400">Total Hours</p>
                <p className="text-lg font-semibold text-indigo-700">
                  {formatHoursFriendly(totalHoursWorked)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-1 rounded-xl">
                <p className="text-xs text-blue-400">Today's Hours</p>
                <p className="text-lg font-semibold text-blue-700">
                  {formatHoursFriendly(todayHours)}
                </p>
              </div>
              <div className="col-span-2 bg-white p-1 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-400">Completed Projects</p>
                <p className="text-lg font-semibold text-gray-800">
                  {currentWorker?.completedProjects ?? 0}
                </p>
              </div>
            </div>

            {canEdit && profileImage && (
              <button
                onClick={handleRemoveImage}
                className="mt-2 text-sm text-red-500 hover:underline"
              >
                Remove image
              </button>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="flex-1 flex flex-col space-y-4">
            <div className="bg-white/80 rounded-2xl border border-gray-100 shadow-sm mt-2 p-6 lg:w-[98%]">
              <div className="flex max-[639px]:flex-col items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  Work Summary
                </h3>
                <span className="text-sm text-gray-500">
                  Top Project:{" "}
                  <span className="font-medium text-indigo-600 break-all">
                    {topProject || "—"}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-2">
                    Top Projects Breakdown
                  </p>
                  {renderProjectBars()}
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-2">Role</p>
                  <p className="font-semibold text-gray-800">
                    {currentWorker?.Role || currentWorker?.workerType || "—"}
                  </p>
                  <p className="text-xs text-gray-400 mt-4 mb-1">Status</p>
                  <p
                    className={`font-semibold ${
                      currentWorker?.isActive
                        ? "text-green-600"
                        : "text-red-500"
                    }`}
                  >
                    {currentWorker?.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden lg:w-[98%] mb-2">
              <h4 className="text-md font-semibold text-gray-800 mb-3">
                Recent Sessions
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b bg-gray-50">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">In</th>
                      <th className="py-2 px-3">Out</th>
                      <th className="py-2 px-3">Duration</th>
                      <th className="py-2 px-3">Project</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.length ? (
                      recentSessions.map((s, i) => (
                        <tr
                          key={i}
                          className="text-sm text-gray-700 border-b last:border-none hover:bg-gray-50"
                        >
                          <td className="py-3 px-3">{s.date}</td>
                          <td className="py-3 px-3">{s.in}</td>
                          <td className="py-3 px-3">
                            {s.out}
                            {s.ongoing && " (now)"}
                          </td>
                          <td className="py-3 px-3">
                            {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                          </td>
                          <td className="py-3 px-3">{s.project}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-sm text-gray-400 py-4"
                        >
                          No recent sessions
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ---------- ADMIN / SUPERVISOR COMPACT VIEW ---------- */
<div className="flex flex-col lg:flex-row gap-10">

  {/* LEFT SECTION */}
  <div className="w-full lg:w-1/3 flex flex-col items-center space-y-6 bg-white shadow-md border border-gray-200 p-6 rounded-2xl">

    {/* AVATAR */}
    <div className="relative">
      <div className="w-44 h-44 rounded-full overflow-hidden bg-gray-100 border border-gray-300 shadow-sm">
        {profileImage ? (
          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 20C3.732 14.943 8.523 11 12 11s8.268 3.943 9.542 9H2.458z"/>
            </svg>
          </div>
        )}
      </div>

      {/* UPLOAD BUTTON */}
      <label
        htmlFor="profile-upload"
        className="absolute bottom-2 right-2 bg-gray-900 hover:bg-black text-white p-2 rounded-lg shadow cursor-pointer"
      >
        <input
          id="profile-upload"
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="sr-only"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="white" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
          </svg>
        )}
      </label>
    </div>

    {/* NAME */}
    <p className="text-xl font-semibold text-gray-900">
      {editName || currentWorker?.Name || currentWorker?.name || userName}
    </p>

    {/* EDIT BUTTON */}
    <button
      onClick={handleEditClick}
      className="px-5 py-2 bg-gray-900 text-white rounded-lg hover:bg-black text-sm font-medium transition"
    >
      Edit Profile
    </button>
  </div>

  {/* RIGHT SECTION */}
  <div className="flex-1 space-y-6">

    {/* EMAIL CARD */}
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <p className="text-sm text-gray-500">Email</p>
      <div className="flex items-center justify-between mt-1">
        <p className="font-medium text-gray-900">
          {email || currentWorker?.email || "No email available"}
        </p>
        <button onClick={copyEmail} className="text-sm text-gray-700 hover:text-black transition">
          Copy
        </button>
      </div>
    </div>

    {/* ROLE CARD */}
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <p className="text-sm text-gray-500">Role</p>
      <p className="text-sm text-gray-500">
  {resolvedRole}
</p>

    </div>

  </div>

</div>


      )}
    </div>

    {/* EDIT MODAL */}
    {isEditing && (
      <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fadeIn">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 rounded">
            Edit Profile
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveProfile}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
  </div>
);


};

export default Profile;
