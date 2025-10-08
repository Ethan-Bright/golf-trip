import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-100 p-6 text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-14 text-green-900">
        Golf Trip Leaderboard
      </h1>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs mx-auto">
        <button
          onClick={() => navigate("/login")}
          className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold shadow-lg hover:bg-green-800 transition"
        >
          Login
        </button>
        <button
          onClick={() => navigate("/register")}
          className="w-full py-3 bg-yellow-500 text-green-900 rounded-xl font-semibold shadow-lg hover:bg-yellow-600 transition"
        >
          Register
        </button>
      </div>

      <footer className="mt-10 text-green-900 text-sm sm:text-base">
        2025 Golf Trip Leaderboard
      </footer>
    </div>
  );
}
