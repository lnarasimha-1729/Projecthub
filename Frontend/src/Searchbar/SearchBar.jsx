import React, { useContext, useEffect, useState, useMemo } from "react";
import { UsersContext } from "../Context/UserContext";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";

const SearchBar = () => {
  const { token, setToken, navigate } = useContext(UsersContext);
  const [query, setQuery] = useState("");
  const userName = useMemo(() => {
      try {
        if (!token) return "";
        const { email } = jwtDecode(token);
        return email?.split("@")[0]?.split(".")[0] || "";
      } catch {
        return "";
      }
    }, [token]);

    console.log(userName);
    

  return (
    <div className="py-6 bg-gray-50">
      <div className="flex items-center justify-between px-12">
        {/* Search input */}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          aria-label="Search projects, teams, or tasks"
          className="border border-gray-400 bg-white w-[80%] py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
        />

        {/* Profile */}
        <div className="flex gap-2">
        <p className="group relative">{userName}</p>
        <div className="group relative bg-black p-1.5 w-7 h-7 rounded-full cursor-pointer">
          
          <img
            onClick={() => (token ? null : navigate("/login"))}
            className="w-4"
            src="https://img.icons8.com/?size=100&id=12437&format=png&color=FFFFFF"
            alt="profile"
          />
          {token && (
            <Link to={"/profile"}>
            <div className="hidden group-hover:block absolute right-0 top-full w-32 bg-white border border-gray-300 rounded shadow-md">
              <p
                className="px-4 py-2 cursor-pointer hover:bg-black hover:text-white"
              >
                profile
              </p>
            </div>
            </Link>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;