import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { courses } from "../data/courses";

export default function ScorecardLeaderboard({ game }) {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!game?.players || game.players.length === 0) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const playersData = game.players.map((player) => {
        const user = users.find((u) => u.id === player.userId);
        return {
          userId: player.userId,
          name: player.name || user?.displayName || "Unknown",
          profilePictureUrl: user?.profilePictureUrl,
          scores: player.scores || [],
          handicap: user?.handicap || 0,
        };
      });

      // Calculate stats for each player
      const holeCount = game?.holeCount || 18;
      
      const playersWithStats = playersData.map((player) => {
        let totalGross = 0;
        let holesPlayed = 0;
        let isRoundComplete = true;

        // Only process the first holeCount scores
        const relevantScores = player.scores.slice(0, holeCount);
        relevantScores.forEach((score) => {
          if (score?.gross != null) {
            holesPlayed++;
            totalGross += score.gross;
          }
        });

        // Check if round is complete - only check the first holeCount scores
        isRoundComplete = relevantScores.every((score) => score?.gross != null);

        return {
          ...player,
          totalGross,
          holesPlayed,
          isRoundComplete,
        };
      });

      setPlayers(playersWithStats);
    };

    fetchPlayers();
  }, [game]);

  // Get course information
  const course = courses.find((c) => c.id === game?.courseId);

  // Determine which holes to display
  const holeCount = game?.holeCount || 18;
  const nineType = game?.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  if (!game || !game.players || game.players.length === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-300">
        No players found.
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-4 sm:mb-6">
        Scorecard
      </h2>
      <div className="space-y-4">
        {players.map((player, index) => {
          const relevantHoles =
            course?.holes?.slice(startIndex, startIndex + holeCount) || [];

          return (
            <div
              key={player.userId}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Profile Picture */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0">
                  {player.profilePictureUrl ? (
                    <img
                      src={player.profilePictureUrl}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-lg font-medium">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg truncate">
                        {player.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm">
                      <p className="text-gray-600 dark:text-gray-400">
                        {player.isRoundComplete ? "Completed Match" : `Thru ${player.holesPlayed}`}
                      </p>
                      <p
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          player.isRoundComplete
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        }`}
                      >
                        {player.isRoundComplete ? "Complete" : "In Progress"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hole Details Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-3 sm:mb-4 max-h-96 overflow-y-auto px-1">
                {relevantHoles.map((hole, localHoleIndex) => {
                  const score = player.scores[localHoleIndex];
                  const hasScore = score?.gross != null;
                  const actualHoleNumber = startIndex + localHoleIndex + 1;

                  return (
                    <div
                      key={localHoleIndex}
                      className={`p-2 sm:p-2.5 rounded-lg border-2 transition-all ${
                        hasScore
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700"
                          : "bg-gray-100 dark:bg-gray-600 border-gray-200 dark:border-gray-500"
                      }`}
                    >
                      {/* Hole Number */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-400">
                          #{actualHoleNumber}
                        </span>
                        {hasScore && (
                          <span className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400">
                            {score.gross}
                          </span>
                        )}
                      </div>

                      {/* Par and SI */}
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>Par {hole.par}</div>
                        <div>SI {hole.strokeIndex}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Total Strokes
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                      {player.totalGross}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
