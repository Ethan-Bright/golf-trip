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
    <div className="max-w-md mx-auto p-4 flex flex-col items-center min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-2">Welcome, {user?.displayName || "Golfer"}!</h2>
      <p className="mb-6 text-gray-700">Your Handicap: {user?.handicap}</p>

      <div className="w-full flex flex-col gap-4">
        <button
          className="w-full py-4 text-lg rounded-lg bg-green-500 text-white font-semibold hover:bg-green-600 transition"
          onClick={() => navigate("/leaderboard")}
        >
          Leaderboard
        </button>

        <button
          className="w-full py-4 text-lg rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
          onClick={() => navigate("/scores")}
        >
          Enter Scores
        </button>

        <button
          className="w-full py-4 text-lg rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition"
          onClick={() => navigate("/courses")}
        >
          Courses Info
        </button>

        <button
          className="w-full py-4 text-lg rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

