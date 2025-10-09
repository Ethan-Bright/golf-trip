import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import React from "react";

export default function Register() {
  const { signup, setUserAndPersist } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [error, setError] = useState("");


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await signup(displayName, password, handicap, null);
      setUserAndPersist(userData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-green-100">
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="self-start mb-6 px-4 py-2 bg-green-200 text-green-900 rounded-lg hover:bg-green-300 transition"
      >
        &larr; Back
      </button>

      <h2 className="text-3xl font-extrabold mb-2 text-green-900">Register</h2>
      <p className="text-green-800 mb-6 text-sm">Join the Golf Trip Leaderboard community</p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 bg-white shadow-md rounded-xl p-6"
      >
        <input
          type="text"
          placeholder="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <input
          type="number"
          placeholder="Handicap"
          value={handicap}
          onChange={(e) => setHandicap(e.target.value)}
          required
          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />


        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-4 py-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />

        <button
          type="submit"
          className="w-full py-3 bg-green-700 text-white font-semibold rounded-lg shadow hover:bg-green-800 transition"
        >
          Register
        </button>
      </form>

      {error && (
        <p className="text-red-500 mt-4 text-sm text-center bg-red-100 px-3 py-2 rounded-lg shadow-sm">
          {error}
        </p>
      )}

      <footer className="mt-10 text-green-900 text-sm">
        © 2025 Golf Trip Leaderboard
      </footer>
    </div>
  );
}
