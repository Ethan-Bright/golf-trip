import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import StrokeplayScorecardModal from "./StrokeplayScorecardModal";

export default function StrokeplayLeaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Calculate match status based on gross scores
  const calculateMatchStatus = (player1Scores, player2Scores) => {
    let status = 0;
    let holesPlayed = 0;
    
    for (let i = 0; i < Math.min(player1Scores.length, player2Scores.length); i++) {
      const p1Gross = player1Scores[i]?.gross;
      const p2Gross = player2Scores[i]?.gross;
      
      if (p1Gross == null || p2Gross == null) continue;
      
      holesPlayed++;
      if (p1Gross < p2Gross) status++;
      else if (p2Gross < p1Gross) status--;
    }
    
    if (holesPlayed === 0) return "Waiting for opponent";
    if (status === 0) return "All Square";
    if (status > 0) return `${status} Up`;
    return `${Math.abs(status)} Down`;
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!game?.players || game.players.length === 0) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const teamsSnap = await getDocs(collection(db, "teams"));
      const teams = teamsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      const leaderboardData = [];

      teams.forEach((team) => {
        const player1 = users.find(
          (u) => u.id === team.player1?.uid && gamePlayersMap[u.id]
        );
        const player2 = users.find(
          (u) => u.id === team.player2?.uid && gamePlayersMap[u.id]
        );
        if (!player1 && !player2) return;

        let totalPoints = 0;
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        let matchStatus = "Waiting for opponent";

        const p1Scores = gamePlayersMap[player1?.id]?.scores ?? [];
        const p2Scores = gamePlayersMap[player2?.id]?.scores ?? [];

        // Calculate match status for teams
        if (player1 && player2) {
          matchStatus = calculateMatchStatus(p1Scores, p2Scores);
        }

        for (let i = 0; i < 18; i++) {
          const p1Net = p1Scores[i]?.net;
          const p2Net = p2Scores[i]?.net;
          if (p1Net != null || p2Net != null) holesThru++;
          totalPoints += (p1Net ?? 0) + (p2Net ?? 0);
          
          // Calculate strokes using gross scores
          const p1Gross = p1Scores[i]?.gross ?? 0;
          const p2Gross = p2Scores[i]?.gross ?? 0;
          totalStrokes += p1Gross + p2Gross;
          
          // Check if round is complete
          if (p1Gross === 0 && p2Gross === 0) {
            isRoundComplete = false;
          }
        }

        leaderboardData.push({
          id: team.id,
          name: team.name,
          players: [player1, player2].filter(Boolean),
          totalPoints,
          thru: holesThru,
          isSolo: false,
          totalStrokes,
          isRoundComplete,
          matchStatus,
        });
      });

      const soloPlayers = users.filter(
        (u) => !u.teamId && gamePlayersMap[u.id]
      );
      soloPlayers.forEach((player) => {
        const scores = gamePlayersMap[player.id]?.scores ?? [];
        let totalPoints = 0;
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        let matchStatus = "Waiting for opponent";
        
        // Find opponent for solo player
        const otherSoloPlayers = soloPlayers.filter(p => p.id !== player.id);
        if (otherSoloPlayers.length > 0) {
          const opponent = otherSoloPlayers[0];
          const opponentScores = gamePlayersMap[opponent.id]?.scores ?? [];
          matchStatus = calculateMatchStatus(scores, opponentScores);
        }
        
        for (let i = 0; i < 18; i++) {
          const net = scores[i]?.net;
          if (net != null) holesThru++;
          totalPoints += net ?? 0;
          
          // Calculate strokes using gross scores
          const gross = scores[i]?.gross ?? 0;
          totalStrokes += gross;
          
          // Check if round is complete
          if (gross === 0) {
            isRoundComplete = false;
          }
        }
        leaderboardData.push({
          players: [player],
          displayName: `${player.displayName ?? "Unknown"} (Solo)`,
          totalPoints,
          thru: holesThru,
          isSolo: true,
          totalStrokes,
          isRoundComplete,
          matchStatus,
        });
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
        
        // First sort by match status (descending), then by total points
        if (bVal !== aVal) {
          return bVal - aVal;
        }
        return b.totalPoints - a.totalPoints;
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
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Strokeplay Leaderboard
      </h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          No players or teams found.
        </p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={index}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Position Number */}
                  <div className="w-8 h-8 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* Profile Picture - Only for solo players */}
                  {team.isSolo && (
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
                  )}
                  
                  {/* Player/Team Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {team.isSolo ? team.displayName : team.name}
                    </h3>
                    {!team.isSolo && team.players && team.players.length > 0 && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {team.players.map((player, idx) => (
                          <div key={idx} className="flex items-center gap-1 flex-shrink-0">
                            {player.profilePictureUrl ? (
                              <img
                                src={player.profilePictureUrl}
                                alt={player.displayName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center text-xs text-white">
                                {player.displayName?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {player.displayName || 'Unknown'}
                            </span>
                            {idx < team.players.length - 1 && <span className="text-xs text-gray-400">•</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {team.isRoundComplete ? 'Total strokes' : 'Current strokes'}: {team.totalStrokes}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {team.isRoundComplete ? "Completed Match" : `Thru ${team.thru}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <span className="text-gray-800 dark:text-gray-200 font-bold text-base sm:text-lg">
                    {team.totalPoints} pts
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                    {team.matchStatus}
                  </span>
                  <button
                    onClick={() => openModal(team)}
                    className="px-3 py-2 text-sm bg-green-600 dark:bg-green-500 text-white rounded-xl w-full sm:w-auto whitespace-nowrap"
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
        <StrokeplayScorecardModal game={game} selectedTeam={selectedTeam} onClose={closeModal} />
      )}
    </div>
  );
}
