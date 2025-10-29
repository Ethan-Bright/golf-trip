import React from "react";

export default function MatchplayGrossScorecardModal({ game, selectedTeam, onClose }) {
  if (!game || !selectedTeam) return null;

  // Get the actual game players data with scores
  const allGamePlayers = game.players || [];
  
  // For 1v1 matches, show both players
  const players = allGamePlayers.length >= 2 ? allGamePlayers : (selectedTeam.players || []);
  
  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  if (!players || players.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            No players found for this game.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getHoleWinners = (displayIndex) => {
    const actualIndex = startIndex + displayIndex;
    const scores = players
      .map((p) => ({ 
        userId: p.userId,
        name: p.name, 
        gross: p.scores[actualIndex]?.gross ?? null 
      }))
      .filter((s) => s.gross !== null && s.gross > 0);

    if (scores.length === 0) return null;

    const minGross = Math.min(...scores.map((s) => s.gross));
    const winners = scores.filter((s) => s.gross === minGross);

    return winners.length === 1 ? winners[0] : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-md w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {game.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl sm:text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full border-separate border-spacing-1 text-xs sm:text-sm min-w-[400px]">
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
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const winnerInfo = getHoleWinners(displayIndex);
                const winnerUserId = winnerInfo?.userId;
                const winnerName = winnerInfo?.name;
                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-gray-200 dark:border-gray-600"
                  >
                    <td className="px-2 py-1 font-medium text-gray-900 dark:text-white">
                      {holeIndex + 1}
                    </td>
                    {players.map((p) => {
                      const actualIndex = startIndex + displayIndex;
                      const gross = p.scores[actualIndex]?.gross ?? null;
                      const isWinner = winnerUserId && winnerUserId === p.userId;
                      return (
                        <td
                          key={p.userId + displayIndex}
                          className={`px-2 py-1 text-center ${
                            isWinner
                              ? "bg-green-300 dark:bg-green-800/70 font-bold rounded-xl border border-green-600 dark:border-green-400 shadow-md text-green-900 dark:text-green-200"
                              : ""
                          }`}
                        >
                          {gross !== null && gross > 0 ? gross : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-center px-3 sm:px-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl sm:rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

