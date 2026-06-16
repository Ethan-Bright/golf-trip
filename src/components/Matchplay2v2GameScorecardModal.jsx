import React from "react";
import { courses } from "../data/courses";

export default function Matchplay2v2GameScorecardModal({ game, teamsData, onClose }) {
  if (!game) return null;

  const course = courses.find(c => c.id === game.courseId);
  const players = game.players || [];

  if (!players || players.length === 0 || !teamsData || teamsData.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="card card-elevated max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-[var(--text-strong)] mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-4">
            {!teamsData || teamsData.length === 0 ? "Not enough teams found for this game." : "No players found for this game."}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="card card-elevated max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-[var(--text-strong)] pr-3">
            {game.name} - Game Scorecard
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-strong)] text-2xl sm:text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full border-separate border-spacing-1 text-xs sm:text-sm min-w-[500px] bg-gray-900 text-white tabular-nums rounded-xl">
            <thead>
              <tr>
                <th className="px-1 py-2 text-center bg-gray-800 text-gray-300 w-12">Hole</th>
                {course && <th className="px-2 py-2 text-center bg-gray-800 text-gray-300">Par</th>}
                {teamsData.map((team) => (
                  <th
                    key={team.id}
                    className="px-2 py-2 text-center font-semibold text-gray-100 bg-gray-800"
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
                    className="border-t border-gray-700"
                  >
                    <td className="px-1 py-2 text-center font-medium text-gray-100">
                      {holeIndex + 1}
                    </td>
                    {course && (
                      <td className="px-2 py-2 text-center text-gray-300">
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
                              ? "bg-emerald-500/20 text-emerald-300 font-bold rounded-xl border-2 border-emerald-500 shadow-md"
                              : ""
                          }`}
                        >
                          {teamScore !== null ? (
                            <div>
                              <div>{teamScore.score}</div>
                              {isWinner && (
                                <div className="text-xs text-emerald-300 mt-1">
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
            className="btn btn-secondary w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

