import React, { useEffect, useRef, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { courses } from "../data/courses";
import { shareScorecardAsImage } from "../utils/shareScorecard";

export default function ScorecardLeaderboard({ game }) {
  const [players, setPlayers] = useState([]);
  const [sharingPlayerId, setSharingPlayerId] = useState(null);
  const cardRefs = useRef({});

  useEffect(() => {
    const fetchPlayers = async () => {
      if (!game?.players || game.players.length === 0) return;

      const uniqueIds = Array.from(
        new Set(
          game.players
            .map((player) => player.userId)
            .filter(Boolean)
        )
      );

      const userDocs = await Promise.all(
        uniqueIds.map((userId) => getDoc(doc(db, "users", userId)))
      );
      const users = new Map(
        userDocs
          .filter((snap) => snap.exists())
          .map((snap) => [snap.id, snap.data()])
      );

      const playersData = game.players.map((player) => {
        const user = users.get(player.userId);
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
      const nineType = game?.nineType || "front";
      const startIndex = nineType === "back" ? 9 : 0;
      const endIndex = startIndex + holeCount;
      
      const playersWithStats = playersData.map((player) => {
        let totalGross = 0;
        let holesPlayed = 0;
        let isRoundComplete = true;

        // Process the relevant scores based on nineType and holeCount
        const relevantScores = player.scores.slice(startIndex, endIndex);
        relevantScores.forEach((score) => {
          if (score?.gross != null) {
            holesPlayed++;
            totalGross += score.gross;
          }
        });

        // Check if round is complete - only check the relevant scores
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

  const handleShareScorecard = async (player) => {
    const card = cardRefs.current[player.userId];
    if (!card) return;
    setSharingPlayerId(player.userId);
    try {
      const filename = `${game?.name || "Scorecard"} - ${player.name}`;
      await shareScorecardAsImage(card, filename);
    } catch (error) {
      console.error("Error sharing scorecard:", error);
    } finally {
      setSharingPlayerId(null);
    }
  };

  if (!game || !game.players || game.players.length === 0) {
    return (
      <p className="text-center text-[var(--text-muted)]">
        No players found.
      </p>
    );
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-strong)] text-center mb-4 sm:mb-6">
        Scorecard
      </h2>
      <div className="space-y-4">
        {players.map((player, index) => {
          const relevantHoles =
            course?.holes?.slice(startIndex, startIndex + holeCount) || [];

          return (
            <div
              key={player.userId}
              ref={(el) => {
                if (el) {
                  cardRefs.current[player.userId] = el;
                } else {
                  delete cardRefs.current[player.userId];
                }
              }}
              className="p-3 sm:p-4 bg-[var(--surface-muted)] rounded-2xl border border-[var(--surface-card-border)]"
            >
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Profile Picture */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[var(--surface-muted)] flex-shrink-0">
                  {player.profilePictureUrl ? (
                    <img
                      src={player.profilePictureUrl}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-lg font-medium">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                    <div>
                      <h3 className="font-semibold text-[var(--text-strong)] text-base sm:text-lg truncate">
                        {player.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs sm:text-sm flex-wrap justify-end">
                      <p className="text-[var(--text-muted)]">
                        {player.isRoundComplete ? "Completed Match" : `Thru ${player.holesPlayed}`}
                      </p>
                      <p
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          player.isRoundComplete
                            ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                            : "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300"
                        }`}
                      >
                        {player.isRoundComplete ? "Complete" : "In Progress"}
                      </p>
                      <button
                        onClick={() => handleShareScorecard(player)}
                        disabled={sharingPlayerId === player.userId}
                        className="btn btn-primary btn-sm"
                      >
                        {sharingPlayerId === player.userId ? "Sharing..." : "Share"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hole Details Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-3 sm:mb-4 max-h-96 overflow-y-auto px-1">
                {relevantHoles.map((hole, localHoleIndex) => {
                  const score = player.scores[startIndex + localHoleIndex];
                  const hasScore = score?.gross != null;
                  const actualHoleNumber = startIndex + localHoleIndex + 1;

                  return (
                    <div
                      key={localHoleIndex}
                      className={`p-2 sm:p-2.5 rounded-lg border-2 transition-all ${
                        hasScore
                          ? "bg-brand-500/10 border-brand-500/40"
                          : "bg-[var(--surface-muted)] border-[var(--surface-card-border)]"
                      }`}
                    >
                      {/* Hole Number */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[var(--text-muted)]">
                          #{actualHoleNumber}
                        </span>
                        {hasScore && (
                          <span className="text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-300 tabular-nums">
                            {score.gross}
                          </span>
                        )}
                      </div>

                      {/* Par and SI */}
                      <div className="text-xs text-[var(--text-muted)] space-y-0.5">
                        <div>Par {hole.par}</div>
                        <div>SI {hole.strokeIndex}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-[var(--surface-card-border)]">
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-semibold text-[var(--text-muted)] mb-1">
                      Total Strokes
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-brand-600 dark:text-brand-300 tabular-nums">
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
