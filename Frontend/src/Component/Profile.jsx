import axios from "axios";
import React, { useContext, useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { UsersContext } from "../Context/UserContext";
import {jwtDecode} from "jwt-decode";

const Profile = () => {
  const [profileImage, setProfileImage] = useState(null);
  const [email, setEmail] = useState("");
  const [maskedPassword, setMaskedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { backendUrl, token } = useContext(UsersContext);
  const fileInputRef = useRef(null);

  const userID = useMemo(() => {
    try {
      if (!token) return "";
      const { id } = jwtDecode(token);
      return id;
    } catch {
      return "";
    }
  }, [token]);

  const userName = useMemo(() => {
    try {
      if (!token) return "";
      const { email } = jwtDecode(token);
      return (
        email?.split("@")[0]?.split(".")[0]?.replace(/[^a-zA-Z0-9_-]/g, "") || ""
      );
    } catch {
      return "";
    }
  }, [token]);

  // fetch user profile and set latest image, email, masked password
  const fetchUserProfile = async () => {
    if (!userID) return;
    try {
      const res = await axios.get(`${backendUrl}/api/user/profile/${userID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const user = res.data.user || {};
        setEmail(user.email || "");
        setMaskedPassword(user.password ? "*".repeat(user.password.length) : "");
        const images = user.image || [];
        setProfileImage(images.length > 0 ? images[images.length - 1] : null);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  useEffect(() => {
    if (userID) fetchUserProfile();
  }, [userID]);

  // upload (replace) profile image
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

      if (response.data.success) {
        toast.success("Profile image updated");
        // refresh latest image
        await fetchUserProfile();
        // reset file input
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        toast.error(response.data.message || "Upload failed");
      }
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // handler when user picks a new file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  };

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8 mt-28">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Left: profile image */}
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-gray-100 shadow-sm bg-gray-100">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
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

            {/* corner upload button */}
            <label
              htmlFor="profile-upload"
              title="Change profile image"
              className="absolute bottom-0 right-0 transform translate-x-2 translate-y-2 bg-blue-600 text-white p-2 rounded-full shadow-md cursor-pointer hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {isUploading ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  viewBox="3 3 18 18"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    className="opacity-25"
                    d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.364 6.364l-2.121-2.121M8.757 8.757L6.636 6.636m12.728 0l-2.121 2.121M8.757 15.243l-2.121 2.121"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V7a4 4 0 014-4h2a4 4 0 014 4v9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l5-5 5 5" />
                </svg>
              )}
              <input
                id="profile-upload"
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>

          {/* Right: user details */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-800">{userName || "User"}</h2>
              </div>

              <div className="text-right">
                {/* small actions if needed */}
                <button
                  onClick={() => toast.info("Edit profile action")}
                  className="text-sm px-3 py-1 bg-gray-100 rounded-md text-gray-700 hover:bg-gray-200"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-400">Email</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-sm text-slate-700 break-all">{email || "—"}</div>
                  {email && (
                    <button
                      onClick={copyEmail}
                      aria-label="Copy email"
                      className="ml-auto text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6l-4-4H8z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden break-all">
                <div className="text-xs text-gray-400">Password</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="text-sm text-slate-700">{showPassword ? (maskedPassword.replace(/\*/g, "•") || "—") : maskedPassword || "—"}</div>
                  <button
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    className="ml-auto text-gray-500 hover:text-gray-700"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 4.5C6 4.5 2.73 7 1 10c1.73 3 5 5.5 9 5.5s7.27-2.5 9-5.5c-1.73-3-5-5.5-9-5.5z" />
                        <path d="M10 13a3 3 0 100-6 3 3 0 000 6z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.59A3 3 0 0113.41 13.41" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.88 12.13C4.61 15.13 8 17.5 12 17.5c1.2 0 2.36-.2 3.43-.57" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* optional footer / stats */}
            <div className="mt-6 text-sm text-gray-500">
              Last updated: <span className="text-gray-700">{/* fill if you have a timestamp */}—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
