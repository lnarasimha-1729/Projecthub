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
  const { token, navigate, users } = useContext(UsersContext);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
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
      const decoded = jwtDecode(localStorage.getItem("token"))
      return decoded.name;
    }, [token]);

  return (
    <div className="py-6 bg-gray-50">
      <div className="flex items-center justify-between px-12">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search... (projects, teams, tasks)"
          className="border border-gray-400 bg-white w-[80%] py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
        />

        <div className="flex items-center gap-3">
          <p className="text-sm font-medium">{userName}</p>

          {token ? (
            <Link to="/profile" title="View profile" className="relative">
              <img
                src={profileImgSrc}
                alt={profile?.name?.[0] || "Profile"}
                className="w-9 h-9 rounded-full object-cover border"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER;
                }}
              />
            </Link>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="p-1.5 w-9 h-9 rounded-full bg-black flex items-center justify-center"
              aria-label="Login"
            >
              <img className="w-5 h-5" src={PLACEHOLDER} alt="Login" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
