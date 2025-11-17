import React, { useEffect, useMemo, useState } from "react";
import { normalizeMatchFormat } from "../lib/matchFormats";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import WolfNetScorecardModal from "./WolfNetScorecardModal";

export default function WolfNetLeaderboard({ game }) {
  const { players = [], wolfOrder = null, wolfDecisions = [], course } = game || {};
  const wolfHoles = Array.isArray(game?.wolfHoles) ? game.wolfHoles : null;
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const exactlyThree = Array.isArray(players) && players.length === 3;
  // Align hole slicing with other formats (respect 9/18 and front/back)
  const holeCount = game?.holeCount || 18;
  const startIndex = game?.nineType === "back" ? 9 : 0;
  const holesEnd = startIndex + holeCount;

  useEffect(() => {
    const loadUsers = async () => {
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(
        usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    };
    loadUsers();
  }, []);

  const userMap = useMemo(() => {
    const m = new Map();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  // Fallback wolf order if missing: use players array order
  const effectiveWolfOrder = useMemo(() => {
    if (!exactlyThree) return null;
    if (Array.isArray(wolfOrder) && wolfOrder.length === 3) return wolfOrder;
    return players.map((p) => p.userId);
  }, [wolfOrder, players, exactlyThree]);

  const getPlayerById = (id) => players.find((p) => p.userId === id) || null;
  const getNonWolfPlayers = (wolfId) => players.filter((p) => p.userId !== wolfId);
  const getGrossFor = (player, absHoleIndex) =>
    player?.scores?.[absHoleIndex]?.gross ?? null;
  
  // Get net score for a player on a hole
  const getNetFor = (player, absHoleIndex) => {
    if (!player || !course?.holes?.[absHoleIndex] || !player.handicap) return null;
    const gross = getGrossFor(player, absHoleIndex);
    if (gross == null) return null;
    const handicap = player.handicap || 0;
    const baseStroke = Math.floor(handicap / 18);
    const extraStrokes = handicap % 18;
    const hole = course.holes[absHoleIndex];
    const holeStroke = baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
    return Math.max(0, gross - holeStroke);
  };

  const computeWolfTotals = useMemo(() => {
    const totals = new Map();
    players.forEach((p) => totals.set(p.userId, 0));
    let thru = 0; // overall holes with any score entered among the trio for the displayed segment

    if (!exactlyThree || !effectiveWolfOrder) {
      return { totals, thru };
    }

    for (let i = startIndex; i < holesEnd; i++) {
      const holeInfo = wolfHoles?.[i] || null;
      const wolfId = holeInfo?.wolfId || effectiveWolfOrder[i % 3];
      const decision =
        holeInfo?.decision != null
          ? holeInfo.decision
          : Array.isArray(wolfDecisions)
          ? wolfDecisions[i]
          : null;
      const wolfPlayer = getPlayerById(wolfId);
      const others = getNonWolfPlayers(wolfId);
      if (!wolfPlayer || others.length !== 2) continue;
      const [pA, pB] = others;

      const wolfScore = getNetFor(wolfPlayer, i);
      const aScore = getNetFor(pA, i);
      const bScore = getNetFor(pB, i);

      // Count as "thru" if at least one of the three has a score entered
      if (wolfScore != null || aScore != null || bScore != null) {
        thru++;
      }

      if (
        wolfScore == null ||
        aScore == null ||
        bScore == null ||
        !decision
      ) {
        continue; // need all three scores and a decision to evaluate points
      }

      if (decision === "blind") {
        // Blind Lone Wolf: 6 points if win, 1 point if tie, each opponent gets 2 if lose
        const teamBest = Math.min(aScore, bScore);
        if (wolfScore < teamBest) {
          totals.set(wolfId, (totals.get(wolfId) || 0) + 6);
        } else if (wolfScore > teamBest) {
          totals.set(pA.userId, (totals.get(pA.userId) || 0) + 2);
          totals.set(pB.userId, (totals.get(pB.userId) || 0) + 2);
        } else {
          // Tie: Wolf earns 1 point (same as regular Lone Wolf)
          totals.set(wolfId, (totals.get(wolfId) || 0) + 1);
        }
      } else if (decision === "lone") {
        const teamBest = Math.min(aScore, bScore);
        if (wolfScore < teamBest) {
          totals.set(wolfId, (totals.get(wolfId) || 0) + 3);
        } else if (wolfScore > teamBest) {
          totals.set(pA.userId, (totals.get(pA.userId) || 0) + 1);
          totals.set(pB.userId, (totals.get(pB.userId) || 0) + 1);
        } else {
          // Lone Wolf tie with team best: Wolf earns 1 point
          totals.set(wolfId, (totals.get(wolfId) || 0) + 1);
        }
      } else {
        const partnerId = decision;
        const partner =
          partnerId === pA.userId ? pA : partnerId === pB.userId ? pB : null;
        const solo = partner && partner.userId === pA.userId ? pB : pA;
        if (!partner || !solo) continue;
        const teamBest = Math.min(wolfScore, getNetFor(partner, i) ?? Infinity);
        const soloScore = getNetFor(solo, i);
        if (teamBest < soloScore) {
          totals.set(wolfId, (totals.get(wolfId) || 0) + 1);
          totals.set(partner.userId, (totals.get(partner.userId) || 0) + 1);
        } else if (teamBest > soloScore) {
          // Solo winner vs team gets 3 points
          totals.set(solo.userId, (totals.get(solo.userId) || 0) + 3);
        } else {
          // Team ties solo: solo earns 1 point
          totals.set(solo.userId, (totals.get(solo.userId) || 0) + 1);
        }
      }
    }
    return { totals, thru };
  }, [players, effectiveWolfOrder, wolfDecisions, wolfHoles, startIndex, holesEnd, exactlyThree, course]);

  const rows = useMemo(() => {
    const list = players.map((p) => {
      const displayName =
        userMap.get(p.userId)?.displayName ||
        p.name ||
        p.displayName ||
        "Unknown Player";
      const profilePictureUrl = userMap.get(p.userId)?.profilePictureUrl || null;
      const scores = Array.isArray(p.scores) ? p.scores : [];
      let totalStrokes = 0;
      let holesThru = 0;
      let isRoundComplete = true;
      for (let i = startIndex; i < holesEnd; i++) {
        const gross = scores?.[i]?.gross ?? null;
        if (gross != null && gross > 0) {
          totalStrokes += gross;
          holesThru++;
        } else {
          isRoundComplete = false;
        }
      }
      return {
        userId: p.userId,
        name: displayName,
        profilePictureUrl,
        totalStrokes,
        thru: holesThru,
        isRoundComplete,
        total: computeWolfTotals.totals.get(p.userId) || 0,
      };
    });
    list.sort((a, b) => {
      // Primary: points (descending)
      if (b.total !== a.total) return b.total - a.total;
      // Tiebreaker 1: total strokes (ascending - lower is better)
      if (a.totalStrokes !== b.totalStrokes) return a.totalStrokes - b.totalStrokes;
      // Tiebreaker 2: alphabetical
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [players, computeWolfTotals, userMap, startIndex, holesEnd]);

  const openModal = (player) => {
    setSelectedPlayer(player);
    setModalOpen(true);
  };
  const closeModal = () => {
    setSelectedPlayer(null);
    setModalOpen(false);
  };

  if (normalizeMatchFormat(game?.matchFormat) !== "wolf-handicap") {
    return (
      <div className="text-center text-gray-600 dark:text-gray-300">
        Invalid format for Wolf Net Leaderboard.
      </div>
    );
  }

  if (!exactlyThree) {
    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
          Wolf Leaderboard (With Handicaps)
        </h1>
        <p className="text-center text-yellow-700 dark:text-yellow-300">
          Wolf requires exactly 3 players. Waiting for others to join.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        Wolf Leaderboard (With Handicaps)
      </h1>
      {rows.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          No players found.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.userId}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0">
                    {row.profilePictureUrl ? (
                      <img
                        src={row.profilePictureUrl}
                        alt={row.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {row.name}
                    </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {row.isRoundComplete ? "Total strokes" : "Current strokes"}: {row.totalStrokes}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {row.isRoundComplete ? "Completed Match" : `Thru ${row.thru}`}
                  </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <span className="text-green-700 dark:text-green-300 font-bold text-lg sm:text-xl">
                    {row.total} pts
                  </span>
                  <button
                    onClick={() => openModal(row)}
                    className="px-3 py-2 text-sm bg-green-600 dark:bg-green-500 text-white rounded-xl flex-1 sm:flex-none whitespace-nowrap"
                  >
                    View Scores
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modalOpen && selectedPlayer && (
        <WolfNetScorecardModal game={game} onClose={closeModal} />
      )}
    </div>
  );
}

