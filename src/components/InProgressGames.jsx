import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";

export default function InProgressGames({ userId, onJoin }) {
  const [games, setGames] = useState([]);

  useEffect(() => {
    const fetchGames = async () => {
      const q = query(collection(db, "games"), where("status", "==", "inProgress"));
      const snapshot = await getDocs(q);
      setGames(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchGames();
  }, []);

  const joinGame = async (game) => {
    const alreadyJoined = game.players.some(p => p.userId === userId);
    if (!alreadyJoined) {
      const gameRef = doc(db, "games", game.id);
      await updateDoc(gameRef, {
        players: [
          ...game.players,
          { userId, scores: Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, gross: null, net: null })) }
        ]
      });
    }
    onJoin(game.id);
  };

  return (
    <div className="max-w-md mx-auto mt-6 p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl shadow-lg border border-green-100 dark:border-green-800">
      <h2 className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300 mb-4 text-center">In-Progress Games</h2>

      <div className="flex flex-col gap-3 sm:gap-4">
        {games.length === 0 && <p className="text-green-700 dark:text-green-300 text-center text-sm sm:text-base">No games currently in progress.</p>}

        {games.map(game => {
          const joined = game.players.some(p => p.userId === userId);
          return (
            <div
              key={game.id}
              className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-green-100 dark:border-green-800"
            >
              <span className="font-semibold text-green-700 dark:text-green-300 text-sm sm:text-base break-words">{game.name}</span>
              <button
                onClick={() => joinGame(game)}
                className={`px-4 py-3 sm:py-2 rounded-xl font-semibold transition whitespace-nowrap text-sm sm:text-base ${
                  joined
                    ? "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
                    : "bg-green-700 dark:bg-green-600 text-white hover:bg-green-800 dark:hover:bg-green-700"
                }`}
              >
                {joined ? "Enter Scores" : "Join Game"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
