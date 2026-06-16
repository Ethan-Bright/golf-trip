import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import React from "react";
import PageShell from "../components/layout/PageShell";
import { useGameInviteRedirect } from "../hooks/useGameInviteRedirect";
import { getPendingGameInvite } from "../lib/gameInvite";

export default function Login() {
  const { login, setUserAndPersist, user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { processInviteIfPending } = useGameInviteRedirect();
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const pendingGameId = searchParams.get("game") || getPendingGameInvite();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const redirectExistingUser = async () => {
      if (pendingGameId) {
        const joined = await processInviteIfPending(user);
        if (joined) return;
      }

      const hasTournaments =
        Array.isArray(user.tournaments) && user.tournaments.length > 0;
      navigate(hasTournaments ? "/dashboard" : "/tournament-select", {
        replace: true,
      });
    };

    redirectExistingUser();
  }, [loading, user, navigate, pendingGameId, processInviteIfPending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const userData = await login(displayName, password);
      setUserAndPersist(userData, rememberMe);

      if (pendingGameId) {
        const joined = await processInviteIfPending(userData);
        if (joined) return;
      }

      if (userData.tournaments && userData.tournaments.length > 0) {
        navigate("/dashboard");
      } else {
        navigate("/tournament-select");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const registerHref = pendingGameId
    ? `/register?game=${pendingGameId}`
    : "/register";

  return (
    <PageShell
      title="Welcome Back"
      description={
        pendingGameId
          ? "Sign in to join the game you've been invited to."
          : "Sign in to your account"
      }
      backHref="/"
      actions={
        <button
          onClick={() => navigate(registerHref)}
          className="btn btn-secondary btn-sm"
        >
          Create account
        </button>
      }
    >
      <div className="w-full max-w-md mx-auto">
        {pendingGameId && (
          <div className="mb-4 p-4 rounded-2xl border border-brand-500/30 bg-brand-500/10 text-sm text-[var(--text-strong)]">
            You&apos;re joining via a game invite. After signing in, we&apos;ll
            add you to the tournament and game automatically.
          </div>
        )}

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
              {pendingGameId ? "Sign In & Join Game" : "Sign In"}
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
              onClick={() => navigate(registerHref)}
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
