import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { strokesReceivedForHole, netScore, netPointsForHole, teamHolePoints } from "../lib/scoring";

export default function Leaderboard({ tournamentId }) {
  const [teams, setTeams] = useState([]);
  const [scores, setScores] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    async function loadAll() {
      if (!tournamentId) return;

      const q = query(collection(db, "scores"), where("tournamentId", "==", tournamentId));
      const snap = await getDocs(q);
      const allScores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setScores(allScores);

      const uids = [...new Set(allScores.map(s => s.playerUid))];
      const players = {};
      for (const uid of uids) {
        const ud = await getDocs(query(collection(db, "users"), where("__name__", "==", uid)));
        if (!ud.empty) players[uid] = ud.docs[0].data();
      }

      const teamPairs = [];
      const ulist = Object.keys(players);
      for (let i = 0; i < ulist.length; i += 2) {
        const a = players[ulist[i]];
        const b = players[ulist[i + 1]];
        teamPairs.push({
          id: `team${i / 2}`,
          players: [a, b].filter(Boolean),
          playerUids: [ulist[i], ulist[i + 1]].filter(Boolean),
        });
      }

      const teamTotals = teamPairs.map(t => ({
        id: t.id,
        name: t.players.map(p => p.displayName).join(" / "),
        totalPoints: 0,
      }));

      for (let hole = 1; hole <= 18; hole++) {
        const playerPoints = {};
        for (const s of allScores.filter(sc => sc.holeNumber === hole)) {
          const player = players[s.playerUid];
          if (!player) continue;
          const par = 4;
          const strokeIndex = (hole % 18) || 18;
          const strokesRec = strokesReceivedForHole(player.handicap || 0, strokeIndex);
          const net = netScore(s.grossScore, strokesRec);
          const pts = netPointsForHole(net, par);
          playerPoints[s.playerUid] = Math.max(playerPoints[s.playerUid] || 0, pts);
        }

        for (const t of teamPairs) {
          const p1 = t.playerUids[0];
          const p2 = t.playerUids[1];
          const thp = teamHolePoints(playerPoints[p1] ?? 0, playerPoints[p2] ?? 0);
          const teamIdx = teamTotals.findIndex(x => x.id === t.id);
          if (teamIdx >= 0) teamTotals[teamIdx].totalPoints += thp;
        }
      }

      setLeaderboard(teamTotals.sort((a, b) => b.totalPoints - a.totalPoints));
      setTeams(teamPairs);
    }

    loadAll();
  }, [tournamentId]);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6 border border-green-100 mt-6">
      <h3 className="text-2xl font-bold text-green-700 mb-4 text-center">Leaderboard</h3>

      <ol className="space-y-2">
        {leaderboard.map((t, idx) => (
          <li
            key={t.id}
            className="flex justify-between items-center bg-green-50 rounded-lg p-3 shadow-sm"
          >
            <span className="font-medium text-green-800">{idx + 1}. {t.name}</span>
            <span className="font-semibold text-green-700">{t.totalPoints} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
