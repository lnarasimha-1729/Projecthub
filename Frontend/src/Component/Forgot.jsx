import React, { useContext, useState } from "react";
import { UsersContext } from "../Context/UserContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

const Forgot = () => {
  const navigate = useNavigate();
  const { backendUrl } = useContext(UsersContext);
  const [email, setEmail] = useState("");
  const [isExist, setIsExist] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Email verification
  const checkEmail = async () => {
    if (!email.trim()) {
      toast.warning("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/api/user/checkEmail`, { email });
      setIsExist(res.data.exists);

      if (res.data.exists) {
        toast.success("✅ Email verified! Please create a new password.");
      } else {
        toast.error("❌ No account found with this email. Please SignUp.");
      }
    } catch (error) {
      console.error(error);
      toast.error("⚠️ Server error while verifying email.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Change password
  const changePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.warning("Please fill in both password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/api/user/change-password`, {
        email,
        newPassword,
      });

      if (res.data.success) {
        toast.success("🎉 Password changed successfully!");
        setEmail("");
        setIsExist(null);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => navigate("/password-changed"), 2000);
      } else {
        toast.error(res.data.message || "Password update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("❌ Server error while changing password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8"
      >
        <h2 className="text-2xl font-semibold text-center text-indigo-700 mb-6">
          Forgot Password 🔒
        </h2>

        {/* Email Section */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-600">
            Registered Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email..."
            className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
          />
          <button
            onClick={checkEmail}
            disabled={loading}
            className={`w-full py-2 mt-2 text-white font-medium rounded-lg ${
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            } transition`}
          >
            {loading ? "Checking..." : "Verify Email"}
          </button>
        </div>

        {/* Password Reset Section */}
        {isExist && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 border-t pt-6"
          >
            <h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">
              Create New Password
            </h3>
            <div className="flex flex-col gap-3">
              <input
              autoComplete="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-400 focus:outline-none"
              />
              <button
                onClick={changePassword}
                disabled={loading}
                className={`w-full py-2 mt-2 text-white font-medium rounded-lg ${
                  loading
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } transition`}
              >
                {loading ? "Updating..." : "Change Password"}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
    </div>
  );
};

export default Forgot;
