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
          className="btn btn-secondary btn-sm"
        >
          Create account
        </button>
      }
    >
      <div className="w-full max-w-md mx-auto">
        <section className="card p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="field-label">Display name</label>
              <input
                type="text"
                placeholder="e.g. Tiger"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
              />
            </div>

            <label className="flex items-center text-sm text-[var(--text-muted)] gap-2.5 cursor-pointer">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-brand-500 rounded"
              />
              Remember me
            </label>

            <button type="submit" className="btn btn-primary btn-block">
              Sign In
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-[var(--text-muted)] text-sm">
            Need an account?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-brand-600 dark:text-brand-300 font-semibold"
            >
              Create one
            </button>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
