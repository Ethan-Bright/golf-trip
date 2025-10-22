import React from "react";

export default function MatchplayScorecardModal({ game, onClose }) {
  if (!game) return null;

  const { players } = game;

  const getHoleWinners = (holeIndex) => {
    const scores = players
      .map((p) => ({ name: p.name, net: p.scores[holeIndex]?.net ?? null }))
      .filter((s) => s.net !== null);

    if (scores.length === 0) return [];

    const maxNet = Math.max(...scores.map((s) => s.net));
    const winners = scores.filter((s) => s.net === maxNet);

    return winners.length === 1 ? winners[0].name : [];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
          {game.name}
        </h2>

        {/* Responsive Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Hole</th>
                {players.map((p) => (
                  <th
                    key={p.userId}
                    className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 18 }).map((_, holeIndex) => {
                const winnerName = getHoleWinners(holeIndex);
                return (
                  <tr
                    key={holeIndex}
                    className="border-t border-gray-200 dark:border-gray-600"
                  >
                    <td className="px-2 py-1 font-medium text-gray-900 dark:text-white">
                      {holeIndex + 1}
                    </td>
                    {players.map((p) => {
                      const netScore = p.scores[holeIndex]?.net ?? "-";
                      const isWinner = winnerName === p.name;
                      return (
                        <td
                          key={p.userId + holeIndex}
                          className={`px-2 py-1 text-center ${
                            isWinner
                              ? "bg-green-300 dark:bg-green-800/70 font-bold rounded-xl border border-green-600 dark:border-green-400 shadow-md text-green-900 dark:text-green-200"
                              : ""
                          }`}
                        >
                          {netScore}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked version */}
        <div className="sm:hidden space-y-4">
          {Array.from({ length: 18 }).map((_, holeIndex) => {
            const winnerName = getHoleWinners(holeIndex);
            return (
              <div
                key={holeIndex}
                className="bg-gray-100 dark:bg-gray-800 rounded-xl p-2 shadow-inner"
              >
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  Hole {holeIndex + 1}
                </div>
                <div className="space-y-1">
                  {players.map((p) => {
                    const netScore = p.scores[holeIndex]?.net ?? "-";
                    const isWinner = winnerName === p.name;
                    return (
                      <div
                        key={p.userId + holeIndex}
                        className={`flex justify-between px-2 py-1 rounded-xl ${
                          isWinner
                            ? "bg-green-300 dark:bg-green-800/70 font-bold border border-green-600 dark:border-green-400 text-green-900 dark:text-green-200"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                        }`}
                      >
                        <span>{p.name}</span>
                        <span>{netScore}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
