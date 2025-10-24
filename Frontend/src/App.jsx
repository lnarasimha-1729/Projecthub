import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import SideBar from "./Sidebar/SideBar";
import Dashboard from "./Component/Dashboard";
import Projects from "./Component/Projects";
import Workers from "./Component/Workers";
import CLockEntries from "./Component/ClockEntries";
import Queries from "./Component/Queries";
import Reports from "./Component/Reports";
import Chatbot from "./Component/Chatbot";
import Calendar from "./Component/Calendar";
import SearchBar from "./Searchbar/SearchBar";
import Login from "./Login/Login";
import UserContextProvider from "./Context/UserContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Profile from "./Component/Profile";

// ✅ Layout wrapper
const Layout = ({ children }) => {
  return (
    <div className="w-full h-screen flex">
      {/* Sidebar Section */}
      <div className="z-4 w-[22%] h-full shadow-md bg-white pt-8">
        <SideBar />
      </div>

      {/* Main Content Section */}
      <div className="flex-1 h-full overflow-auto flex flex-col">
        {/* SearchBar at top */}
        <div className="w-[73%] bg-gradient-to-r from-white via-white to-gray-50 shadow-md p-2 z-10 fixed">
          <SearchBar />
        </div>

        {/* Page Routes */}
        <div className="w-[95%] rounded-xl">{children}</div>
      </div>
    </div>
  );
};

// ✅ Root App
const App = () => {
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  const isProfilePage = location.pathname === "/profile"

  return (
    <UserContextProvider>
      {isLoginPage ? (
        // Show login page without sidebar/searchbar
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      ) : (
        // Wrap all other pages with layout
        <Layout>
          <ToastContainer position="top-center" autoClose={3000} />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile/>}/>
            <Route path="/projects" element={<Projects />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/clock_entries" element={<CLockEntries />} />
            <Route path="/queries" element={<Queries />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route path="/calendar" element={<Calendar />} />
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