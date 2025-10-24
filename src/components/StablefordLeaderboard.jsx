import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { courses } from "../data/courses";

export default function StablefordLeaderboard({ game }) {
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

        const p1Scores = gamePlayersMap[player1?.id]?.scores ?? [];
        const p2Scores = gamePlayersMap[player2?.id]?.scores ?? [];

        for (let i = 0; i < 18; i++) {
          const p1Net = p1Scores[i]?.net;
          const p2Net = p2Scores[i]?.net;
          if (p1Net != null || p2Net != null) holesThru++;
          totalPoints += Math.max(p1Net ?? 0, p2Net ?? 0);
          
          // Calculate strokes using gross scores
          const p1Gross = p1Scores[i]?.gross ?? 0;
          const p2Gross = p2Scores[i]?.gross ?? 0;
          totalStrokes += Math.max(p1Gross, p2Gross);
          
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
        });
      });

      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
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
        Stableford Leaderboard
      </h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300">
          No players or teams found.
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
                    {team.isSolo ? (
                      // Solo player profile picture
                      team.players[0]?.profilePictureUrl ? (
                        <img 
                          src={team.players[0].profilePictureUrl} 
                          alt={team.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                          {team.displayName.charAt(0).toUpperCase()}
                        </div>
                      )
                    ) : (
                      // Team - show first player's profile picture
                      team.players[0]?.profilePictureUrl ? (
                        <img 
                          src={team.players[0].profilePictureUrl} 
                          alt={team.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                      )
                    )}
                  </div>
                  
                  {/* Player/Team Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {team.isSolo ? team.displayName : team.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {team.isRoundComplete ? 'Total strokes' : 'Current strokes'}: {team.totalStrokes}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Thru {team.thru}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className="text-gray-800 dark:text-gray-200 font-bold text-lg">
                    {team.totalPoints} pts
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
        <ScorecardModal team={selectedTeam} game={game} onClose={closeModal} />
      )}
    </div>
  );
}
