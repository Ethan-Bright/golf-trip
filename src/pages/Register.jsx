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
          className="btn btn-secondary btn-sm"
        >
          Sign in
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
                placeholder="Pick a name your group will recognise"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="field-label">Handicap</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 12.4"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                required
                className="input"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Create Account
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <p className="text-center text-[var(--text-muted)] text-sm">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-brand-600 dark:text-brand-300 font-semibold"
            >
              Sign in
            </button>
          </p>
        </section>
      </div>
    </PageShell>
  );
}
