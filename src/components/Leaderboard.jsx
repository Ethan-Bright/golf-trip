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
import MatchplayScorecardModal from "./MatchplayScorecardModal";

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
        const users = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // 3️⃣ Fetch all teams
        const teamsSnap = await getDocs(collection(db, "teams"));
        const teams = teamsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const leaderboardData = [];

        // Map players by userId in the game for quick access
        const gamePlayersMap = {};
        game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

        // 4️⃣ Process teams
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
          let matchStatus = null;

          const p1Scores = gamePlayersMap[player1?.id]?.scores ?? [];
          const p2Scores = gamePlayersMap[player2?.id]?.scores ?? [];

          // Count holes completed
          for (let i = 0; i < 18; i++) {
            const p1Net = p1Scores[i]?.net;
            const p2Net = p2Scores[i]?.net;
            if (p1Net != null || p2Net != null) holesThru++;

            if (game.matchFormat !== "matchplay") {
              totalPoints += Math.max(p1Net ?? 0, p2Net ?? 0);
            }
          }

          if (game.matchFormat === "matchplay" && player1 && player2) {
            matchStatus = calculateMatchPlayStatus(p1Scores, p2Scores);
          }

          leaderboardData.push({
            id: team.id,
            name: team.name,
            players: [player1, player2].filter(Boolean),
            totalPoints,
            thru: holesThru,
            isSolo: false,
            matchStatus,
          });
        });

        // 5️⃣ Process solo players
        const soloPlayers = users.filter(
          (u) => !u.teamId && gamePlayersMap[u.id]
        );

        if (game.matchFormat === "matchplay") {
          for (let i = 0; i < soloPlayers.length; i += 2) {
            const player1 = soloPlayers[i];
            const player2 = soloPlayers[i + 1];
            if (!player2) continue;

            const p1Scores = gamePlayersMap[player1.id]?.scores ?? [];
            const p2Scores = gamePlayersMap[player2.id]?.scores ?? [];

            let lead = 0;
            let p1Thru = 0;
            let p2Thru = 0;

            for (let h = 0; h < 18; h++) {
              const p1Net = p1Scores[h]?.net;
              const p2Net = p2Scores[h]?.net;
              if (p1Net != null) p1Thru++;
              if (p2Net != null) p2Thru++;

              if (p1Net != null && p2Net != null) {
                if (p1Net > p2Net) lead++;
                else if (p2Net > p1Net) lead--;
              }
            }

            let p1Status, p2Status;
            if (lead === 0) {
              p1Status = p2Status = "All Square";
            } else if (lead > 0) {
              p1Status = `${lead} Up`;
              p2Status = `${lead} down`;
            } else {
              p1Status = `${Math.abs(lead)} down`;
              p2Status = `${Math.abs(lead)} Up`;
            }

            leaderboardData.push({
              players: [player1],
              displayName: `${player1.displayName ?? "Unknown"} (Solo)`,
              totalPoints: 0,
              thru: p1Thru,
              isSolo: true,
              matchStatus: p1Status,
            });

            leaderboardData.push({
              players: [player2],
              displayName: `${player2.displayName ?? "Unknown"} (Solo)`,
              totalPoints: 0,
              thru: p2Thru,
              isSolo: true,
              matchStatus: p2Status,
            });
          }
        } else {
          soloPlayers.forEach((player) => {
            const gamePlayer = gamePlayersMap[player.id];
            if (!gamePlayer) return;

            let totalPoints = 0;
            let holesThru = 0;
            const scores = gamePlayer.scores ?? [];
            for (let i = 0; i < 18; i++) {
              const net = scores[i]?.net;
              if (net != null) holesThru++;
              totalPoints += net ?? 0;
            }

            leaderboardData.push({
              players: [player],
              displayName: `${player.displayName ?? "Unknown"} (Solo)`,
              totalPoints,
              thru: holesThru,
              isSolo: true,
              matchStatus: null,
            });
          });
        }

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
  }, [tournamentId]);

  const openModal = (team) => {
    setSelectedTeam(team);
    setModalOpen(true);
  };
  const closeModal = () => {
    setSelectedTeam(null);
    setModalOpen(false);
  };

  if (loading)
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-green-200 dark:border-green-700 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">
          Loading leaderboard...
        </p>
      </div>
    );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Leaderboard
      </h1>

      {leaderboard.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            No players or teams found.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  {/* Position number */}
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {index + 1}
                    </span>
                  </div>

                  {/* Profile picture, name, and match status */}
                  <div className="flex items-center space-x-3">
                    {team.isSolo && team.players[0]?.profilePictureUrl ? (
                      <img
                        src={team.players[0].profilePictureUrl}
                        alt={team.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : team.isSolo ? (
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-semibold text-lg">
                        {team.displayName?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                    ) : null}

                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                          {team.isSolo ? team.displayName : team.name}
                        </h3>
                        {team.isSolo &&
                        gameData.matchFormat === "matchplay" &&
                        team.matchStatus ? (
                          <span className="text-green-600 dark:text-green-400 font-bold text-xl whitespace-nowrap">
                            {team.matchStatus}
                          </span>
                        ) : (
                          <span className="text-gray-800 dark:text-gray-200 font-bold text-lg whitespace-nowrap">
                            {team.totalPoints} pts
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Thru {team.thru}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openModal(team)}
                  className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 self-start sm:self-auto"
                >
                  View Scores
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && selectedTeam && gameData && (
        <>
          {gameData.matchFormat === "matchplay" ? (
            <MatchplayScorecardModal game={gameData} onClose={closeModal} />
          ) : (
            <ScorecardModal
              team={selectedTeam}
              game={gameData}
              onClose={closeModal}
            />
          )}
        </>
      )}
    </div>
  );
}

// --------------------
// Simple match play status calculation for 2-player teams
// --------------------
function calculateMatchPlayStatus(p1Scores, p2Scores) {
  let status = 0; // positive = p1 up, negative = p2 up
  for (let i = 0; i < Math.min(p1Scores.length, p2Scores.length); i++) {
    const p1 = p1Scores[i]?.net ?? 0;
    const p2 = p2Scores[i]?.net ?? 0;
    if (p1 > p2) status++;
    else if (p2 > p1) status--;
  }
  if (status === 0) return "All square";
  if (status > 0) return `${status} up`;
  return `${Math.abs(status)} down`;
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
      const grossScore = gamePlayer?.scores?.[i]?.gross;

      if (grossScore === undefined || grossScore === null) {
        return "-"; // no score entered
      } else {
        playerTotals[idx].gross += grossScore; // sum total only if exists
        return grossScore; // show 0 or actual gross
      }
    });

    const pNet = team.players.map((player, idx) => {
      const gamePlayer = gamePlayersMap[player.id];
      const netScore = gamePlayer?.scores?.[i]?.net;

      if (pGross[idx] === "-") {
        return "-"; // if gross is "-", net is also "-"
      } else {
        playerTotals[idx].net += netScore ?? 0; // sum only if score exists
        return netScore ?? 0; // show 0 if scored 0
      }
    });

    const bestBall = Math.max(...pNet.map((n) => (n === "-" ? 0 : n)));
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
                      <th className="p-3 text-gray-700 dark:text-gray-300">
                        {p.displayName} Gross
                      </th>
                      <th className="p-3 text-gray-700 dark:text-gray-300">
                        {p.displayName} Net
                      </th>
                    </React.Fragment>
                  ))}
                  {!team.isSolo && (
                    <th className="p-3 text-center text-gray-700 dark:text-gray-300">
                      Better Ball
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.hole}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="p-3 font-medium text-gray-900 dark:text-white">
                      {row.hole}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      {row.par}
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300">
                      {row.strokeIndex}
                    </td>
                    <td className="p-3"></td>
                    {row.pGross.map((gross, idx) => (
                      <React.Fragment key={idx}>
                        <td className="p-3 text-gray-900 dark:text-white">
                          {gross || "-"}
                        </td>
                        <td className="p-3">
                          {row.pGross[idx] === "-" ? (
                            <span className="text-gray-400 dark:text-gray-500">
                              -
                            </span>
                          ) : (
                            <div
                              className={`inline-block px-3 py-1 rounded-xl ${
                                row.bestBall === row.pNet[idx]
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold border border-green-300 dark:border-green-700"
                                  : "text-gray-600 dark:text-gray-300"
                              }`}
                            >
                              {row.pNet[idx]}
                            </div>
                          )}
                        </td>
                      </React.Fragment>
                    ))}
                    {!team.isSolo && (
                      <td className="p-3 text-center font-semibold text-green-600 dark:text-green-400">
                        {row.bestBall > 0 ? row.bestBall : "-"}
                      </td>
                    )}
                  </tr>
                ))}

                <tr className="bg-gray-50 dark:bg-gray-700 font-semibold">
                  <td className="p-3 text-gray-900 dark:text-white">Total</td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  <td className="p-3"></td>
                  {playerTotals.map((tot, idx) => (
                    <React.Fragment key={idx}>
                      <td className="p-3 text-gray-900 dark:text-white">
                        {tot.gross}
                      </td>
                      <td className="p-3 text-gray-900 dark:text-white">
                        {tot.net}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="p-3 text-center text-green-600 dark:text-green-400">
                    {teamTotal}
                  </td>
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
