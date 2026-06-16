const MATCH_FORMAT_LABELS = {
  stableford: "Stableford Points",
  "1v1matchplayhandicaps": "1v1 Match Play (With Handicaps)",
  "1v1matchplaynohandicap": "1v1 Match Play (No Handicaps)",
  "2v2matchplayhandicaps": "2v2 Match Play (With Handicaps)",
  "2v2matchplaynohandicap": "2v2 Match Play (No Handicaps)",
  american: "American Scoring",
  "american net": "American Scoring (With Handicaps)",
  wolf: "Wolf (3 Players)",
  "wolf-handicap": "Wolf (3 Players, With Handicaps)",
  strokeplay: "Stroke Play",
  scorecard: "Scorecard",
};

const MATCH_FORMAT_ALIASES = {
  // Stableford
  stableford: "stableford",
  "stableford points": "stableford",
  "stableford scoring": "stableford",

  // 1v1 Match Play (Handicaps)
  matchplay: "1v1matchplayhandicaps",
  "match play": "1v1matchplayhandicaps",
  "match": "1v1matchplayhandicaps",
  "1v1matchplayhandicaps": "1v1matchplayhandicaps",

  // 1v1 Match Play (No Handicaps)
  "matchplay gross": "1v1matchplaynohandicap",
  "match play gross": "1v1matchplaynohandicap",
  "match gross": "1v1matchplaynohandicap",
  "1v1matchplaynohandicap": "1v1matchplaynohandicap",

  // 2v2 Match Play (Handicaps)
  "2v2 matchplay": "2v2matchplayhandicaps",
  "2v2 match play": "2v2matchplayhandicaps",
  "2v2": "2v2matchplayhandicaps",
  "2v2matchplayhandicaps": "2v2matchplayhandicaps",

  // 2v2 Match Play (No Handicaps)
  "2v2 matchplay gross": "2v2matchplaynohandicap",
  "2v2 match play gross": "2v2matchplaynohandicap",
  "2v2 gross": "2v2matchplaynohandicap",
  "2v2matchplaynohandicap": "2v2matchplaynohandicap",

  // American Scoring
  american: "american",
  "american scoring": "american",

  // American Scoring Net
  "american net": "american net",
  "american scoring net": "american net",
  "american net scoring": "american net",

  // Wolf (3 Players)
  wolf: "wolf",
  "wolf format": "wolf",
  "wolf game": "wolf",
  "the wolf": "wolf",
  "wolf gross": "wolf",

  // Wolf (3 Players, With Handicaps)
  "wolf-handicap": "wolf-handicap",
  "wolf net": "wolf-handicap",
  "wolf with handicaps": "wolf-handicap",
  "wolf handicaps": "wolf-handicap",

  // Stroke Play
  strokeplay: "strokeplay",
  "stroke play": "strokeplay",
  stroke: "strokeplay",
  medal: "strokeplay",

  // Scorecard
  scorecard: "scorecard",
};

export const MATCH_FORMAT_SELECT_OPTIONS = [
  { id: "stableford", label: MATCH_FORMAT_LABELS.stableford },
  {
    id: "1v1matchplayhandicaps",
    label: MATCH_FORMAT_LABELS["1v1matchplayhandicaps"],
  },
  {
    id: "1v1matchplaynohandicap",
    label: MATCH_FORMAT_LABELS["1v1matchplaynohandicap"],
  },
  {
    id: "2v2matchplayhandicaps",
    label: MATCH_FORMAT_LABELS["2v2matchplayhandicaps"],
  },
  {
    id: "2v2matchplaynohandicap",
    label: MATCH_FORMAT_LABELS["2v2matchplaynohandicap"],
  },
  { id: "american", label: MATCH_FORMAT_LABELS.american },
  { id: "american net", label: MATCH_FORMAT_LABELS["american net"] },
  { id: "wolf", label: MATCH_FORMAT_LABELS.wolf },
  { id: "wolf-handicap", label: MATCH_FORMAT_LABELS["wolf-handicap"] },
  { id: "strokeplay", label: MATCH_FORMAT_LABELS.strokeplay },
  { id: "scorecard", label: MATCH_FORMAT_LABELS.scorecard },
];

export const MATCHPLAY_FORMAT_IDS = new Set([
  "1v1matchplayhandicaps",
  "1v1matchplaynohandicap",
  "2v2matchplayhandicaps",
  "2v2matchplaynohandicap",
]);

export function normalizeMatchFormat(value) {
  if (!value) return "";
  const key = value.toString().trim().toLowerCase();
  return MATCH_FORMAT_ALIASES[key] || value;
}

export function getMatchFormatLabel(value) {
  const normalized = normalizeMatchFormat(value);
  return MATCH_FORMAT_LABELS[normalized] || value || "Unknown Format";
}

export function getAllMatchFormatLabels() {
  return MATCH_FORMAT_SELECT_OPTIONS.map((option) => option.label);
}

/** Max roster size for formats with a fixed player count; null = no cap. */
export const MATCH_FORMAT_PLAYER_LIMITS = {
  "1v1matchplayhandicaps": 2,
  "1v1matchplaynohandicap": 2,
  "2v2matchplayhandicaps": 4,
  "2v2matchplaynohandicap": 4,
  wolf: 3,
  "wolf-handicap": 3,
};

export function getMatchFormatPlayerLimit(format) {
  const normalized = normalizeMatchFormat(format);
  return MATCH_FORMAT_PLAYER_LIMITS[normalized] ?? null;
}

export function getGamePlayerCapacity(game) {
  const max = getMatchFormatPlayerLimit(game?.matchFormat);
  const current = Array.isArray(game?.players) ? game.players.length : 0;
  const isFull = max !== null && current >= max;
  const spotsRemaining = max !== null ? Math.max(0, max - current) : null;

  return { current, max, isFull, spotsRemaining };
}

export function formatPlayerCapacityLabel(game) {
  const { current, max } = getGamePlayerCapacity(game);
  if (max === null) {
    return `${current} player${current === 1 ? "" : "s"} joined`;
  }
  return `${current}/${max} players`;
}

export function canJoinGame(game) {
  if (!game || game.status !== "inProgress") return false;
  return !getGamePlayerCapacity(game).isFull;
}

export function getGameFullMessage(game) {
  const { max } = getGamePlayerCapacity(game);
  if (max === null) return "This game is no longer accepting players.";
  return `This game is full (${max} players max).`;
}




