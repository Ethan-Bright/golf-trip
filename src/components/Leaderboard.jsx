import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

export default function Leaderboard({ tournamentId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [gameData, setGameData] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      if (!tournamentId) return;
      setLoading(true);

      const gameRef = doc(db, "games", tournamentId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        console.log("Game not found:", tournamentId);
        setLoading(false);
        return;
      }

      const game = gameSnap.data();
      setGameData(game);

      const hasTeams = game.teams && game.teams.length > 0;

      // Fetch user profiles
      const userIds = hasTeams
        ? game.teams.flatMap((team) => team.players.map((p) => p.userId))
        : game.players.map((p) => p.userId);

      const userProfiles = {};
      for (const id of userIds) {
        const userRef = doc(db, "users", id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) userProfiles[id] = userSnap.data();
      }

      // Fetch scores
      const scoresRef = collection(db, "games", tournamentId, "scores");
      const scoreSnaps = await getDocs(scoresRef);
      const scoresByUser = {};
      scoreSnaps.forEach((d) => (scoresByUser[d.id] = d.data()));

      if (hasTeams) {
        const teamResults = game.teams.map((team) => {
          const [p1, p2] = team.players;
          const s1 = scoresByUser[p1.userId] || {};
          const s2 = scoresByUser[p2.userId] || {};
          const user1 = userProfiles[p1.userId] || {};
          const user2 = userProfiles[p2.userId] || {};

          let totalPoints = 0;
          const holeScores = [];

          // Better Ball per hole
          for (let i = 0; i < (game.course?.holes?.length || 18); i++) {
            const h = game.course?.holes?.[i];
            if (!h) continue;

            const p1Score = s1[`hole${i + 1}`] || 0;
            const p2Score = s2[`hole${i + 1}`] || 0;

            const betterScore = Math.max(p1Score, p2Score);
            totalPoints += betterScore;

            holeScores.push({
              holeNumber: i + 1,
              par: h.par,
              players: [
                { name: user1.displayName || p1.name, points: p1Score },
                { name: user2.displayName || p2.name, points: p2Score },
              ],
              usedScoreIndex: p1Score >= p2Score ? 0 : 1, // highlight the one used
            });
          }

          return {
            teamId: team.teamId,
            totalPoints,
            players: [
              {
                name: user1.displayName || p1.name || "Player 1",
                photoURL: user1.photoURL || "/default-avatar.png",
              },
              {
                name: user2.displayName || p2.name || "Player 2",
                photoURL: user2.photoURL || "/default-avatar.png",
              },
            ],
            holeScores,
          };
        });

        teamResults.sort((a, b) => b.totalPoints - a.totalPoints);
        setLeaderboard(teamResults);
      } else {
        // Single player mode
        const playerResults = game.players.map((player) => {
          if (!player.scores) return null;

          const handicap = player.handicap || 0;
          const baseStroke = Math.floor(handicap / 18);
          const extraStrokes = handicap % 18;

          const updatedNetScores = player.scores.map((score, idx) => {
            if (!score?.gross) return null;
            const gross = parseInt(score.gross, 10);
            const hole = game.course.holes[idx];
            if (!hole) return null;
            const holeStroke =
              baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
            return Math.max(0, gross - holeStroke);
          });

          const totalPoints = updatedNetScores.reduce((sum, net, idx) => {
            if (net === null) return sum;
            const hole = game.course.holes[idx];
            return sum + Math.max(0, hole.par + 2 - net);
          }, 0);

          const userData = userProfiles[player.userId] || {};
          const displayName =
            userData.displayName || player.name || "Unknown Player";
          const profilePictureUrl =
            userData.photoURL || userData.profilePictureUrl || null;

          return {
            id: player.userId,
            name: displayName,
            totalPoints,
            profilePictureUrl,
            holeScores: player.scores.map((s, i) => ({
              holeNumber: i + 1,
              par: game.course.holes[i]?.par || 0,
              players: [{ name: displayName, points: s.gross || 0 }],
              usedScoreIndex: 0,
            })),
          };
        }).filter(Boolean);

        playerResults.sort((a, b) => b.totalPoints - a.totalPoints);
        setLeaderboard(playerResults);
      }

      setLoading(false);
    }

    loadLeaderboard();
  }, [tournamentId]);

  if (loading)
    return (
      <div className="text-center text-gray-500 py-4">Loading leaderboard...</div>
    );

  if (!leaderboard.length)
    return (
      <div className="text-center text-gray-500 py-4">
        No results available yet.
      </div>
    );

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 border border-green-100 mt-6">
      <h3 className="text-2xl font-bold text-green-700 mb-4 text-center">
        Leaderboard
      </h3>

      <ol className="space-y-3">
        {leaderboard.map((entry, idx) => (
          <li
            key={entry.teamId || entry.id}
            className="flex items-center justify-between bg-green-50 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center space-x-4">
              <span className="text-2xl font-bold text-green-700">
                {idx + 1}.
              </span>

              {entry.players ? (
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    {entry.players.map((p, i) => (
                      <img
                        key={i}
                        src={p.photoURL}
                        alt={p.name}
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                      />
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">
                      {entry.players.map((p) => p.name).join(" & ")}
                    </p>
                    <p className="text-xs text-gray-500">Team</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  {entry.profilePictureUrl ? (
                    <img
                      src={entry.profilePictureUrl}
                      alt={entry.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold">
                      {entry.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-green-800">{entry.name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <p className="text-xl font-semibold text-green-700">
                {entry.totalPoints} pts
              </p>
              <button
                onClick={() => setSelectedTeam(entry)}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
              >
                View Scores
              </button>
            </div>
          </li>
        ))}
      </ol>

      {/* Modal for viewing hole-by-hole Better Ball scores */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full sm:w-11/12 md:w-4/5 max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl sm:text-2xl font-bold text-green-700">
                  {selectedTeam.players
                    ? selectedTeam.players.map((p) => p.name).join(" & ")
                    : selectedTeam.name}
                  's Scores
                </h3>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Hole</th>
                      {selectedTeam.holeScores[0].players.map((p, i) => (
                        <th key={i} className="text-left py-2">
                          {p.name}
                        </th>
                      ))}
                      <th className="text-left py-2">Used (Better Ball)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTeam.holeScores.map((hole) => (
                      <tr key={hole.holeNumber} className="border-b border-gray-100">
                        <td className="py-1 sm:py-2">{hole.holeNumber}</td>
                        {hole.players.map((p, idx) => (
                          <td
                            key={idx}
                            className={`py-1 sm:py-2 ${
                              idx === hole.usedScoreIndex
                                ? "bg-green-200 font-semibold"
                                : ""
                            }`}
                          >
                            {p.points}
                          </td>
                        ))}
                        <td className="py-1 sm:py-2 font-semibold text-green-700">
                          {hole.players[hole.usedScoreIndex].points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 sm:mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-xs sm:text-sm"
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
