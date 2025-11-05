import React, { useContext, useEffect, useState } from "react";
import { UsersContext } from "../Context/UserContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";
import { NavLink } from "react-router-dom";

const Login = () => {
  const [currentState, setCurrentState] = useState("Login");
  const { token, setToken, navigate, backendUrl } = useContext(UsersContext);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (event) => {
    event.preventDefault();

    if (!email || !password || (currentState === "Sign Up" && !name)) {
      toast.warning("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const url =
        currentState === "Sign Up"
          ? `${backendUrl}/api/user/register`
          : `${backendUrl}/api/user/login`;

      const payload =
        currentState === "Sign Up" ? { name, email, password } : { email, password };

      const response = await axios.post(url, payload);

      if (response.data.success) {
        toast.success(response.data.message || `${currentState} successful!`);
        setToken(response.data.token);
        localStorage.setItem("token", response.data.token);
      } else {
        toast.error(response.data.message || `${currentState} failed!`);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong. Please try again!"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) navigate("/");
  }, [token]);

  return (
    <>
      <ToastContainer position="bottom-right" autoClose={2500} theme="colored" />
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
        <motion.form
          onSubmit={onSubmitHandler}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6"
        >
          <div className="text-center">
            <h1 className="text-3xl font-semibold text-gray-800 mb-1">
              {currentState === "Login" ? "Welcome Back 👋" : "Create Account"}
            </h1>
            <p className="text-gray-500 text-sm">
              {currentState === "Login"
                ? "Login to continue managing your projects"
                : "Sign up to get started with your workspace"}
            </p>
          </div>

          {currentState === "Sign Up" && (
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Full Name</label>
              <input
                onChange={(e) => setName(e.target.value)}
                value={name}
                type="text"
                autoComplete="name"
                placeholder="Enter your name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Email</label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-600 mb-1 block">Password</label>
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              type="password"
              autoComplete={currentState === "Sign Up" ? "new-password" : "current-password"}
              placeholder="Enter your password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none"
              required
            />
          </div>

          <div className="flex justify-between items-center text-sm mt-2">
            <NavLink
              to="/forgot"
              className="text-indigo-600 hover:underline hover:text-indigo-800 transition"
            >
              Forgot Password?
            </NavLink>

            {currentState === "Login" ? (
              <p
                onClick={() => setCurrentState("Sign Up")}
                className="text-gray-600 hover:text-indigo-700 cursor-pointer"
              >
                Create Account
              </p>
            ) : (
              <p
                onClick={() => setCurrentState("Login")}
                className="text-gray-600 hover:text-indigo-700 cursor-pointer"
              >
                Already have an account?
              </p>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className={`w-full py-2 mt-4 text-white font-medium rounded-lg transition ${
              loading
                ? "bg-indigo-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading
              ? currentState === "Login"
                ? "Signing in..."
                : "Signing up..."
              : currentState === "Login"
              ? "Sign In"
              : "Sign Up"}
          </motion.button>
        </motion.form>
      </div>
    </>
  );
};

export default Login;
