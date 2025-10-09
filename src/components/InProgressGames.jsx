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
    <div className="max-w-md mx-auto mt-6 p-6 bg-green-50 rounded-2xl shadow-lg border border-green-100">
      <h2 className="text-2xl font-bold text-green-700 mb-4 text-center">In-Progress Games</h2>

      <div className="flex flex-col gap-4">
        {games.length === 0 && <p className="text-green-700 text-center">No games currently in progress.</p>}

        {games.map(game => {
          const joined = game.players.some(p => p.userId === userId);
          return (
            <div
              key={game.id}
              className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-green-100"
            >
              <span className="font-semibold text-green-700">{game.name}</span>
              <button
                onClick={() => joinGame(game)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  joined
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-green-700 text-white hover:bg-green-800"
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
