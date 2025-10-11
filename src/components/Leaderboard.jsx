import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { courses } from "../data/courses";

export default function Leaderboard({ tournamentId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [gameData, setGameData] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!tournamentId) return;
      setLoading(true);
      try {
        // 1️⃣ Fetch the selected game
        const gdoc = await getDoc(doc(db, "games", tournamentId));
        if (!gdoc.exists()) {
          setLeaderboard([]);
          setGameData(null);
          setLoading(false);
          return;
        }
        const game = { id: gdoc.id, ...gdoc.data() };
        setGameData(game);

        // 2️⃣ Fetch all users
        const usersSnap = await getDocs(collection(db, "users"));
        const users = usersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // 3️⃣ Fetch all teams
        const teamsSnap = await getDocs(collection(db, "teams"));
        const teams = teamsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const leaderboardData = [];

        // Map players by userId in the game for quick access
        const gamePlayersMap = {};
        game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

        // 4️⃣ Process teams
        teams.forEach((team) => {
          const player1 = users.find((u) => u.id === team.player1?.uid);
          const player2 = users.find((u) => u.id === team.player2?.uid);
          if (!player1 && !player2) return;

          let totalPoints = 0;
          let holesThru = 0;

          for (let i = 0; i < 18; i++) {
            const p1Net = gamePlayersMap[player1?.id]?.scores?.[i]?.net ?? 0;
            const p2Net = gamePlayersMap[player2?.id]?.scores?.[i]?.net ?? 0;
            if (p1Net > 0 || p2Net > 0) holesThru++;
            totalPoints += Math.max(p1Net, p2Net);
          }

          leaderboardData.push({
            id: team.id,
            name: team.name,
            players: [player1, player2].filter(Boolean),
            totalPoints,
            thru: holesThru,
            isSolo: false,
          });
        });

        // 5️⃣ Process solo players
        users
          .filter((u) => !u.teamId)
          .forEach((player) => {
            const gamePlayer = gamePlayersMap[player.id];
            if (!gamePlayer) return;

            let totalPoints = 0;
            let holesThru = 0;

            for (let i = 0; i < 18; i++) {
              const net = gamePlayer.scores?.[i]?.net ?? 0;
              if (net > 0) holesThru++;
              totalPoints += net;
            }

            leaderboardData.push({
              players: [player],
              displayName: `${player.displayName ?? "Unknown"} (Solo)`,
              totalPoints,
              thru: holesThru,
              isSolo: true,
            });
          });

        // 6️⃣ Sort by totalPoints descending
        leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [tournamentId]); // ✅ refetch leaderboard whenever tournamentId changes

  const openModal = (team) => {
    setSelectedTeam(team);
    setModalOpen(true);
  };
  const closeModal = () => {
    setSelectedTeam(null);
    setModalOpen(false);
  };

  if (loading) return (
    <div className="text-center py-8">
      <div className="w-8 h-8 border-4 border-green-200 dark:border-green-700 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">Loading leaderboard...</p>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">Leaderboard</h1>
      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-300">No players or teams found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <span className="font-bold text-green-600 dark:text-green-400">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {team.isSolo ? team.displayName : team.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {team.totalPoints} pts • Thru {team.thru}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => openModal(team)}
                  className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                >
                  View Details
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {team.players.map((player, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    {player.profilePictureUrl ? (
                      <img
                        src={player.profilePictureUrl}
                        alt={player.displayName}
                        className="w-8 h-8 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-semibold text-sm">
                        {player.displayName?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{player.displayName ?? "Unknown"}</p>
                      {!team.isSolo && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">HCP: {player.handicap}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && selectedTeam && gameData && (
        <ScorecardModal
          team={selectedTeam}
          game={gameData}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function ScorecardModal({ team, game, onClose }) {
  const course = courses.find((c) => c.id === game.courseId);
  const gamePlayersMap = {};
  game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

  // Prepare player totals
  const playerTotals = team.players.map(() => ({ gross: 0, net: 0 }));
  let teamTotal = 0;

  const rows = [];

  for (let i = 0; i < 18; i++) {
    const holeInfo = course?.holes?.[i] ?? { par: "-", strokeIndex: "-" };

    // Get gross/net for each player
    const pGross = team.players.map((player, idx) => {
      const gamePlayer = gamePlayersMap[player.id];
      const gross = gamePlayer?.scores?.[i]?.gross ?? 0;
      playerTotals[idx].gross += gross;
      return gross;
    });

    const pNet = team.players.map((player, idx) => {
      const gamePlayer = gamePlayersMap[player.id];
      const net = gamePlayer?.scores?.[i]?.net ?? 0;
      playerTotals[idx].net += net;
      return net;
    });

    const bestBall = Math.max(...pNet);
    teamTotal += bestBall;

    rows.push({
      hole: i + 1,
      par: holeInfo.par,
      strokeIndex: holeInfo.strokeIndex,
      pGross,
      pNet,
      bestBall,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {team.isSolo ? team.displayName : team.name} – Scorecard
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 text-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl p-1"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                  <th className="p-3 text-gray-700 dark:text-gray-300">Hole</th>
                  <th className="p-3 text-gray-700 dark:text-gray-300">Par</th>
                  <th className="p-3 text-gray-700 dark:text-gray-300">SI</th>
                  <th className="p-3 w-2"></th>
                  {team.players.map((p, i) => (
                    <React.Fragment key={i}>
                      <th className="p-3 text-gray-700 dark:text-gray-300">{p.displayName} Gross</th>
                      <th className="p-3 text-gray-700 dark:text-gray-300">{p.displayName} Net</th>
                    </React.Fragment>
                  ))}
                  <th className="p-3 text-center text-gray-700 dark:text-gray-300">Better Ball</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.hole} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="p-3 font-medium text-gray-900 dark:text-white">{row.hole}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{row.par}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">{row.strokeIndex}</td>
                    <td className="p-3"></td>
                    {row.pGross.map((gross, idx) => (
                      <React.Fragment key={idx}>
                        <td className="p-3 text-gray-900 dark:text-white">{gross || "-"}</td>
                        <td className="p-3">
                          {row.pNet[idx] ? (
                            <div
                              className={`inline-block px-3 py-1 rounded-xl ${
                                row.pNet[idx] > 0 && row.bestBall === row.pNet[idx]
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold border border-green-300 dark:border-green-700"
                                  : "text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {row.pNet[idx]}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="p-3 text-center font-semibold text-green-600 dark:text-green-400">
                      {row.bestBall > 0 ? row.bestBall : "-"}
                    </td>
                  </tr>
                ))}

                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                  <td className="p-3 text-gray-900 dark:text-white">Total</td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  {playerTotals.map((tot, idx) => (
                    <React.Fragment key={idx}>
                      <td className="p-3 text-gray-900 dark:text-white">{tot.gross}</td>
                      <td className="p-3 text-gray-900 dark:text-white">{tot.net}</td>
                    </React.Fragment>
                  ))}
                  <td className="p-3 text-center text-green-600 dark:text-green-400">{teamTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
