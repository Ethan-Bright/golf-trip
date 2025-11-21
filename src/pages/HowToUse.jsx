import React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/layout/PageShell";

const flowSteps = [
  {
    title: "1. Choose or Create a Tournament",
    description:
      "Start on the Dashboard and tap \"Manage Tournaments\" to pick an existing event or create a new one for your trip. The active tournament controls which teams, matches, and stats you see everywhere else in the app.",
    tips: ["Need to switch events later? Open the tournament modal any time.", "Make sure every golfer joins the same tournament so standings stay in sync."],
  },
  {
    title: "2. Build Teams & Invite Players",
    description:
      "Use the \"Join/Leave Team\" and \"View Teams\" cards to organize foursomes or special game formats. Add members or update rosters before matches start.",
    tips: ["Tap \"View Members\" to see who is already in the trip.", "Team updates automatically feed into every scoring format."],
  },
  {
    title: "3. Create Matches & Select Formats",
    description:
      "From \"Create Match\" choose the course, format (stroke, match play, Stableford, Wolf, etc.), and which players are participating. Save once everyone agrees on the setup.",
    tips: ["Different formats can coexist inside the same tournament.", "Reuse existing matches by editing instead of recreating from scratch."],
  },
  {
    title: "4. Enter Scores On Course",
    description:
      "Head to \"Enter Scores\" to record hole-by-hole results. Each match shows its own scorecard with live validation so every player can follow along in real time.",
    tips: [
      "Only the holes you play appear, keeping data entry quick.",
      "You can pause mid-round and continue later - the app autosaves progress.",
    ],
  },
  {
    title: "5. Track Results & Personal Stats",
    description:
      "Visit the \"Leaderboard\" for overall standings, or \"View My Stats\" for your personal highlights. Course info is just one tap away whenever you need a yardage refresher.",
    tips: ["Use leaderboards to compare gross, net, and specialty games.", "Stats update instantly after each score submission."],
  },
];

const quickHelp = [
  "Profile settings (photo, handicap, password) live under your avatar or the burger menu.",
  
  "If anything looks off, refresh data by toggling tournaments or re-opening the page.",
  "Need a feature? Use the \"Submit Suggestions\" form in the burger menu.",
];

export default function HowToUse() {
  const navigate = useNavigate();

  return (
    <PageShell
      eyebrow="Getting Started"
      title="How to Use Golf Trip Leaderboard"
      description="Follow this quick tour whenever you need to remind golfers how to get from sign-in to friendly trash talk."
      showBackButton={false}
      actions={
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2 rounded-2xl bg-green-600 text-white font-semibold shadow-lg hover:bg-green-700 transition"
          >
            Dashboard
          </button>
        </div>
      }
    >
      <section className="mobile-section">
        {flowSteps.map(({ title, description, tips }) => (
          <article
            key={title}
            className="mobile-card p-6 border border-green-100/60 dark:border-gray-700/70"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mt-2">{description}</p>
            <ul className="mt-4 text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc pl-5">
              {tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="mobile-card p-6 border border-dashed border-green-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Quick Help
        </h3>
        <ul className="space-y-2 text-gray-700 dark:text-gray-300 list-disc pl-5">
          {quickHelp.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/submit-suggestion")}
            className="px-5 py-2 rounded-2xl bg-yellow-500 text-white font-semibold shadow hover:bg-yellow-600 transition"
          >
            Submit a Suggestion
          </button>
          <button
            onClick={() => navigate("/scores")}
            className="px-5 py-2 rounded-2xl border border-green-500 text-green-600 dark:text-green-300 font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition"
          >
            Practice Entering Scores
          </button>
        </div>
      </section>
    </PageShell>
  );
}

