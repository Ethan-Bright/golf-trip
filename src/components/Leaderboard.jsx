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

  if (loading) return <p className="text-center mt-4">Loading leaderboard...</p>;

  return (
    <div className="max-w-3xl mx-auto mt-6 p-4 bg-white shadow-lg rounded-2xl">
      <h1 className="text-2xl font-semibold text-center mb-4">Leaderboard</h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-500">No players or teams found.</p>
      ) : (
        <div className="space-y-4">
          {leaderboard.map((team, index) => (
            <div
              key={index}
              className="p-4 border rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <span className="font-bold text-lg">{index + 1}.</span>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {team.isSolo ? team.displayName : team.name}
                  </span>
                  <span className="text-sm text-gray-500">
                    Total: {team.totalPoints} pts | Thru {team.thru}
                  </span>
                </div>
              </div>

              <div className="flex space-x-6 mt-3 sm:mt-0 items-center">
                {team.players.map((player, i) => (
                  <div key={i} className="flex items-center space-x-2">
                    {player.profilePictureUrl ? (
                      <img
                        src={player.profilePictureUrl}
                        alt={player.displayName}
                        className="w-10 h-10 rounded-full border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-lg border">
                        {player.displayName?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{player.displayName ?? "Unknown"}</p>
                      {!team.isSolo && (
                        <p className="text-sm text-gray-500">HCP: {player.handicap}</p>
                      )}
                      {team.isSolo && (
                        <p className="text-sm text-gray-500">Solo Player</p>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => openModal(team)}
                  className="ml-4 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  View Scorecard
                </button>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-4 text-center">
          {team.isSolo ? team.displayName : team.name} – Scorecard
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2">Hole</th>
              <th className="p-2">Par</th>
              <th className="p-2">SI</th>
              {/* Spacer column to move first player over */}
              <th className="p-2 w-2"></th>
              {team.players.map((p, i) => (
                <React.Fragment key={i}>
                  <th className="p-2">{p.displayName} Gross</th>
                  <th className="p-2">{p.displayName} Net</th>
                </React.Fragment>
              ))}
              <th className="p-2 text-center">Better Ball</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.hole} className="border-b">
                <td className="p-2 font-medium">{row.hole}</td>
                <td className="p-2">{row.par}</td>
                <td className="p-2">{row.strokeIndex}</td>
                {/* Spacer cell */}
                <td className="p-2"></td>
                {row.pGross.map((gross, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-2">{gross || "-"}</td>
                    <td className="p-2">
                      {row.pNet[idx] ? (
                        <div
                          className={`inline-block px-2 py-1 rounded-full ${
                            row.pNet[idx] > 0 && row.bestBall === row.pNet[idx]
                              ? "bg-green-300 font-semibold border-2 border-green-600"
                              : ""
                          }`}
                        >
                          {row.pNet[idx]}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-2 text-center font-semibold">
                  {row.bestBall > 0 ? row.bestBall : "-"}
                </td>
              </tr>
            ))}

            <tr className="bg-gray-100 font-semibold">
              <td className="p-2">Total</td>
              <td className="p-2"></td> {/* Par total empty */}
              <td className="p-2"></td> {/* SI total empty */}
              {/* Spacer cell */}
              <td className="p-2"></td>
              {playerTotals.map((tot, idx) => (
                <React.Fragment key={idx}>
                  <td className="p-2">{tot.gross}</td>
                  <td className="p-2">{tot.net}</td>
                </React.Fragment>
              ))}
              <td className="p-2 text-center">{teamTotal}</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-center mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
