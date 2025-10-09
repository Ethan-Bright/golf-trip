import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import LeaderboardComponent from "../components/Leaderboard";

export default function Leaderboard({ tournamentId }) {
  const [game, setGame] = useState(null);
  const [allGames, setAllGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAllGames() {
      // Load all games for the dropdown
      const q = query(
        collection(db, "games"),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllGames(games);
      console.log("Found all games:", games);
      
      // Set default selected game
      if (games.length > 0) {
        const defaultGame = games[0]; // Most recent game
        setSelectedGameId(defaultGame.id);
        setGame(defaultGame);
      }
    }
    
    if (tournamentId) {
      // If tournamentId is provided, use it
      const loadSpecificGame = async () => {
        const gdoc = await getDoc(doc(db, "games", tournamentId));
        if (gdoc.exists()) {
          setGame({ id: tournamentId, ...gdoc.data() });
          setSelectedGameId(tournamentId);
        }
      };
      loadSpecificGame();
    } else {
      loadAllGames();
    }
  }, [tournamentId]);

  // Handle game selection change
  useEffect(() => {
    if (selectedGameId && allGames.length > 0) {
      const selectedGame = allGames.find(g => g.id === selectedGameId);
      if (selectedGame) {
        setGame(selectedGame);
      }
    }
  }, [selectedGameId, allGames]);

  if (!game)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="self-start mb-6 px-4 py-2 bg-green-200 text-green-900 rounded-lg hover:bg-green-300 transition"
        >
          &larr; Back to Dashboard
        </button>
        
        <p className="text-gray-600 text-lg text-center">No active games found. Create a game first!</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-b from-green-50 to-white p-4">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="self-start mb-4 px-4 py-2 bg-green-200 text-green-900 rounded-lg hover:bg-green-300 transition"
      >
        &larr; Back to Dashboard
      </button>

      {/* Game Selection Dropdown */}
      {allGames.length > 1 && (
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-5 mb-4">
          <label className="block text-sm font-medium text-green-700 mb-2">
            Select Game:
          </label>
          <select
            value={selectedGameId || ''}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full p-3 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {allGames.map(game => (
              <option key={game.id} value={game.id}>
                {game.name} - {game.course?.name || 'Unknown Course'} - {game.createdAt ? new Date(game.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown Date'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Game Header */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-5 mb-6 text-center">
        <h2 className="text-3xl font-bold text-green-700 mb-1">{game.name}</h2>
        <p className="text-lg font-medium text-green-600 mb-1">
          {game.course?.name || 'Unknown Course'}
        </p>
        {game.createdAt && (
          <p className="text-sm text-gray-500">
            {new Date(game.createdAt.seconds * 1000).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Leaderboard Section */}
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-5 mb-8">
        
        <LeaderboardComponent tournamentId={game.id} />
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-400 mt-auto mb-2">🏌️ Golf Tournament Tracker</p>
    </div>
  );
}
