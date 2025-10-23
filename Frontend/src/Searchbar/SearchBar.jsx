import React, { useContext, useState } from "react";
import { UsersContext } from "../Context/UserContext";

const SearchBar = () => {
  const { token, setToken, navigate } = useContext(UsersContext);
  const [query, setQuery] = useState("");

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    navigate("/login");
  };

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

        {/* Profile / Logout */}
        <div className="group relative bg-black p-2 rounded-sm cursor-pointer">
          <img
            onClick={() => (token ? null : navigate("/login"))}
            className="w-6"
            src="https://img.icons8.com/?size=100&id=12437&format=png&color=FFFFFF"
            alt="profile"
          />
          {token && (
            <div className="hidden group-hover:block absolute right-0 top-full w-32 bg-white border border-gray-300 rounded shadow-md">
              <p
                onClick={logout}
                className="px-4 py-2 cursor-pointer hover:bg-black hover:text-white"
              >
                Logout
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;