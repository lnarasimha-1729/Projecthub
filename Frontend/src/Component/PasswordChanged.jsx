// src/Component/PasswordChanged.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

const PasswordChanged = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white shadow-md rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold text-green-600 mb-4">
          ✅ Password Changed Successfully!
        </h2>
        <p className="text-gray-600 mb-6">
          You can now log in using your new password.
        </p>
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-500 text-white px-5 py-2 rounded-md hover:bg-blue-600"
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

export default PasswordChanged;
