import React, { useContext, useEffect, useState, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";

const PLACEHOLDER =
  "https://img.icons8.com/?size=100&id=12437&format=png&color=FFFFFF";

// convert Buffer-like { type: 'Buffer', data: [...] } or raw array -> base64
function bufferObjToBase64(bufObjOrArray) {
  try {
    const arr = Array.isArray(bufObjOrArray)
      ? bufObjOrArray
      : bufObjOrArray?.data;
    if (!arr || arr.length === 0) return null;
    const uint8 = Uint8Array.from(arr);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const sub = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(sub));
    }
    return btoa(binary);
  } catch (err) {
    console.error("bufferObjToBase64 error:", err);
    return null;
  }
}

// ✅ updated version — supports arrays like profile.image = [url]
function getProfileImageSrc(profile) {
  if (!profile) return null;

  const candidates = [
    "image",
    "avatar",
    "profilePic",
    "photo",
    "picture",
    "img",
    "profileImage",
    "profile_picture",
  ];

  for (const f of candidates) {
    const v = profile[f];
    if (!v) continue;

    // if it's an array, take the last item
    const value = Array.isArray(v) && v.length > 0 ? v[v.length - 1] : v;

    // string cases
    if (typeof value === "string") {
      if (value.startsWith("data:") || value.startsWith("http") || value.startsWith("/")) {
        return value;
      }
      // long base64 string without header
      if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100) {
        return `data:image/png;base64,${value}`;
      }
    }

    // object case { data: "...", mimetype: "image/png" }
    if (typeof value === "object" && value !== null) {
      if (typeof value.data === "string") {
        const mime = value.mimetype || "image/png";
        if (value.data.startsWith("data:")) return value.data;
        return `data:${mime};base64,${value.data}`;
      }
      // Buffer-like array
      const b64 = bufferObjToBase64(value.data || value);
      if (b64) return `data:image/png;base64,${b64}`;
    }
  }

  // fallback: maybe image is nested differently
  if (profile.image && typeof profile.image === "object") {
    if (typeof profile.image.data === "string") {
      return `data:${profile.image.mimetype || "image/png"};base64,${profile.image.data}`;
    }
    const b64 = bufferObjToBase64(profile.image.data || profile.image);
    if (b64) return `data:image/png;base64,${b64}`;
  }

  return null;
}


const SearchBar = () => {
  const { query,setQuery, token, navigate, users, setIsSidebarOpen } = useContext(UsersContext);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const t = token || localStorage.getItem("token");
    if (!t) {
      setEmail("");
      setRole("");
      return;
    }
    try {
      const decoded = jwtDecode(t);
      setEmail(decoded?.email || "");
      setRole(decoded?.role || "");
    } catch {
      setEmail("");
      setRole("");
    }
  }, [token]);

  const profile = useMemo(() => {
    if (!users?.length || !email) return null;
    return users.find((u) => u.email === email) || null;
  }, [users, email]);


  const profileImgSrc = useMemo(() => {
    const src = getProfileImageSrc(profile);
    return src || PLACEHOLDER;
  }, [profile]);

  const userName = useMemo(() => {
    const token = localStorage.getItem("token");
    if (!token || typeof token !== "string") return "Guest";

    try {
      const decoded = jwtDecode(token);
      return decoded?.name || "User";
    } catch (err) {
      console.error("❌ Invalid token:", err);
      return "Guest";
    }
  }, [token]);


  return (
  <div className="bg-white px-4 lg:py-3.5">
    <div className="flex items-center gap-2 px-0 lg:px-12">

      {/* 🍔 Burger (mobile only) */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden mr-2 p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <img
          src="https://img.icons8.com/ios-filled/30/menu--v1.png"
          className="w-5 h-5"
          alt="menu"
        />
      </button>

      {/* Search Input */}
      <div className="relative flex-1 mr-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
          🔍
        </span>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects, team members, queries..."
          className="
            w-full lg:w-[90%] px-2 md:!px-5 py-2 md:!py-3
            rounded-full
            bg-white/60 backdrop-blur-md
            border border-gray-200
            focus:outline-none focus:ring-2 focus:ring-indigo-500
            transition-all
            placeholder-gray-400
            !text-xs md:!text-sm
          "
        />
      </div>

      {/* Profile Section */}
      <div className="flex items-center gap-4 p-1 bg-blue-50 border-1 px-2 rounded-full border-gray-200">
        <div className="text-right leading-tight hidden sm:block">
          <p className="text-sm font-semibold text-gray-700 pt-2.5">{userName}</p>
        </div>

        {token ? (
          <Link to="/profile" className="relative group">
            <div className="w-9 h-9 rounded-full ring-2 ring-indigo-500 ring-offset-1 shadow-sm overflow-hidden group-hover:scale-105 transition">
              <img
                src={profileImgSrc}
                onError={(e) => (e.currentTarget.src = PLACEHOLDER)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </Link>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shadow-md hover:bg-indigo-700 transition"
          >
            <img className="w-5" src={PLACEHOLDER} alt="Login" />
          </button>
        )}
      </div>
    </div>
  </div>
);


};

export default SearchBar;
