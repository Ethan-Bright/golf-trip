import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      const hasTournaments = Array.isArray(user.tournaments) && user.tournaments.length > 0;
      navigate(hasTournaments ? "/dashboard" : "/tournament-select", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <PageShell
      showBackButton={false}
      bodyClassName="items-center text-center"
      className="min-h-screen justify-center"
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <div className="mb-10">
          <div className="w-24 h-24 mx-auto mb-7 rounded-3xl flex items-center justify-center bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 shadow-[0_24px_60px_-20px_rgba(18,183,106,0.7)] ring-1 ring-white/15">
            <svg className="w-12 h-12 text-[#03150d]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <p className="eyebrow mb-3">The trip companion</p>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-[var(--text-strong)] leading-[0.95]">
            Golf Trip
          </h1>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
            Leaderboard
          </h2>
          <p className="mt-5 text-[var(--text-muted)] text-balance">
            Track tournament scores, run live leaderboards, and settle the bragging rights with your mates.
          </p>
        </div>

        <div className="w-full space-y-3 mb-10">
          <button onClick={() => navigate("/login")} className="btn btn-primary btn-block">
            Sign In
          </button>
          <button onClick={() => navigate("/register")} className="btn btn-secondary btn-block">
            Create Account
          </button>
        </div>

        <p className="text-[var(--text-muted)] text-xs tracking-wide">
          Built for the fairway · Plays great on your phone
        </p>
      </div>
    </PageShell>
  );
}
