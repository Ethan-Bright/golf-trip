import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-green-100 p-6">
      {/* Header */}
      <header className="w-full text-center mb-8 mt-6">
        <h2 className="text-3xl font-extrabold text-green-900">
          Welcome, {user?.displayName || "Golfer"}!
        </h2>
        <p className="text-green-800 mt-2 text-lg">
          Handicap: <span className="font-semibold">{user?.handicap || "—"}</span>
        </p>
      </header>

      {/* Buttons Section */}
      <main className="w-full max-w-xs flex flex-col gap-4">
        <button
          className="w-full py-3 bg-green-700 text-white rounded-xl font-semibold shadow-lg hover:bg-green-800 transition"
          onClick={() => navigate("/leaderboard")}
        >
          View Leaderboard
        </button>

        <button
          className="w-full py-3 bg-yellow-500 text-green-900 rounded-xl font-semibold shadow-lg hover:bg-yellow-600 transition"
          onClick={() => navigate("/scores")}
        >
          Enter Scores
        </button>

        <button
          className="w-full py-3 bg-blue-400 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-500 transition"
          onClick={() => navigate("/courses")}
        >
          Course Info
        </button>

        <button
          className="w-full py-3 bg-red-500 text-white rounded-xl font-semibold shadow-lg hover:bg-red-600 transition"
          onClick={handleLogout}
        >
          Logout
        </button>
      </main>

      {/* Footer */}
      <footer className="mt-10 text-green-900 text-sm">
        2025 Golf Trip Leaderboard
      </footer>
    </div>
  );
}
