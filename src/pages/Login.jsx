import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import React from "react";
import PageShell from "../components/layout/PageShell";

export default function Login() {
  const { login, setUserAndPersist, user, loading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      const hasTournaments = Array.isArray(user.tournaments) && user.tournaments.length > 0;
      navigate(hasTournaments ? "/dashboard" : "/tournament-select", { replace: true });
    }
  }, [loading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await login(displayName, password);
      setUserAndPersist(userData, rememberMe);
      
      // If user has tournaments, go to dashboard; otherwise go to tournament-select
      if (userData.tournaments && userData.tournaments.length > 0) {
        navigate("/dashboard");
      } else {
        navigate("/tournament-select");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <PageShell
      title="Welcome Back"
      description="Sign in to your account"
      backHref="/"
      actions={
        <button
          onClick={() => navigate("/register")}
          className="px-4 py-2 rounded-2xl border border-green-500 text-green-600 dark:text-green-300 font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition"
        >
          Create account
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
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            />

            <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 gap-2">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
              />
              Remember me
            </label>

            <button
              type="submit"
              className="w-full py-4 bg-green-600 dark:bg-green-500 text-white font-semibold rounded-2xl shadow-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 transition-all duration-200"
            >
              Sign In
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
            Need an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-green-600 dark:text-green-400 font-semibold"
            >
              Create one
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
