import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto text-center">
        <div className="mb-12">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Golf Trip
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-green-700 dark:text-green-300 mb-2">
            Leaderboard
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Track your golf tournament scores and compete with friends
          </p>
        </div>

        <div className="space-y-4 mb-12">
          <button
            onClick={() => navigate("/login")}
            className="w-full py-4 bg-green-600 dark:bg-green-500 text-white font-semibold rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="w-full py-4 bg-yellow-500 dark:bg-yellow-400 text-gray-900 dark:text-gray-900 font-semibold rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-yellow-400 dark:focus:ring-offset-gray-800"
          >
            Create Account
          </button>
        </div>

        <div className="text-gray-500 dark:text-gray-400 text-sm">
          <p>© 2025 Golf Trip Leaderboard</p>
        </div>
      </div>
    </div>
  );
}
