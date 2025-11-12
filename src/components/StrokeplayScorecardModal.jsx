import React from "react";

const TEAM_BORDER_COLOR = "border-blue-500 dark:border-blue-400 border-solid";
const OPPONENT_BORDER_COLOR = "border-blue-500 dark:border-blue-400 border-solid";

function buildColumnBorderClasses(
  colorClass,
  index,
  groupLength,
  {
    top = false,
    bottom = false,
    roundBottomLeft = false,
    roundBottomRight = false,
  } = {}
) {
  if (groupLength === 0) return "";
  const classes = [
    colorClass,
    index === 0 ? "border-l-2" : "border-l-0",
    index === groupLength - 1 ? "border-r-2" : "border-r-0",
    top ? "border-t-2" : "border-t-0",
    bottom ? "border-b-2" : "border-b-0",
    "border-solid",
  ];
  if (bottom && roundBottomLeft && index === 0) {
    classes.push("rounded-bl-lg");
  }
  if (bottom && roundBottomRight && index === groupLength - 1) {
    classes.push("rounded-br-lg");
  }
  return classes.join(" ");
}

export default function StrokeplayScorecardModal({ game, selectedTeam, onClose }) {
  if (!game || !selectedTeam) return null;

  // Get ALL players in the game with their scores (for strokeplay, show both players)
  const players = game.players || [];
  const playerMap = new Map(players.map((p) => [p.userId, p]));

  const formatDisplayPlayer = (player, fallbackName) => {
    if (!player) return null;
    return {
      ...player,
      displayLabel: fallbackName || player.name || "Unknown Golfer",
    };
  };

  const selectedTeamRoster = Array.isArray(selectedTeam.players)
    ? selectedTeam.players
    : [];
  const selectedTeamPlayerIds = selectedTeamRoster
    .map((p) => p?.id || p?.uid)
    .filter(Boolean);

  const teamPlayers = selectedTeamPlayerIds
    .map((id) => {
      const gamePlayer = playerMap.get(id);
      if (!gamePlayer) return null;
      const rosterEntry = selectedTeamRoster.find(
        (p) => (p?.id || p?.uid) === id
      );
      return formatDisplayPlayer(
        gamePlayer,
        rosterEntry?.displayName || rosterEntry?.name
      );
    })
    .filter(Boolean);

  const opponentRoster = Array.isArray(selectedTeam.opponentPlayers)
    ? selectedTeam.opponentPlayers
    : [];

  const opponentPlayersFromRoster = opponentRoster
    .map((opponent) => {
      const opponentId = opponent?.id || opponent?.uid;
      if (!opponentId) return null;
      const gamePlayer = playerMap.get(opponentId);
      if (!gamePlayer) return null;
      return formatDisplayPlayer(
        gamePlayer,
        opponent.displayName || opponent.name
      );
    })
    .filter(Boolean);

  const fallbackOpponents = players
    .filter((p) => !selectedTeamPlayerIds.includes(p.userId))
    .map((p) => formatDisplayPlayer(p));

  const opponentPlayers =
    opponentPlayersFromRoster.length > 0
      ? opponentPlayersFromRoster
      : fallbackOpponents;

  const hasTeamGrouping =
    !selectedTeam.isSolo &&
    teamPlayers.length > 0 &&
    opponentPlayers.length > 0;

  const enrichedPlayers = players.map((p) => formatDisplayPlayer(p));

  const leftGroup =
    teamPlayers.length > 0
      ? teamPlayers
      : enrichedPlayers.slice(0, 1).filter(Boolean);

  const leftIdSet = new Set(leftGroup.map((p) => p.userId));

  const rightGroup =
    opponentPlayers.length > 0
      ? opponentPlayers
      : enrichedPlayers.filter((p) => !leftIdSet.has(p.userId));

  const combinedDisplay = [
    ...leftGroup,
    ...rightGroup.filter((p) => !leftIdSet.has(p.userId)),
  ];

  const allDisplayPlayers =
    combinedDisplay.length > 0 ? combinedDisplay : enrichedPlayers;

  const teamDisplayName =
    selectedTeam.name ||
    selectedTeam.displayName ||
    (teamPlayers.length > 1
      ? "Selected Team"
      : teamPlayers[0]?.displayLabel || "Player");
  const opponentDisplayName =
    selectedTeam.opponentDisplayName ||
    (opponentPlayers.length > 1
      ? "Opponents"
      : opponentPlayers[0]?.displayLabel || "Opponent");

  const leftName =
    teamPlayers.length > 1
      ? teamDisplayName
      : leftGroup[0]?.displayLabel || leftGroup[0]?.name || "Player 1";
  const rightName =
    opponentPlayers.length > 1
      ? opponentDisplayName
      : rightGroup[0]?.displayLabel || rightGroup[0]?.name || "Player 2";

  const bestGrossForGroup = (group, holeIndex) => {
    const values = group
      .map((player) => player?.scores?.[holeIndex]?.gross)
      .filter((val) => typeof val === "number");
    if (values.length === 0) return null;
    return Math.min(...values);
  };

  const buildGroupHighlightInfo = (group, holeIndex) => {
    const best = bestGrossForGroup(group, holeIndex);
    if (best == null) {
      return { best: null, tiedIds: new Set(), isTie: false };
    }
    const tiedIds = new Set(
      group
        .filter(
          (player) =>
            typeof player?.scores?.[holeIndex]?.gross === "number" &&
            player.scores[holeIndex].gross === best
        )
        .map((player) => player.userId)
    );
    return { best, tiedIds, isTie: tiedIds.size > 1 };
  };
  
  if (!players || players.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            No players found for this game.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  const playerTotals = allDisplayPlayers.map((player) => {
    const scores = player?.scores ?? [];
    let total = 0;
    for (let i = startIndex; i < startIndex + holeCount; i++) {
      const gross = scores[i]?.gross;
      if (typeof gross === "number") {
        total += gross;
      }
    }
    return total;
  });

  // Calculate match status after each hole with +/- formatting
  const calculateMatchStatus = (displayIndex) => {
    if (leftGroup.length === 0 || rightGroup.length === 0) {
      return { label: "—", variant: "waiting", diff: 0 };
    }

    let diff = 0;
    let holesPlayed = 0;

    for (let i = 0; i <= displayIndex; i++) {
      const actualHoleIndex = startIndex + i;
      const leftGross = bestGrossForGroup(leftGroup, actualHoleIndex);
      const rightGross = bestGrossForGroup(rightGroup, actualHoleIndex);
      if (leftGross == null || rightGross == null) continue;

      holesPlayed++;
      diff += rightGross - leftGross;
    }

    if (holesPlayed === 0) return { label: "—", variant: "waiting", diff: 0 };
    if (diff === 0) return { label: "Even", variant: "even", diff: 0 };

    if (diff > 0) {
      return {
        label: `${leftName} +${diff}`,
        variant: "leader",
        diff,
      };
    }

    return {
      label: `${rightName} +${Math.abs(diff)}`,
      variant: "leader",
      diff,
    };
  };

  const finalMatchStatus =
    holeCount > 0 ? calculateMatchStatus(holeCount - 1) : { label: "" };

  const totalSummary = hasTeamGrouping
    ? [
        {
          label: teamDisplayName,
          value: playerTotals
            .slice(0, leftGroup.length)
            .reduce((sum, val) => sum + val, 0),
        },
        {
          label: opponentDisplayName,
          value: playerTotals
            .slice(leftGroup.length)
            .reduce((sum, val) => sum + val, 0),
        },
      ]
    : allDisplayPlayers.map((player, idx) => ({
        label: player?.displayLabel || player?.name || "Player",
        value: playerTotals[idx] ?? 0,
      }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {game.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl sm:text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full border-collapse text-xs sm:text-sm min-w-[500px]">
            <thead>
              <tr>
                <th
                  className="px-2 py-1 text-left align-bottom border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tl-lg"
                  rowSpan={hasTeamGrouping ? 2 : 1}
                >
                  Hole
                </th>
                {hasTeamGrouping ? (
                  <>
                    <th
                      colSpan={teamPlayers.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white rounded-tl-lg border-2 border-b-0 ${TEAM_BORDER_COLOR}`}
                    >
                      {teamDisplayName}
                    </th>
                    <th
                      colSpan={opponentPlayers.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white rounded-tr-lg border-2 border-b-0 ${OPPONENT_BORDER_COLOR}`}
                    >
                      {opponentDisplayName}
                    </th>
                    <th
                      className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white align-bottom border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tr-lg"
                      rowSpan={2}
                    >
                      Match Status
                    </th>
                  </>
                ) : (
                  <>
                    {allDisplayPlayers.map((p) => (
                      <th
                        key={p.userId}
                        className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white"
                      >
                        {p.displayLabel || p.name}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white border-2 border-solid border-blue-500 dark:border-blue-400">
                      Match Status
                    </th>
                  </>
                )}
              </tr>
              {hasTeamGrouping && (
                <tr>
                  {teamPlayers.map((p, idx) => (
                    <th
                      key={`team-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        TEAM_BORDER_COLOR,
                        idx,
                        teamPlayers.length,
                        { top: false, bottom: false }
                      )}`}
                    >
                      {p.displayLabel || p.name}
                    </th>
                  ))}
                  {opponentPlayers.map((p, idx) => (
                    <th
                      key={`opponent-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        OPPONENT_BORDER_COLOR,
                        idx,
                        opponentPlayers.length,
                        { top: false, bottom: false }
                      )}`}
                    >
                      {p.displayLabel || p.name}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const matchData = calculateMatchStatus(displayIndex);
                const hole = game.course?.holes?.[holeIndex];
                const par = hole?.par || "?";
                
                const leftHighlight = buildGroupHighlightInfo(
                  leftGroup,
                  holeIndex
                );
                const rightHighlight = buildGroupHighlightInfo(
                  rightGroup,
                  holeIndex
                );
                 
                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-blue-500 dark:border-blue-400"
                  >
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
                        <span className="font-bold">{holeIndex + 1}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          Par {par}
                        </span>
                      </div>
                    </td>
                    {allDisplayPlayers.map((p, idx) => {
                      const rawGross = p.scores?.[holeIndex]?.gross;
                      const grossScore =
                        typeof rawGross === "number" ? rawGross : "-";
                      const highlightState = (() => {
                        if (leftHighlight.tiedIds.has(p.userId)) {
                          return leftHighlight.isTie ? "tie" : "best";
                        }
                        if (rightHighlight.tiedIds.has(p.userId)) {
                          return rightHighlight.isTie ? "tie" : "best";
                        }
                        return null;
                      })();

                      const cellClass =
                        highlightState === "best"
                          ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-bold rounded-lg"
                          : highlightState === "tie"
                          ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-lg"
                          : "text-gray-900 dark:text-white";

                      const isLeftGroup = idx < leftGroup.length;
                      const groupIndex = isLeftGroup
                        ? idx
                        : idx - leftGroup.length;
                      const groupLength = isLeftGroup
                        ? leftGroup.length
                        : rightGroup.length;

                      const borderClasses =
                        hasTeamGrouping && groupLength > 0
                          ? buildColumnBorderClasses(
                              TEAM_BORDER_COLOR,
                              groupIndex,
                              groupLength,
                              {
                                top: displayIndex === 0,
                                bottom: displayIndex === holeCount - 1,
                              }
                            )
                          : "";

                      return (
                        <td
                          key={p.userId + displayIndex}
                          className={`px-2 py-1 text-center ${cellClass} ${borderClasses}`}
                        >
                          {grossScore}
                        </td>
                      );
                    })}
                    <td
                      className={`px-2 py-1 text-center ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        0,
                        1,
                        {
                          top: displayIndex === 0,
                          bottom: displayIndex === holeCount - 1,
                          roundBottomRight: true,
                        }
                      )}`}
                    >
                      {(() => {
                        const baseClass =
                          matchData.variant === "leader"
                            ? "px-2 py-1 rounded-lg text-sm font-semibold bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                            : matchData.variant === "even"
                            ? "px-2 py-1 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                            : "px-2 py-1 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
                        return (
                          <span className={baseClass}>{matchData.label}</span>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          <tfoot>
            <tr>
              <th
                className="px-2 py-2 text-left font-semibold border-2 border-blue-500 dark:border-blue-400 border-solid rounded-bl-lg"
              >
                Total
              </th>
              {allDisplayPlayers.map((player, idx) => {
                const total = playerTotals[idx] ?? 0;
                const isLeftGroup = idx < leftGroup.length;
                const groupIndex = isLeftGroup ? idx : idx - leftGroup.length;
                const groupLength = isLeftGroup
                  ? leftGroup.length
                  : rightGroup.length;
                const borderClasses =
                  hasTeamGrouping && groupLength > 0
                    ? buildColumnBorderClasses(
                        isLeftGroup
                          ? TEAM_BORDER_COLOR
                          : OPPONENT_BORDER_COLOR,
                        groupIndex,
                        groupLength,
                        {
                          top: true,
                          bottom: true,
                          roundBottomLeft: isLeftGroup && groupIndex === 0,
                          roundBottomRight:
                            !isLeftGroup && groupIndex === groupLength - 1,
                        }
                      )
                    : "border-2 border-blue-500 dark:border-blue-400 border-solid";

                return (
                  <td
                    key={`total-${player?.userId ?? idx}`}
                    className={`px-2 py-2 text-center font-semibold text-blue-800 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/30 ${borderClasses}`}
                  >
                    {total}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center border-2 border-blue-500 dark:border-blue-400 border-solid rounded-br-lg" />
            </tr>
          </tfoot>
          </table>
        </div>

        <div className="mt-3 text-sm text-blue-800 dark:text-blue-200 space-y-1">
          {totalSummary.map((entry, idx) => (
            <div key={`summary-${idx}`}>
              {entry.label}: {entry.value}
            </div>
          ))}
          {finalMatchStatus?.label && (
            <div>Final Result: {finalMatchStatus.label}</div>
          )}
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
