import React from 'react';

export default function ProjectAssistant() {
  return (
    <div className='bg-gray-100 mt-26 p-4 min-h-screen'>
    <div className="w-3/4 mx-auto bg-white rounded-3xl p-6 shadow-md">
      {/* Title */}
      <p className="text-center font-bold text-3xl mb-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
        Project Assistant
      </p>

      {/* Assistant greeting card */}
      <div className="bg-white rounded-xl shadow px-6 py-4 flex flex-col gap-1">
        <div className="flex gap-2 items-center font-semibold text-gray-900">
          <span role="img" aria-label="wave" className="text-xl">👋</span>
          Hi! I'm your Project Assistant.
        </div>
        <div className="text-sm text-gray-600">
          You can ask me about workers or projects.
        </div>
      </div>

      {/* Buttons area */}
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          className="bg-blue-100 text-blue-700 text-xs rounded-lg px-3 py-1 shadow-sm hover:bg-blue-200"
        >
          About rohit
        </button>
        <button
          type="button"
          className="bg-blue-100 text-blue-700 text-xs rounded-lg px-3 py-1 shadow-sm hover:bg-blue-200"
        >
          About rahul
        </button>
        <button
          type="button"
          className="bg-green-100 text-green-700 text-xs rounded-lg px-3 py-1 shadow-sm hover:bg-green-200"
        >
          Who is on netrg?
        </button>
      </div>

      {/* Input and send button at bottom */}
      <form className="mt-8 flex items-center bg-white rounded-full shadow-lg">
        <input
          type="text"
          placeholder="Ask about a worker or project..."
          className="flex-grow rounded-full px-6 py-3 outline-none text-gray-700"
        />
        <button
          type="submit"
          className="bg-blue-500 rounded-full p-4 shadow text-white hover:bg-blue-600 transition"
          aria-label="Send query"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 rotate-90"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </button>
      </form>
    </div>
    </div>
  );
}