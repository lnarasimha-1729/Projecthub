import React, { useContext, useState } from "react";
import { UsersContext } from "../Context/UserContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Forgot = () => {
    const navigate = useNavigate();
  const { backendUrl } = useContext(UsersContext);
  const [email, setEmail] = useState("");
  const [isExist, setIsExist] = useState(null); // null → not checked yet
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ✅ Check if email exists
  const checkEmail = async () => {
    if (!email) {
      toast.warning("Please enter your email");
      return;
    }

    try {
      const res = await axios.post(`${backendUrl}/api/user/checkEmail`, { email });
      setIsExist(res.data.exists);

      if (res.data.exists) {
        toast.success("Email verified! Please create a new password.");
      } else {
        toast.error("No account found with this email.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  // ✅ Change password (frontend validation only — needs backend route)
  const changePassword = async () => {
  if (!newPassword || !confirmPassword) {
    toast.warning("Please fill in both password fields");
    return;
  }

  if (newPassword !== confirmPassword) {
    toast.error("Passwords do not match!");
    return; // stop execution here
  }

  try {
    const res = await axios.post(`${backendUrl}/api/user/change-password`, {
      email,
      newPassword,
    });

    if (res.data.success) {
      toast.success("Password changed successfully!");
      setEmail("");
      setIsExist(null);
      setNewPassword("");
      setConfirmPassword("");
  setTimeout(() => {
    navigate("/password-changed"); // redirect after success
  });

    } else {
      toast.error(res.data.message || "Password update failed");
    }
  } catch (err) {
    console.error(err);
    toast.error("Server error while changing password");
  }
};


  return (
    <div className="flex flex-col items-center mt-40 space-y-4">
      <div className="flex flex-col items-center gap-2">
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter registered email..."
          className="border rounded-md px-3 py-2 w-72"
        />
        <button
          onClick={checkEmail}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
        >
          Submit
        </button>
      </div>

      {isExist && (
        <div className="flex flex-col items-center gap-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Create New Password"
            className="border rounded-md px-3 py-2 w-72"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm New Password"
            className="border rounded-md px-3 py-2 w-72"
          />
          <button
            onClick={changePassword}
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
          >
            Change Password
          </button>
        </div>
      )}
    </div>
  );
};

export default Forgot;
