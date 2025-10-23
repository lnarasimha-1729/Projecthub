import React from "react";
import { NavLink } from "react-router-dom";
import {jwtDecode} from "jwt-decode"; // ✅ fixed import

const SideBar = () => {
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

  // all menu items
  const allItems = [
    { path: "/", label: "Dashboard", icon: "https://img.icons8.com/fluency-systems-regular/48/dashboard-layout.png", size: { w: 24, h: 24 } },
    { path: "/projects", label: "Projects", icon: "https://img.icons8.com/ios/50/group-of-projects.png", size: { w: 24, h: 24 } },
    { path: "/workers", label: "Workers", icon: "https://img.icons8.com/wired/64/workers-male.png", size: { w: 24, h: 24 } },
    { path: "/clock_entries", label: "Clock Entries", icon: "https://img.icons8.com/windows/32/clock--v3.png", size: { w: 24, h: 24 } },
    { path: "/queries", label: "Queries", icon: "https://cdn0.iconfinder.com/data/icons/basic-ui-vol-1/32/UI_stroke-44-512.png", size: { w: 24, h: 24 } },
    { path: "/reports", label: "Reports", icon: "https://img.icons8.com/pastel-glyph/64/bar-chart--v1.png", size: { w: 24, h: 24 } },
    { path: "/chatbot", label: "Chatbot", icon: "https://img.icons8.com/fluency-systems-regular/48/chatbot.png", size: { w: 24, h: 24 } },
    { path: "/calendar", label: "Calendar", icon: "https://img.icons8.com/material-outlined/24/calendar--v1.png", size: { w: 24, h: 24 } },
  ];

  // menu items for normal users
  const userItems = allItems.filter(item =>
    ["Dashboard", "Projects", "Clock Entries", "Queries", "Reports", "Calendar"].includes(item.label)
  );

  console.log(role);
  

  // choose menu based on role
  const menuItems = role === "admin" || role === "supervisor" ? allItems : userItems;

  return (
    <div className="fixed left-16">
      <p className="flex justify-center text-[1.7rem] py-4 ml-10 font-bold bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 bg-clip-text text-transparent">
        ProjectHub
      </p>
      <div className="flex flex-col items-center gap-8 mt-8">
        <div className="flex flex-col gap-2 font-semibold text-gray-600 text-lg">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              style={{textDecoration:"none"}}
              className={({ isActive }) =>
                `flex items-center gap-2 px-8 py-2 rounded-lg transition-colors duration-200 no-underline 
                ${isActive
                  ? "bg-gradient-to-r from-blue-500 to-purple-700 text-white"
                  : "hover:bg-gradient-to-r from-blue-500 to-purple-700 text-black"}`
              }
            >
              <img src={item.icon} alt={item.label} width={item.size.w} height={item.size.h} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SideBar;