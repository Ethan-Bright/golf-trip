import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import React from "react";
import PageShell from "../components/layout/PageShell";
import { useGameInviteRedirect } from "../hooks/useGameInviteRedirect";
import { getPendingGameInvite } from "../lib/gameInvite";

export default function Register() {
  const { signup, setUserAndPersist } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { processInviteIfPending } = useGameInviteRedirect();
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [handicap, setHandicap] = useState("");
  const [error, setError] = useState("");

  const pendingGameId = searchParams.get("game") || getPendingGameInvite();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await signup(displayName, password, handicap, null);
      setUserAndPersist(userData);

      if (pendingGameId) {
        const joined = await processInviteIfPending(userData);
        if (joined) return;
      }

      navigate("/tournament-select");
    } catch (err) {
      setError(err.message);
    }
  };

  const loginHref = pendingGameId
    ? `/login?game=${pendingGameId}`
    : "/login";

  return (
    <PageShell
      title="Create Account"
      description={
        pendingGameId
          ? "Create your account to join the game you've been invited to."
          : "Join the golf tournament community"
      }
      backHref="/"
      actions={
        <button
          onClick={() => navigate(loginHref)}
          className="btn btn-secondary btn-sm"
        >
          Sign in
        </button>
      }
    >
      <div className="w-full max-w-md mx-auto">
        {pendingGameId && (
          <div className="mb-4 p-4 rounded-2xl border border-brand-500/30 bg-brand-500/10 text-sm text-[var(--text-strong)]">
            You&apos;re joining via a game invite. After creating your account,
            we&apos;ll add you to the tournament and game automatically.
          </div>
        )}

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
              {pendingGameId ? "Create Account & Join Game" : "Create Account"}
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
              onClick={() => navigate(loginHref)}
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
