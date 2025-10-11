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
      
      // Set default selected game
      if (games.length > 0) {
        const defaultGame = games[0]; // Most recent game
        setSelectedGameId(defaultGame.id);
        setGame(defaultGame);
      }
    }
    
    if (tournamentId) {
      // If tournamentId is provided via props, use it
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

  // Update game when selectedGameId changes
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
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-6">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl"
          >
            ← Back to Dashboard
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Games</h3>
            <p className="text-gray-600 dark:text-gray-300">Create a game first to view the leaderboard</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-6">
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl"
        >
          ← Back to Dashboard
        </button>

        {/* Game Selection Dropdown */}
        {allGames.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Game
            </label>
            <select
              value={selectedGameId || ''}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
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
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{game.name}</h2>
          <p className="text-lg font-medium text-green-600 dark:text-green-400 mb-1">
            {game.course?.name || 'Unknown Course'}
          </p>
          {game.createdAt && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(game.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-8">
          <LeaderboardComponent tournamentId={selectedGameId} />
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          Golf Tournament Tracker
        </div>
      </div>
    </div>
  );
}
