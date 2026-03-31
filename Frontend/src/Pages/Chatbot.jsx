import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

export default function Chatbot() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "👋 Hi! I'm your Project Assistant. How can I help?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:4000/api/chat/ask", {
        question: input,
      });

      const reply = res.data.answer || "No response from AI.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Oops! Something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-indigo-50 via-white to-purple-100 p-4 md:p-4 lg:p-6 overflow-hidden">
      <div
        className="w-full h-[70vh] mt-20 max-w-3xl bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden"
        
      >
        {/* Header */}
        <div className="bg-indigo-600 text-white text-sm md:text-sm lg:text-md font-semibold py-3 px-6 shadow">
          Project Assistant 🤖
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-2 md:p-2 lg:p-3 rounded-lg md:rounded-xl lg:rounded-2xl text-xs md:text-sm lg:text-sm shadow-md ${
                  msg.role === "user"
                    ? "bg-indigo-500 text-white rounded-br-none"
                    : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="text-xs md:text-sm lg:text-sm bg-gray-100 text-gray-600 px-3 py-1 md:py-2 lg:py-2 rounded-lg md:rounded-xl lg:rounded-2xl animate-pulse">
                Thinking...
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t flex items-center gap-2 p-3 bg-white">
  <textarea
    value={input}
    onChange={(e) => setInput(e.target.value)}
    onKeyDown={handleKeyPress}
    placeholder="Ask something about your projects..."
    rows={1}
    className="flex-1 resize-none px-2 py-1.5 lg:p-3 md:p-2 rounded-xl border border-gray-300 placeholder:text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:pt-1"
  />

  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={sendMessage}
    disabled={loading}
    className="bg-indigo-600 text-white p-2 md:p-2.5 lg:p-3 rounded shadow hover:bg-indigo-700 transition flex items-center justify-center"
  >
    <PaperAirplaneIcon className="h-5 w-5 text-white" /> 
  </motion.button>
</div>

      </div>
    </div>
  );
}
