import React, { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { UsersContext } from "../Context/UserContext";
import { FaProjectDiagram, FaUsers, FaClock } from "react-icons/fa";
import { MdDashboard } from "react-icons/md";
import { AiOutlineBarChart } from "react-icons/ai";
import { HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import { BsCalendar } from "react-icons/bs";

const SideBar = () => {
  const { setToken, navigate } = useContext(UsersContext);
  const { isSidebarOpen, setIsSidebarOpen } = useContext(UsersContext);


  // decode role from token
  const token = localStorage.getItem("token");
  let role = "worker";
  if (token) {
    try {
      const decoded = jwtDecode(token);
      role = decoded.role;
    } catch (error) {
      console.error("Invalid token");
    }
  }

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/login");
  };

  // menu items
  const allItems = [
  { path: "/", label: "Dashboard", icon: <MdDashboard /> },
  { path: "/projects", label: "Projects", icon: <FaProjectDiagram /> },
  { path: "/workers", label: "Workers", icon: <FaUsers /> },
  { path: "/clock_entries", label: "Clock Entries", icon: <FaClock /> },
  { path: "/queries", label: "Queries", icon: <HiOutlineChatBubbleLeftRight /> },
  { path: "/reports", label: "Reports", icon: <AiOutlineBarChart /> },
  { path: "/chatbot", label: "Chatbot", icon: <HiOutlineChatBubbleLeftRight /> },
  { path: "/calendar", label: "Calendar", icon: <BsCalendar /> },
];

  const userItems = allItems.filter(item =>
    ["Dashboard", "Projects", "Clock Entries", "Queries", "Reports", "Calendar"].includes(item.label)
  );

  const menuItems = role === "admin" || role === "supervisor" ? allItems : userItems;

  return (
    <>
      {/* ✅ Hamburger button for mobile/tablet */}
      <div className="md:hidden w-full top-3 -left-3 z-50">
  <button onClick={() => setIsSidebarOpen(true)}>

          <img
            src={
              isSidebarOpen
                ? "https://img.icons8.com/ios-glyphs/30/multiply.png"
                : "https://img.icons8.com/ios-filled/30/menu--v1.png"
            }
            alt="menu"
          />
        </button>
      </div>

      {/* ✅ Sidebar (hidden on mobile until opened) */}
      <div
  className={`fixed top-0 left-0 z-40 bg-white h-full transition-transform duration-300 
    ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} 
    md:translate-x-0 md:left-0`}
>

        <p className="flex justify-center lg:text-[1.7rem] lg:ml-8 md:text-2xl py-4 md:ml-15 font-bold bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 bg-clip-text text-transparent">
          ProjectHub
        </p>
        <div className="flex flex-col items-center gap-1 mt-8 w-full px-4">
          <div className="flex flex-col gap-3 md:gap-5 lg:gap-8 font-semibold text-gray-600 px-2">
            {menuItems.map((item, index) => (
              <NavLink
                key={index}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}

                style={{ textDecoration: "none" }}
                className={({ isActive }) =>
                  `className="
flex items-center gap-2 
text-sm md:text-base lg:text-lg 
px-3 md:px-4 lg:px-6 
py-2 
rounded-xl 
transition-all duration-200 
no-underline 
text-gray-700 
hover:bg-blue-100 hover:text-blue-600 
"
                  ${
                    isActive
                      ? "bg-gradient-to-r from-blue-500 to-purple-700 text-white py-2"
                      : "hover:bg-gradient-to-r from-blue-500 to-purple-700 text-black py-2"
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[1.05rem]">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
        <div>
          {token && (
            <div className="fixed bottom-0 left-1 w-fit h-8 bg-red-400 border border-gray-300 rounded shadow-md">
              <p
                onClick={logout}
                className="py-0.5 px-2 text-white cursor-pointer"
              >
                Logout
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Overlay for mobile */}
      {isSidebarOpen && (
  <div
    className="fixed inset-0 bg-black/40 z-30 md:hidden"
    onClick={() => setIsSidebarOpen(false)}
  ></div>
)}

    </>
  );
};

export default SideBar;
