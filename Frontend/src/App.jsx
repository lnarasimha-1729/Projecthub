import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import SideBar from "./Sidebar/SideBar";
import Dashboard from "./Pages/Dashboard";
import Projects from "./Pages/Projects";
import Workers from "./Pages/Workers";
import CLockEntries from "./Pages/ClockEntries";
import Queries from "./Pages/Queries";
import Reports from "./Pages/Reports";
import Chatbot from "./Pages/Chatbot";
import Calendar from "./Pages/Calendar";
import SearchBar from "./Searchbar/SearchBar";
import Login from "./Login/Login";
import UserContextProvider from "./Context/UserContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Profile from "./Profile/Profile";
import Forgot from "./Component/Forgot";
import PasswordChanged from "./Component/PasswordChanged";

// ✅ Layout wrapper
const Layout = ({ children }) => {
  return (
    <div className="w-full h-screen flex">
      {/* Sidebar Section */}
      <div className="z-4 w-0 md:w-60 lg:w-[17%] h-full shadow-md bg-white pt-8">
        <SideBar />
      </div> {/* Main Content Section */}
      <div className="flex-1 h-full overflow-auto flex flex-col">
        {/* SearchBar at top */}
        <div className="w-full lg:w-[92%] h-14 lg:min-h-24 max-w-7xl border-b border-gray-300 py-2">
        <SearchBar />
      </div> 
          {/* Page Routes */}
        <div className="md:flex-1 lg:w-[93%] rounded-xl">{children}</div>
      </div>
    </div>
  );
};

// ✅ Root App
const App = () => {
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  const isForgot = location.pathname === "/forgot"

  const isProfile = location.pathname === "/profile"

  return (
    <UserContextProvider>
      {isLoginPage ? (
        // Show login page without sidebar/searchbar
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      ) : isForgot ? (
        <Routes>
          <Route path="/forgot" element={<Forgot />} />
        </Routes>
      ) : isProfile ? (
        <Routes>
          <Route path="/profile" element={<Profile />} />
        </Routes>
      ) : (
        // Wrap all other pages with layout
        <Layout>
          <ToastContainer position="top-center" autoClose={3000} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/clock_entries" element={<CLockEntries />} />
            <Route path="/queries" element={<Queries />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/password-changed" element={<PasswordChanged />} />
          </Routes>
        </Layout>
      )}
    </UserContextProvider>
  );
};

// ✅ App needs BrowserRouter at root (index.js/main.jsx)
export default function RootApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}