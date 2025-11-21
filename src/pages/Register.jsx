import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import React from "react";
import PageShell from "../components/layout/PageShell";

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
      navigate("/tournament-select");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <PageShell
      title="Create Account"
      description="Join the golf tournament community"
      backHref="/"
      actions={
        <button
          onClick={() => navigate("/login")}
          className="px-4 py-2 rounded-2xl border border-green-500 text-green-600 dark:text-green-300 font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition"
        >
          Sign in
        </button>
      }
    >
      <div className="w-full max-w-md mx-auto">
        <section className="mobile-card p-8 space-y-6 border border-gray-200/70 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              placeholder="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            />

            <input
              type="number"
              step="0.1"
              placeholder="Handicap"
              value={handicap}
              onChange={(e) => setHandicap(e.target.value)}
              required
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            />

            <button
              type="submit"
              className="w-full py-4 bg-yellow-500 dark:bg-yellow-400 text-gray-900 dark:text-gray-900 font-semibold rounded-2xl shadow-lg hover:bg-yellow-600 dark:hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:focus:ring-yellow-400 dark:focus:ring-offset-gray-800 transition-all duration-200"
            >
              Create Account
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-green-600 dark:text-green-400 font-semibold"
            >
              Sign in
            </button>
          </p>
        </section>

        <p className="mt-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          Golf Trip Leaderboard
        </p>
      </div>
    </PageShell>
  );
}
