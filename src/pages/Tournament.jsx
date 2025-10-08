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

  if (!tournament) return <div>Loading tournament...</div>;

  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-gray-100">
      <h2 className="text-2xl font-bold mb-6">{tournament.name}</h2>
  
      <div className="w-full max-w-md mb-6">
        <ScoreEntry tournamentId={tournamentId} />
      </div>
  
      <div className="w-full max-w-md">
        <Leaderboard tournamentId={tournamentId} />
      </div>
    </div>
  );
  
}
