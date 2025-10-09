import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { strokesReceivedForHole, netScore, netPointsForHole, teamHolePoints } from "../lib/scoring";

export default function Leaderboard({ tournamentId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gameData, setGameData] = useState(null);

  useEffect(() => {
    async function loadAll() {
      if (!tournamentId) return;

      // Get the game data directly
      const gameRef = doc(db, "games", tournamentId);
      const gameSnap = await getDoc(gameRef);
      
      if (!gameSnap.exists()) {
        console.log("Game not found:", tournamentId);
        return;
      }

      const gameData = gameSnap.data();
      console.log("Game data:", gameData);
      setGameData(gameData);

      if (!gameData.players || !gameData.course) {
        console.log("Invalid game data structure");
        return;
      }

      // Calculate points for each player using the same logic as EnterScore page
      const playerLeaderboard = [];
      
      // Get user data for display names
      const userIds = gameData.players.map(p => p.userId);
      const users = {};
      
      for (const userId of userIds) {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          users[userId] = userSnap.data();
        }
      }
      
      for (const player of gameData.players) {
        if (!player.scores || player.handicap === undefined) continue;

        // Calculate total points using the same logic as EnterScore
        const handicap = player.handicap || 0;
        const baseStroke = Math.floor(handicap / 18);
        const extraStrokes = handicap % 18;

        const updatedNetScores = player.scores.map((score, idx) => {
          if (score.gross === null || score.gross === undefined) return null;
          
          const gross = parseInt(score.gross, 10);
          if (isNaN(gross)) return null;

          const hole = gameData.course.holes[idx];
          if (!hole) return null;
          
          const holeStroke = baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
          return Math.max(0, gross - holeStroke);
        });

        const totalPoints = updatedNetScores.reduce((sum, net, idx) => {
          if (net === null) return sum;
          const hole = gameData.course.holes[idx];
          return sum + Math.max(0, hole.par + 2 - net);
        }, 0);

        // Count holes played (holes with valid gross scores)
        const holesPlayed = player.scores.filter(score => 
          score.gross !== null && score.gross !== undefined && !isNaN(parseInt(score.gross, 10))
        ).length;

        // Get display name from user data or fallback to stored name
        const userData = users[player.userId];
        const displayName = userData?.displayName || player.name || "Unknown Player";

        playerLeaderboard.push({
          id: player.userId,
          name: displayName,
          totalPoints: totalPoints,
          handicap: handicap,
          holesPlayed: holesPlayed
        });
      }

      // Sort by total points (highest first)
      const sortedLeaderboard = playerLeaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
      console.log("Calculated leaderboard:", sortedLeaderboard);
      setLeaderboard(sortedLeaderboard);
    }

    loadAll();
  }, [tournamentId]);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 border border-green-100 mt-6">
      <h3 className="text-2xl font-bold text-green-700 mb-4 text-center">Leaderboard</h3>

      <ol className="space-y-2">
        {leaderboard.map((player, idx) => (
          <li
            key={player.id}
            className="flex justify-between items-center bg-green-50 rounded-lg p-3 shadow-sm"
          >
            <div className="flex-1">
              <span className="font-medium text-green-800">{idx + 1}. {player.name}</span>
              <div className="text-sm text-gray-500">
                <span>(HCP: {player.handicap})</span>
                <span className="ml-2">Thru: {player.holesPlayed}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-green-700">{player.totalPoints} pts</span>
              <button
                onClick={() => setSelectedPlayer(player)}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
              >
                View Scores
              </button>
            </div>
          </li>
        ))}
      </ol>
      
      {leaderboard.length === 0 && (
        <p className="text-gray-500 text-center py-4">No players with scores yet</p>
      )}

      {/* Player Scores Modal */}
      {selectedPlayer && gameData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-bold text-green-700">
                  {selectedPlayer.name}'s Scores
                </h3>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Player Info */}
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Handicap: {selectedPlayer.handicap} | 
                  Total Points: {selectedPlayer.totalPoints} | 
                  Holes Played: {selectedPlayer.holesPlayed}
                </p>
              </div>

              {/* Scores Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Hole</th>
                      <th className="text-left py-2">Par</th>
                      <th className="text-left py-2">Gross</th>
                      <th className="text-left py-2">Net</th>
                      <th className="text-left py-2">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameData.course.holes.map((hole, idx) => {
                      const playerData = gameData.players.find(p => p.userId === selectedPlayer.id);
                      const score = playerData?.scores?.[idx];
                      
                      if (!score || score.gross === null || score.gross === undefined) {
                        return (
                          <tr key={hole.holeNumber} className="border-b border-gray-100">
                            <td className="py-2">{hole.holeNumber}</td>
                            <td className="py-2">{hole.par}</td>
                            <td className="py-2 text-gray-400">—</td>
                            <td className="py-2 text-gray-400">—</td>
                            <td className="py-2 text-gray-400">—</td>
                          </tr>
                        );
                      }

                      const gross = parseInt(score.gross, 10);
                      const handicap = selectedPlayer.handicap;
                      const baseStroke = Math.floor(handicap / 18);
                      const extraStrokes = handicap % 18;
                      const holeStroke = baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
                      const net = Math.max(0, gross - holeStroke);
                      const points = Math.max(0, hole.par + 2 - net);

                      return (
                        <tr key={hole.holeNumber} className="border-b border-gray-100">
                          <td className="py-2">{hole.holeNumber}</td>
                          <td className="py-2">{hole.par}</td>
                          <td className="py-2">{gross}</td>
                          <td className="py-2">{net}</td>
                          <td className="py-2 font-semibold text-green-600">{points}</td>
                        </tr>
                      );
                    })}
                    
                    {/* Totals Row */}
                    {(() => {
                      const playerData = gameData.players.find(p => p.userId === selectedPlayer.id);
                      let totalGross = 0;
                      let totalNet = 0;
                      let totalPoints = 0;
                      
                      if (playerData?.scores) {
                        playerData.scores.forEach((score, idx) => {
                          if (score && score.gross !== null && score.gross !== undefined) {
                            const gross = parseInt(score.gross, 10);
                            if (!isNaN(gross)) {
                              totalGross += gross;
                              
                              const hole = gameData.course.holes[idx];
                              const handicap = selectedPlayer.handicap;
                              const baseStroke = Math.floor(handicap / 18);
                              const extraStrokes = handicap % 18;
                              const holeStroke = baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
                              const net = Math.max(0, gross - holeStroke);
                              const points = Math.max(0, hole.par + 2 - net);
                              
                              totalNet += net;
                              totalPoints += points;
                            }
                          }
                        });
                      }
                      
                      return (
                        <tr className="border-t-2 border-green-500 bg-green-50 font-bold">
                          <td className="py-2">Total</td>
                          <td className="py-2">—</td>
                          <td className="py-2">{totalGross || '—'}</td>
                          <td className="py-2">{totalNet || '—'}</td>
                          <td className="py-2 text-green-700">{totalPoints}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
