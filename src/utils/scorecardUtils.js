export const TEAM_BORDER_COLOR =
  "border-blue-500 dark:border-blue-400 border-solid";
export const OPPONENT_BORDER_COLOR =
  "border-blue-500 dark:border-blue-400 border-solid";

export function buildColumnBorderClasses(
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

const formatDisplayPlayer = (player, fallbackName) => {
  if (!player) return null;
  return {
    ...player,
    displayLabel: fallbackName || player.name || "Unknown Golfer",
  };
};

export function buildScorecardGroups(game, selectedTeam) {
  const players = Array.isArray(game?.players) ? game.players : [];
  const playerMap = new Map(players.map((p) => [p.userId, p]));

  const selectedTeamRoster = Array.isArray(selectedTeam?.players)
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

  const opponentRoster = Array.isArray(selectedTeam?.opponentPlayers)
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
    selectedTeam?.name ||
    selectedTeam?.displayName ||
    (leftGroup.length > 1
      ? "Selected Team"
      : leftGroup[0]?.displayLabel || leftGroup[0]?.name || "Player");
  const opponentDisplayName =
    selectedTeam?.opponentDisplayName ||
    (rightGroup.length > 1
      ? "Opponents"
      : rightGroup[0]?.displayLabel || rightGroup[0]?.name || "Opponent");

  const leftName =
    leftGroup.length > 1
      ? teamDisplayName
      : leftGroup[0]?.displayLabel || leftGroup[0]?.name || "Player 1";
  const rightName =
    rightGroup.length > 1
      ? opponentDisplayName
      : rightGroup[0]?.displayLabel || rightGroup[0]?.name || "Player 2";

  const hasTeamGrouping =
    !selectedTeam?.isSolo &&
    leftGroup.length > 0 &&
    rightGroup.length > 0 &&
    (leftGroup.length > 1 || rightGroup.length > 1);

  return {
    players,
    playerMap,
    leftGroup,
    rightGroup,
    allDisplayPlayers,
    teamDisplayName,
    opponentDisplayName,
    leftName,
    rightName,
    hasTeamGrouping,
  };
}

export function buildGroupHighlightInfo(
  group,
  holeIndex,
  { valueSelector, preferLower = true } = {}
) {
  if (!Array.isArray(group) || group.length === 0) {
    return { best: null, tiedIds: new Set(), isTie: false };
  }

  const selectValue =
    valueSelector ||
    ((player, index) => {
      const gross = player?.scores?.[index]?.gross;
      return typeof gross === "number" ? gross : null;
    });

  let best = null;
  const tiedIds = new Set();

  group.forEach((player) => {
    const value = selectValue(player, holeIndex);
    if (value == null) return;

    const isBetter =
      best == null ||
      (preferLower ? value < best : value > best);

    if (isBetter) {
      best = value;
      tiedIds.clear();
      tiedIds.add(player.userId);
    } else if (value === best) {
      tiedIds.add(player.userId);
    }
  });

  return { best, tiedIds, isTie: tiedIds.size > 1 };
}

export function formatGrossWithNet(gross, netScore) {
  if (typeof gross !== "number" || Number.isNaN(gross)) {
    return null;
  }

  const hasNet =
    typeof netScore === "number" && !Number.isNaN(netScore);

  if (!hasNet) {
    return `${gross}`;
  }

  const formattedNet = Number.isInteger(netScore)
    ? netScore.toString()
    : netScore.toFixed(1);

  return `${gross} (${formattedNet})`;
}

