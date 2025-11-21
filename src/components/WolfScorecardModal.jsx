import React, { useMemo, useState, useRef } from "react";
import { buildColumnBorderClasses } from "../utils/scorecardUtils";
import { shareScorecardAsImage } from "../utils/shareScorecard";

export default function WolfScorecardModal({ game, onClose }) {
  const [isSharing, setIsSharing] = useState(false);
  const scorecardRef = useRef(null);
  if (!game) return null;
  const players = Array.isArray(game.players) ? game.players : [];
  const course = game.course || {};
  const holes = course.holes || Array.from({ length: 18 }, (_, i) => ({ par: 4 }));
  const holeCount = game.holeCount || holes.length || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;
  const wolfOrder = Array.isArray(game.wolfOrder) && game.wolfOrder.length === 3
    ? game.wolfOrder
    : players.map((p) => p.userId).slice(0, 3);
  const wolfDecisions = Array.isArray(game.wolfDecisions) ? game.wolfDecisions : [];
  const wolfHoles = Array.isArray(game.wolfHoles) ? game.wolfHoles : null;

  const getPlayerById = (id) => players.find((p) => p.userId === id) || null;
  const getGross = (playerId, i) =>
    players.find((p) => p.userId === playerId)?.scores?.[i]?.gross ?? null;

  const displayPlayers = useMemo(() => {
    // Keep consistent player order as in game.players
    return players.map((p) => ({
      userId: p.userId,
      name: p.name || p.displayName || "Player",
    }));
  }, [players]);

  const getWolfForHole = (absIndex) => {
    if (wolfHoles && wolfHoles[absIndex] && wolfHoles[absIndex].wolfId) {
      return wolfHoles[absIndex].wolfId;
    }
    return wolfOrder && wolfOrder.length === 3 ? wolfOrder[absIndex % 3] : null;
  };

  const getNonWolfPlayers = (wolfId) =>
    players.filter((p) => p.userId !== wolfId);

  const holeRenderInfo = (absIndex) => {
    const holeInfo = wolfHoles?.[absIndex] || null;
    const wolfId = holeInfo?.wolfId ?? getWolfForHole(absIndex);
    const decision =
      holeInfo && "decision" in holeInfo
        ? holeInfo.decision
        : wolfDecisions?.[absIndex] ?? null;
    const [wolf, ...others] = [
      getPlayerById(wolfId),
      ...getNonWolfPlayers(wolfId),
    ].filter(Boolean);
    if (!wolf || others.length !== 2) {
      return {
        wolfId,
        decision,
        teamIds: new Set(),
        opponentIds: new Set(),
        highlightIds: new Set(),
        partnerId: null,
      };
    }
    const [pA, pB] = others;
    const wolfGross = getGross(wolf.userId, absIndex);
    const aGross = getGross(pA.userId, absIndex);
    const bGross = getGross(pB.userId, absIndex);

    const teamIds = new Set();
    const opponentIds = new Set();
    const highlightIds = new Set();
    let partnerId = null;

      if (decision === "blind" || decision === "lone") {
        // Blind Lone Wolf and Lone Wolf are grouped the same way
        opponentIds.add(pA.userId);
        opponentIds.add(pB.userId);
        teamIds.add(wolf.userId);
        if (
          wolfGross != null &&
          aGross != null &&
          bGross != null
        ) {
          const oppBest = Math.min(aGross, bGross);
          if (wolfGross < oppBest) {
            highlightIds.add(wolf.userId);
          } else if (oppBest < wolfGross) {
            if (aGross === oppBest) highlightIds.add(pA.userId);
            if (bGross === oppBest) highlightIds.add(pB.userId);
          }
        }
      } else if (typeof decision === "string" && decision) {
        // Partner scenario
        const chosenPartnerId = decision;
        const partner = chosenPartnerId === pA.userId ? pA : chosenPartnerId === pB.userId ? pB : null;
        const solo = partner && partner.userId === pA.userId ? pB : pA;
        if (partner && solo) {
          teamIds.add(wolf.userId);
          teamIds.add(partner.userId);
          opponentIds.add(solo.userId);

          const teamBest =
            wolfGross != null && getGross(partner.userId, absIndex) != null
              ? Math.min(wolfGross, getGross(partner.userId, absIndex))
              : null;
          const soloGross = getGross(solo.userId, absIndex);
          if (teamBest != null && soloGross != null) {
            if (teamBest < soloGross) {
              if (wolfGross === teamBest) highlightIds.add(wolf.userId);
              if (getGross(partner.userId, absIndex) === teamBest)
                highlightIds.add(partner.userId);
            } else if (soloGross < teamBest) {
              highlightIds.add(solo.userId);
            }
          }
        // Expose partner id for UI
        partnerId = partner.userId;
      }
    }

    return { wolfId, decision, teamIds, opponentIds, highlightIds, partnerId };
  };

  // Calculate per-hole points map { userId -> points } using same rules as the grid
  const calculateHolePointsMap = (holeIndex) => {
    const info = holeRenderInfo(holeIndex);
    const wolfId = info.wolfId;
    const decision = info.decision;
    if (!wolfId || decision == null) return {};
    const others = getNonWolfPlayers(wolfId);
    if (others.length !== 2) return {};
    const [pA, pB] = others;
    const wolfGross = getGross(wolfId, holeIndex);
    const aGross = getGross(pA.userId, holeIndex);
    const bGross = getGross(pB.userId, holeIndex);
    if (wolfGross == null || aGross == null || bGross == null) return {};

    if (decision === "blind") {
      const oppBest = Math.min(aGross, bGross);
      if (wolfGross < oppBest) {
        return { [wolfId]: 6 };
      } else if (wolfGross > oppBest) {
        return { [pA.userId]: 2, [pB.userId]: 2 };
      } else {
        // Tie: Wolf earns 1 point (same as regular Lone Wolf)
        return { [wolfId]: 1 };
      }
    }

    if (decision === "lone") {
      const oppBest = Math.min(aGross, bGross);
      if (wolfGross < oppBest) {
        return { [wolfId]: 3 };
      } else if (wolfGross > oppBest) {
        return { [pA.userId]: 1, [pB.userId]: 1 };
      } else {
        // Lone Wolf tie with team best: Wolf earns 1 point
        return { [wolfId]: 1 };
      }
    }

    if (typeof decision === "string") {
      const partnerId = decision;
      const partner =
        partnerId === pA.userId ? pA : partnerId === pB.userId ? pB : null;
      const solo = partner && partner.userId === pA.userId ? pB : pA;
      if (!partner || !solo) return {};
      const partnerGross = getGross(partner.userId, holeIndex);
      const soloGross = getGross(solo.userId, holeIndex);
      if (partnerGross == null || soloGross == null) return {};
      const teamBest = Math.min(wolfGross, partnerGross);
      if (teamBest < soloGross) {
        return { [wolfId]: 1, [partner.userId]: 1 };
      } else if (soloGross < teamBest) {
        return { [solo.userId]: 3 };
      } else {
        // Team ties solo: solo earns 1 point
        return { [solo.userId]: 1 };
      }
    }

    return {};
  };

  const handleShare = async () => {
    if (!game || displayPlayers.length !== 3 || !scorecardRef.current) return;
    setIsSharing(true);
    try {
      const filename = `${game.name} - Wolf Scorecard`;
      await shareScorecardAsImage(scorecardRef.current, filename);
    } catch (error) {
      console.error("Error sharing scorecard:", error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-6xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {game.name} • Wolf Scorecard (Gross)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="px-3 py-1.5 bg-green-600 dark:bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Share scorecard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {isSharing ? "Sharing..." : "Share"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl sm:text-3xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-3 sm:mx-0" ref={scorecardRef}>
          <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left align-bottom border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tl-lg">
                  Hole
                </th>
                {displayPlayers.map((p, idx) => (
                  <th
                    key={p.userId}
                    className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                      "border-blue-500 dark:border-blue-400 border-solid",
                      idx,
                      displayPlayers.length,
                      { top: true, bottom: false }
                    )}`}
                  >
                    {p.name}
                  </th>
                ))}
                <th
                  className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                    "border-blue-500 dark:border-blue-400 border-solid",
                    displayPlayers.length,
                    displayPlayers.length + 1,
                    { top: true, bottom: false }
                  )}`}
                >
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const i = startIndex + displayIndex;
                const hole = holes[i] || {};
                const info = holeRenderInfo(i);
                // Build per-hole points details
                const pointsEarned = (() => {
                  const wolfId = info.wolfId;
                  const decision = info.decision;
                  if (!wolfId || !decision) return [];
                  const others = getNonWolfPlayers(wolfId);
                  if (others.length !== 2) return [];
                  const [pA, pB] = others;
                  const wolfGross = getGross(wolfId, i);
                  const aGross = getGross(pA.userId, i);
                  const bGross = getGross(pB.userId, i);
                  if (wolfGross == null || aGross == null || bGross == null) return [];
                  if (decision === "blind") {
                    // Blind Lone Wolf: 6 points if win, 2 points if tie, each opponent gets 2 if lose
                    const oppBest = Math.min(aGross, bGross);
                    if (wolfGross < oppBest) {
                      return [{ userId: wolfId, pts: 6 }];
                    } else if (wolfGross > oppBest) {
                      return [
                        { userId: pA.userId, pts: 2 },
                        { userId: pB.userId, pts: 2 },
                      ];
                    } else {
                      // Tie: Wolf earns 2 points
                      return [{ userId: wolfId, pts: 2 }];
                    }
                  } else if (decision === "lone") {
                    const oppBest = Math.min(aGross, bGross);
                    if (wolfGross < oppBest) {
                      return [{ userId: wolfId, pts: 3 }];
                    } else if (wolfGross > oppBest) {
                      return [
                        { userId: pA.userId, pts: 1 },
                        { userId: pB.userId, pts: 1 },
                      ];
                    } else {
                      // Lone Wolf tie with team best: Wolf earns 1 point
                      return [{ userId: wolfId, pts: 1 }];
                    }
                  } else if (typeof decision === "string") {
                    const partnerId = decision;
                    const partner = partnerId === pA.userId ? pA : partnerId === pB.userId ? pB : null;
                    const solo = partner && partner.userId === pA.userId ? pB : pA;
                    if (!partner || !solo) return [];
                    const teamBest = Math.min(wolfGross, getGross(partner.userId, i) ?? Infinity);
                    const soloGross = getGross(solo.userId, i);
                    if (teamBest < soloGross) {
                      return [
                        { userId: wolfId, pts: 1 },
                        { userId: partner.userId, pts: 1 },
                      ];
                    } else if (soloGross < teamBest) {
                      // Solo winner (non-wolf) should earn 3 points when beating the team
                      return [{ userId: solo.userId, pts: 3 }];
                    } else {
                      // Team ties solo: solo earns 1 point
                      return [{ userId: solo.userId, pts: 1 }];
                    }
                  }
                  return [];
                })();
                // Determine tie label when no points were awarded
                const tieLabel = (() => {
                  const wolfId = info.wolfId;
                  const decision = info.decision;
                  if (!wolfId || decision == null) return null;
                  const others = getNonWolfPlayers(wolfId);
                  if (others.length !== 2) return null;
                  const [pA, pB] = others;
                  const w = getGross(wolfId, i);
                  const a = getGross(pA.userId, i);
                  const b = getGross(pB.userId, i);
                  if (w == null || a == null || b == null) return null;
                  // Three-way tie
                  if (w === a && a === b) {
                    // If Wolf declared Lone/Blind and tied, Wolf gets +1 (handled above),
                    // so don't show "All tied" label in that case.
                    if (decision === "lone" || decision === "blind") return null;
                    return "All tied";
                  }
                  if (decision === "blind" || decision === "lone") {
                    // Wolf ties the best of opponents -> tie (Blind Lone Wolf gets +2 points, handled above)
                    const oppBest = Math.min(a, b);
                    if (w === oppBest) return null; // Don't show "Tie" since points are awarded
                  } else if (typeof decision === "string") {
                    const partnerId = decision;
                    const partner = partnerId === pA.userId ? pA : partnerId === pB.userId ? pB : null;
                    const solo = partner && partner.userId === pA.userId ? pB : pA;
                    if (!partner || !solo) return null;
                    const teamBest = Math.min(w, getGross(partner.userId, i) ?? Infinity);
                    const soloGross = getGross(solo.userId, i);
                    if (teamBest === soloGross) return "Tie";
                  }
                  return null;
                })();

                const renderPoints = () => {
                  if (pointsEarned.length > 0) {
                    return pointsEarned
                      .map(
                        (e) =>
                          `${getPlayerById(e.userId)?.name || "Player"} +${e.pts}`
                      )
                      .join(", ");
                  }
                  if (tieLabel) return tieLabel;
                  return "—";
                };
                
                // Generate tooltip text explaining the calculation
                const getPointsTooltip = () => {
                  const wolfId = info.wolfId;
                  const decision = info.decision;
                  if (!wolfId || !decision) return "";
                  const others = getNonWolfPlayers(wolfId);
                  if (others.length !== 2) return "";
                  const [pA, pB] = others;
                  const w = getGross(wolfId, i);
                  const a = getGross(pA.userId, i);
                  const b = getGross(pB.userId, i);
                  if (w == null || a == null || b == null) return "";
                  
                  const wolfName = getPlayerById(wolfId)?.name || "Wolf";
                  const aName = getPlayerById(pA.userId)?.name || "Player A";
                  const bName = getPlayerById(pB.userId)?.name || "Player B";
                  
                  if (decision === "blind") {
                    const oppBest = Math.min(a, b);
                    if (w < oppBest) {
                      return `${wolfName} (${w}) beat Opponents' Best (${oppBest}) [Blind Lone Wolf]: ${wolfName} +6`;
                    } else if (w > oppBest) {
                      return `Opponents' Best (${oppBest}) beat ${wolfName} (${w}) [Blind Lone Wolf]: ${aName} +2, ${bName} +2`;
                    } else {
                      return `${wolfName} (${w}) tied Opponents' Best (${oppBest}) [Blind Lone Wolf]: ${wolfName} +2`;
                    }
                  } else if (decision === "lone") {
                    const oppBest = Math.min(a, b);
                    if (w < oppBest) {
                      return `${wolfName} (${w}) beat Opponents' Best (${oppBest}): ${wolfName} +3`;
                    } else if (w > oppBest) {
                      return `Opponents' Best (${oppBest}) beat ${wolfName} (${w}): ${aName} +1, ${bName} +1`;
                    } else {
                      return `${wolfName} (${w}) tied Opponents' Best (${oppBest}): ${wolfName} +1`;
                    }
                  } else if (typeof decision === "string") {
                    const partnerId = decision;
                    const partner = partnerId === pA.userId ? pA : partnerId === pB.userId ? pB : null;
                    const solo = partner && partner.userId === pA.userId ? pB : pA;
                    if (!partner || !solo) return "";
                    const partnerName = getPlayerById(partner.userId)?.name || "Partner";
                    const soloName = getPlayerById(solo.userId)?.name || "Solo";
                    const partnerGross = getGross(partner.userId, i);
                    const teamBest = Math.min(w, partnerGross ?? Infinity);
                    const soloGross = getGross(solo.userId, i);
                    if (teamBest < soloGross) {
                      return `Team Best (${teamBest}, from ${wolfName} ${w} or ${partnerName} ${partnerGross}) beat ${soloName} (${soloGross}): ${wolfName} +1, ${partnerName} +1`;
                    } else if (soloGross < teamBest) {
                      return `${soloName} (${soloGross}) beat Team Best (${teamBest}): ${soloName} +3`;
                    } else {
                      return `Team Best (${teamBest}) tied ${soloName} (${soloGross}): ${soloName} +1`;
                    }
                  }
                  return "";
                };
                return (
                  <tr key={i} className="border-t border-blue-500 dark:border-blue-400">
                    <td
                      className={`px-2 py-1 font-medium text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        0,
                        1,
                        {
                          top: displayIndex === 0,
                          bottom: displayIndex === holeCount - 1,
                          roundBottomLeft: true,
                        }
                      )}`}
                    >
                      <div>
                        <span className="font-bold">{i + 1}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          Par {hole.par ?? "?"}
                        </span>
                        {info.wolfId && (
                          <span className="ml-2 text-[10px] font-semibold text-green-700 dark:text-green-300">
                            Wolf: {getPlayerById(info.wolfId)?.name || "-"}
                          </span>
                        )}
                        <div className="text-[10px] mt-0.5 text-gray-600 dark:text-gray-300">
                          Choice:{" "}
                          {info.decision === "blind"
                            ? "Blind Lone Wolf (+6pts)"
                            : info.decision === "lone"
                            ? "Lone Wolf"
                            : info.partnerId
                            ? `Team with ${getPlayerById(info.partnerId)?.name || "Partner"}`
                            : "—"}
                        </div>
                      </div>
                    </td>
                    {/* Precompute team indices for isolation borders */}
                    {(() => {
                      const teamIndices = displayPlayers
                        .map((pl, idx2) => (info.teamIds.has(pl.userId) ? idx2 : -1))
                        .filter((v) => v >= 0)
                        .sort((a, b) => a - b);
                      const minTeamIdx = teamIndices.length > 0 ? teamIndices[0] : -1;
                      const maxTeamIdx = teamIndices.length > 1 ? teamIndices[1] : minTeamIdx;
                      return displayPlayers.map((p, idx) => {
                      const gross = getGross(p.userId, i);
                      const isTeam = info.teamIds.has(p.userId);
                      const isOpp = info.opponentIds.has(p.userId);
                      const isHighlight = info.highlightIds.has(p.userId);
                        // Compute isolation borders based on relative position to team
                        let borderLeft = false;
                        let borderRight = false;
                        if (isOpp && teamIndices.length === 2) {
                          if (idx > minTeamIdx && idx < maxTeamIdx) {
                            // Opponent between teammates: isolate both sides
                            borderLeft = true;
                            borderRight = true;
                          } else if (idx < minTeamIdx) {
                            // Opponent to the left of both teammates: isolate on right
                            borderRight = true;
                          } else if (idx > maxTeamIdx) {
                            // Opponent to the right of both teammates: isolate on left
                            borderLeft = true;
                          }
                        }
                        return (
                          <td
                            key={`${p.userId}-${i}`}
                            className={`px-2 py-1 text-center text-gray-900 dark:text-white ${buildColumnBorderClasses(
                              "border-blue-500 dark:border-blue-400 border-solid",
                              idx,
                              displayPlayers.length,
                              {
                                top: displayIndex === 0,
                                bottom: displayIndex === holeCount - 1,
                                roundBottomRight:
                                  displayIndex === holeCount - 1 &&
                                  idx === displayPlayers.length - 1,
                              }
                            )} ${borderLeft ? "border-l-4 border-blue-300 dark:border-blue-700" : ""} ${borderRight ? "border-r-4 border-blue-300 dark:border-blue-700" : ""} ${
                              isTeam
                                ? "bg-green-50 dark:bg-green-900/20"
                                : isOpp
                                ? "bg-gray-50 dark:bg-gray-800/40"
                                : ""
                            }`}
                          >
                            <div
                              className={`inline-block px-2 py-0.5 rounded ${
                                isHighlight
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold"
                                  : ""
                              }`}
                            >
                              {typeof gross === "number" ? gross : "—"}
                            </div>
                          </td>
                        );
                      });
                    })()}
                    <td
                      className={`px-2 py-1 text-center text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        displayPlayers.length,
                        displayPlayers.length + 1,
                        {
                          top: displayIndex === 0,
                          bottom: displayIndex === holeCount - 1,
                          roundBottomRight:
                            displayIndex === holeCount - 1,
                        }
                      )}`}
                      title={getPointsTooltip() || undefined}
                    >
                      <div className="text-xs font-semibold text-green-700 dark:text-green-300">
                        {renderPoints()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-blue-500 dark:border-blue-400 bg-gray-100 dark:bg-gray-800">
                <td
                  className={`px-2 py-3 font-bold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                    "border-blue-500 dark:border-blue-400 border-solid",
                    0,
                    1,
                    {
                      top: false,
                      bottom: true,
                      roundBottomLeft: true,
                    }
                  )}`}
                >
                  Total
                </td>
                {displayPlayers.map((player, idx) => {
                  let grossTotal = 0;
                  let pointsTotal = 0;
                  for (let h = startIndex; h < startIndex + holeCount; h++) {
                    const g = getGross(player.userId, h);
                    if (typeof g === "number" && g > 0) grossTotal += g;
                    const holePoints = calculateHolePointsMap(h);
                    if (holePoints && typeof holePoints[player.userId] === "number") {
                      pointsTotal += holePoints[player.userId];
                    }
                  }
                  return (
                    <td
                      key={`total-${player.userId}`}
                      className={`px-2 py-3 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        idx,
                        displayPlayers.length,
                        {
                          top: false,
                          bottom: true,
                          roundBottomRight: idx === displayPlayers.length - 1 && false,
                        }
                      )}`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm">{grossTotal > 0 ? grossTotal : "—"}</div>
                        <div className="text-xs font-bold text-green-600 dark:text-green-400">
                          {pointsTotal} pts
                        </div>
                      </div>
                    </td>
                  );
                })}
                <td
                  className={`px-2 py-3 text-center text-gray-900 dark:text-white ${buildColumnBorderClasses(
                    "border-blue-500 dark:border-blue-400 border-solid",
                    displayPlayers.length,
                    displayPlayers.length + 1,
                    {
                      top: false,
                      bottom: true,
                      roundBottomRight: true,
                    }
                  )}`}
                >
                  {/* Empty total for points column */}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-center px-3 sm:px-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl sm:rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


