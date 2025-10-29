import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import MatchplayGrossScorecardModal from "./MatchplayGrossScorecardModal";

export default function MatchplayGrossLeaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!game?.players || game.players.length === 0) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      // Get all players in the game, regardless of team membership
      const gamePlayers = users.filter(
        (u) => gamePlayersMap[u.id]
      );
      // Get relevant hole range based on game settings
      const holeCount = game.holeCount || 18;
      const nineType = game.nineType || "front";
      const startIndex = nineType === "back" ? 9 : 0;

      const leaderboardData = gamePlayers.map((player) => {
        const allScores = gamePlayersMap[player.id]?.scores ?? [];
        const relevantScores = allScores.slice(startIndex, startIndex + holeCount);
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;

        relevantScores.forEach((s) => {
          if (s?.gross != null && s.gross > 0) {
            holesThru++;
            totalStrokes += s.gross;
          } else {
            isRoundComplete = false;
          }
        });

        let matchStatus = "Waiting for opponent";

        if (game.players.length === 2) {
          const otherPlayerId = game.players.find(
            (p) => p.userId !== player.id
          )?.userId;
          const otherAllScores = gamePlayersMap[otherPlayerId]?.scores ?? [];
          const otherRelevantScores = otherAllScores.slice(startIndex, startIndex + holeCount);
          const pHasScore = relevantScores.some(
            (s) => s?.gross != null && s.gross > 0
          );
          const oHasScore = otherRelevantScores.some(
            (s) => s?.gross != null && s.gross > 0
          );
          if (pHasScore && oHasScore) {
            matchStatus = calculateMatchPlayStatus(relevantScores, otherRelevantScores);
          }
        }

        return {
          players: [player],
          displayName: player.displayName ?? "Unknown",
          thru: holesThru,
          isSolo: true,
          matchStatus,
          totalStrokes,
          isRoundComplete,
        };
      });

      leaderboardData.sort((a, b) => {
        // Parse match status values - positive for "Up", negative for "Down"
        let aVal = 0;
        let bVal = 0;
        
        if (a.matchStatus.includes("Up")) {
          aVal = parseInt(a.matchStatus);
        } else if (a.matchStatus.includes("Down")) {
          aVal = -parseInt(a.matchStatus);
        } else if (a.matchStatus === "All Square") {
          aVal = 0;
        }
        
        if (b.matchStatus.includes("Up")) {
          bVal = parseInt(b.matchStatus);
        } else if (b.matchStatus.includes("Down")) {
          bVal = -parseInt(b.matchStatus);
        } else if (b.matchStatus === "All Square") {
          bVal = 0;
        }
        
        return bVal - aVal;
      });

      setLeaderboard(leaderboardData);
    };

    fetchLeaderboard();
  }, [game]);

  const openModal = (team) => {
    setSelectedTeam(team);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedTeam(null);
    setModalOpen(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Matchplay Leaderboard (Gross)
      </h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300">
          There needs to be 2 players for the matchplay format
        </p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {/* Position Number */}
                  <div className="w-8 h-8 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  
                  {/* Profile Picture */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0">
                    {team.players[0]?.profilePictureUrl ? (
                      <img 
                        src={team.players[0].profilePictureUrl} 
                        alt={team.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                        {team.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Player Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {team.displayName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {team.isRoundComplete ? 'Total strokes' : 'Current strokes'}: {team.totalStrokes}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {team.isRoundComplete ? "Completed Match" : `Thru ${team.thru}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-green-600 dark:text-green-400 font-bold text-xl">
                    {team.matchStatus}
                  </span>
                  <button
                    onClick={() => openModal(team)}
                    className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl"
                  >
                    View Scores
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modalOpen && selectedTeam && (
        <MatchplayGrossScorecardModal game={game} selectedTeam={selectedTeam} onClose={closeModal} />
      )}
    </div>
  );
}

function calculateMatchPlayStatus(p1Scores, p2Scores) {
  let status = 0;
  let holesPlayed = 0;
  for (let i = 0; i < Math.min(p1Scores.length, p2Scores.length); i++) {
    const p1Score = p1Scores[i]?.gross;
    const p2Score = p2Scores[i]?.gross;
    // Only process holes where both players have valid scores
    if (p1Score == null || p2Score == null || p1Score === 0 || p2Score === 0) continue;
    holesPlayed++;
    // In gross matchplay, lower score wins the hole
    if (p1Score < p2Score) status++;
    else if (p2Score < p1Score) status--;
  }
  if (holesPlayed === 0) return "Waiting for opponent";
  if (status === 0) return "All Square";
  if (status > 0) return `${status} Up`;
  return `${Math.abs(status)} Down`;
}

