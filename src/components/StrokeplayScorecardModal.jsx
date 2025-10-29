import React from "react";

export default function StrokeplayScorecardModal({ game, selectedTeam, onClose }) {
  if (!game || !selectedTeam) return null;

  // Get ALL players in the game with their scores (for strokeplay, show both players)
  const players = game.players || [];
  
  if (!players || players.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
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
              className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

   // Calculate match status after each hole
   const calculateMatchStatus = (displayIndex) => {
     if (players.length < 2) return { status: "Single Player", player: null };
     
     const player1 = players[0];
     const player2 = players[1];
     const p1Scores = player1.scores || [];
     const p2Scores = player2.scores || [];
     
     let status = 0;
     let holesPlayed = 0;
     
     // Calculate using the actual hole indices (holeIndex, not displayIndex)
     for (let i = 0; i <= displayIndex; i++) {
       const actualHoleIndex = startIndex + i;
       const p1Gross = p1Scores[actualHoleIndex]?.gross;
       const p2Gross = p2Scores[actualHoleIndex]?.gross;
       
       if (p1Gross == null || p2Gross == null) continue;
       
       holesPlayed++;
       if (p1Gross < p2Gross) status++;
       else if (p2Gross < p1Gross) status--;
     }
     
     if (holesPlayed === 0) return { status: "Waiting", player: null };
     if (status === 0) return { status: "All Square", player: null };
     if (status > 0) return { status: `${status} Up`, player: player1.name };
     // If player2 is ahead, show player2 as "Up" instead of player1 as "Down"
     return { status: `${Math.abs(status)} Up`, player: player2.name };
   };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
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
          <table className="w-full border-separate border-spacing-1 text-xs sm:text-sm min-w-[500px]">
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
                <th className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white">
                  Match Status
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const matchData = calculateMatchStatus(displayIndex);
                const hole = game.course?.holes?.[holeIndex];
                const par = hole?.par || "?";
                
                 // Find the best score for this hole to highlight
                 // Use holeIndex for score access to handle back 9 correctly
                 const scores = players.map(p => p.scores[holeIndex]?.gross).filter(s => s != null);
                 const bestScore = scores.length > 0 ? Math.min(...scores) : null;
                 const tiedScores = scores.filter(s => s === bestScore);
                 const isTied = tiedScores.length > 1;
                 
                 return (
                   <tr
                     key={displayIndex}
                     className="border-t border-gray-200 dark:border-gray-600"
                   >
                     <td className="px-2 py-1 font-medium text-gray-900 dark:text-white">
                       <div>
                         <span className="font-bold">{holeIndex + 1}</span>
                         <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">Par {par}</span>
                       </div>
                     </td>
                     {players.map((p) => {
                       // Use holeIndex for score access to handle back 9 correctly  
                       const grossScore = p.scores[holeIndex]?.gross ?? "-";
                       const isBestScore = grossScore !== "-" && grossScore === bestScore;
                      return (
                        <td
                          key={p.userId + displayIndex}
                          className={`px-2 py-1 text-center ${
                            isBestScore 
                              ? isTied
                                ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-lg"
                                : "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-bold rounded-lg"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {grossScore}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-center">
                      {matchData.status.includes("Up") ? (
                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200">
                          {matchData.player} {matchData.status}
                        </span>
                      ) : matchData.status === "All Square" ? (
                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                          {matchData.status}
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {matchData.status}
                        </span>
                      )}
                    </td>
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
