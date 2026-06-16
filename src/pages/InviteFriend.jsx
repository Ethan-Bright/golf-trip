import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTournament } from "../context/TournamentContext";
import PageShell from "../components/layout/PageShell";

const shareSteps = [
  {
    title: "Send them the link",
    detail:
      "Share the invite link below. It takes them straight to the registration screen with your tournament tagged in the URL for quick onboarding.",
  },
  {
    title: "Have them register or sign in",
    detail:
      "New golfers create an account, returning golfers just log in. Once inside, they will see a prompt to join your tournament.",
  },
  {
    title: "Assign them to a team",
    detail:
      "After they appear in your member list, head to Join/Leave Team or Manage Tournaments to place them in the right squad.",
  },
];

const reminders = [
  "Friends need a registered account before they can view tournaments or scorecards.",
  "Keep an eye on tournament membership so everyone lands in the correct event.",
  "Share the Join Team screen if they need to pick partners after registering.",
];

export default function InviteFriend() {
  const navigate = useNavigate();
  const { currentTournament } = useTournament();
  const [tournamentName, setTournamentName] = useState("");
  const [copyState, setCopyState] = useState("Copy link");

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = `${window.location.origin}/register`;
    return currentTournament ? `${base}?tournament=${currentTournament}` : base;
  }, [currentTournament]);

  useEffect(() => {
    const fetchTournamentName = async () => {
      if (!currentTournament) {
        setTournamentName("");
        return;
      }
      try {
        const ref = doc(db, "tournaments", currentTournament);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTournamentName(snap.data().name || "");
        } else {
          setTournamentName("");
        }
      } catch (error) {
        console.error("Failed to load tournament name", error);
        setTournamentName("");
      }
    };

    fetchTournamentName();
  }, [currentTournament]);

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopyState("Copied!");
      setTimeout(() => setCopyState("Copy link"), 1800);
    } catch (error) {
      console.error("Copy failed", error);
      setCopyState("Copy failed");
      setTimeout(() => setCopyState("Copy link"), 1800);
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Golf Trip Leaderboard",
          text:
            tournamentName?.length > 0
              ? `Join our ${tournamentName} event on Golf Trip Leaderboard.`
              : "Join our Golf Trip Leaderboard event.",
          url: inviteLink,
        });
      } catch (error) {
        console.error("Share canceled or failed", error);
      }
    } else {
      handleCopy();
    }
  };

  return (
    <PageShell
      eyebrow="Spread the word"
      title="Invite a Friend"
      description="Share your trip in a couple taps. Use the link below or any messaging app to bring another golfer into your tournament."
      showBackButton={false}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-sm"
          >
            Back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-primary btn-sm"
          >
            Dashboard
          </button>
        </div>
      }
    >
      <section className="mobile-card space-y-4 p-6">
        <div className="flex flex-col gap-2">
          <span className="eyebrow">
            Current tournament
          </span>
          <p className="text-2xl font-bold text-[var(--text-strong)]">
            {tournamentName || "Select a tournament on the dashboard first"}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            We include the tournament id in the invite link so friends land in the right place automatically.
          </p>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex-1">
            <label className="field-label">
              Invite link
            </label>
            <div className="input break-all">
              {inviteLink || "Link available after the page loads in the browser."}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={handleCopy}
              className="btn btn-primary flex-1"
              disabled={!inviteLink}
            >
              {copyState}
            </button>
            <button
              onClick={handleShare}
              className="btn btn-secondary flex-1"
              disabled={!inviteLink}
            >
              Share
            </button>
          </div>
        </div>
      </section>

      <section className="mobile-section">
        {shareSteps.map((step, index) => (
          <article
            key={step.title}
            className="mobile-card p-6 flex gap-4"
          >
            <div className="icon-tile bg-brand-500/15 text-brand-600 dark:text-brand-300 font-black text-lg">
              {index + 1}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-strong)]">{step.title}</h2>
              <p className="text-[var(--text-muted)] mt-2">{step.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mobile-card p-6">
        <h3 className="text-lg font-semibold text-[var(--text-strong)]">Quick reminders</h3>
        <ul className="mt-3 text-[var(--text-muted)] space-y-2 list-disc pl-6">
          {reminders.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}

