import React from "react";
import { courses } from "../data/courses";

export default function Matchplay2v2GameScorecardModal({ game, teamsData, onClose }) {
  if (!game) return null;

  const course = courses.find(c => c.id === game.courseId);
  const players = game.players || [];

  if (!players || players.length === 0 || !teamsData || teamsData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            {!teamsData || teamsData.length === 0 ? "Not enough teams found for this game." : "No players found for this game."}
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

  const gamePlayersMap = {};
  players.forEach(p => gamePlayersMap[p.userId] = p);
  
  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  const getTeamBestScore = (team, displayIndex) => {
    if (!team.players) return null;
    
    const playerScores = team.players
      .map(player => {
        const playerData = gamePlayersMap[player.id || player.uid];
        return {
          playerName: player.displayName || player.name || 'Unknown',
          score: playerData?.scores?.[displayIndex]?.netScore
        };
      })
      .filter(s => s.score != null);
    
    if (playerScores.length === 0) return null;
    
    const minScore = Math.min(...playerScores.map(s => s.score));
    const bestPlayer = playerScores.find(s => s.score === minScore);
    
    return {
      score: minScore,
      playerName: bestPlayer.playerName
    };
  };

  const getHoleWinner = (displayIndex) => {
    const teamScores = teamsData.map(team => ({
      teamId: team.id,
      bestScore: getTeamBestScore(team, displayIndex)
    })).filter(t => t.bestScore !== null);

    if (teamScores.length === 0) return null;
    if (teamScores.length === 1) return teamScores[0];

    const minScore = Math.min(...teamScores.map(t => t.bestScore.score));
    const winners = teamScores.filter(t => t.bestScore.score === minScore);
    
    return winners.length === 1 ? winners[0] : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {game.name} - Game Scorecard
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
                <th className="px-1 py-2 text-center bg-gray-100 dark:bg-gray-800 w-12">Hole</th>
                {course && <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">Par</th>}
                {teamsData.map((team) => (
                  <th
                    key={team.id}
                    className="px-2 py-2 text-center font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                  >
                    {team.name || team.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const hole = course?.holes?.[holeIndex];
                const par = hole?.par || "?";
                const winner = getHoleWinner(displayIndex);
                
                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-gray-200 dark:border-gray-600"
                  >
                    <td className="px-1 py-2 text-center font-medium text-gray-900 dark:text-white">
                      {holeIndex + 1}
                    </td>
                    {course && (
                      <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300">
                        {par}
                      </td>
                    )}
                    {teamsData.map((team) => {
                      const teamScore = getTeamBestScore(team, displayIndex);
                      const isWinner = winner && winner.teamId === team.id;
                      
                      return (
                        <td
                          key={`${team.id}-${holeIndex}`}
                          className={`px-2 py-2 text-center ${
                            isWinner
                              ? "bg-green-300 dark:bg-green-800/70 font-bold rounded-xl border-2 border-green-600 dark:border-green-400 shadow-md"
                              : ""
                          }`}
                        >
                          {teamScore !== null ? (
                            <div>
                              <div>{teamScore.score}</div>
                              {isWinner && (
                                <div className="text-xs text-green-800 dark:text-green-200 mt-1">
                                  {teamScore.playerName}
                                </div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
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

