import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import ScoreEntry from "../components/ScoreEntry";
import Leaderboard from "../components/Leaderboard";

export default function Tournament({ tournamentId }) {
  const [tournament, setTournament] = useState(null);
  const [courses, setCourses] = useState([]);
  const [rounds, setRounds] = useState([]);

  useEffect(() => {
    async function load() {
      if (!tournamentId) return;
      const tdoc = await getDoc(doc(db, "tournaments", tournamentId));
      setTournament(tdoc.exists() ? tdoc.data() : null);
      // load courses, rounds as needed
    }
    load();
  }, [tournamentId]);

  if (!tournament)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white">
        <p className="text-gray-600 text-lg">Loading tournament...</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      {/* Tournament Header */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-5 mb-6 text-center">
        <h2 className="text-3xl font-bold text-green-700 mb-1">{tournament.name}</h2>
        {tournament.date && (
          <p className="text-sm text-gray-500">
            {new Date(tournament.date).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Score Entry Section */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-5 mb-6">
        <h3 className="text-xl font-semibold text-green-700 mb-4">Enter Your Score</h3>
        <ScoreEntry tournamentId={tournamentId} />
      </div>

      {/* Leaderboard Section */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-5 mb-8">
        <h3 className="text-xl font-semibold text-green-700 mb-4">Leaderboard</h3>
        <Leaderboard tournamentId={tournamentId} />
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-auto mb-2">🏌️ Golf Tournament Tracker</p>
    </div>
  );
}
