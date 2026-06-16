import { normalizeMatchFormat } from "./matchFormats";

// Formats that are played off handicap — compare net strokes for these.
const NET_FORMATS = new Set([
  "stableford",
  "1v1matchplayhandicaps",
  "2v2matchplayhandicaps",
  "american net",
  "wolf-handicap",
]);

const valueForHole = (score, useNet) => {
  if (!score) return null;
  if (useNet && typeof score.netScore === "number") return score.netScore;
  return typeof score.gross === "number" ? score.gross : null;
};

// Compare two players' totals across holes they BOTH played in one game.
const compareInGame = (me, opp, start, end, useNet) => {
  let myTotal = 0;
  let oppTotal = 0;
  let holesCompared = 0;
  for (let i = start; i < end; i++) {
    const myV = valueForHole(me.scores?.[i], useNet);
    const oppV = valueForHole(opp.scores?.[i], useNet);
    if (myV == null || oppV == null) continue;
    myTotal += myV;
    oppTotal += oppV;
    holesCompared += 1;
  }
  return { myTotal, oppTotal, holesCompared };
};

/**
 * Lifetime head-to-head records for `userId` vs every player they've shared a
 * completed (non-fun) game with. Each game is decided by who had the lower
 * score (net for handicap formats, gross otherwise) over the holes both played.
 *
 * @returns array of { opponentId, name, profilePictureUrl, wins, losses, ties, games }
 *          sorted by most games, then best win differential.
 */
export function computeHeadToHead(games, userId) {
  if (!userId || !Array.isArray(games)) return [];

  const records = new Map();

  for (const game of games) {
    if (!game || game.isFunGame || game.status !== "complete") continue;
    const players = Array.isArray(game.players) ? game.players : [];
    const me = players.find((p) => p.userId === userId);
    if (!me) continue;

    const holeStart = game.nineType === "back" ? 9 : 0;
    const holeCount =
      game.holeCount || game.course?.holes?.length || 18;
    const holeEnd = holeStart + holeCount;
    const useNet = NET_FORMATS.has(normalizeMatchFormat(game.matchFormat || ""));

    for (const opp of players) {
      if (!opp || opp.userId === userId || !opp.userId) continue;

      const { myTotal, oppTotal, holesCompared } = compareInGame(
        me,
        opp,
        holeStart,
        holeEnd,
        useNet
      );
      if (holesCompared === 0) continue;

      const rec =
        records.get(opp.userId) || {
          opponentId: opp.userId,
          name: opp.name || opp.displayName || "Player",
          profilePictureUrl: opp.profilePictureUrl || null,
          wins: 0,
          losses: 0,
          ties: 0,
          games: 0,
        };

      rec.games += 1;
      if (myTotal < oppTotal) rec.wins += 1;
      else if (myTotal > oppTotal) rec.losses += 1;
      else rec.ties += 1;

      // Keep the most recent display info we encounter.
      if (opp.name) rec.name = opp.name;
      if (opp.profilePictureUrl) rec.profilePictureUrl = opp.profilePictureUrl;

      records.set(opp.userId, rec);
    }
  }

  return Array.from(records.values()).sort(
    (a, b) =>
      b.games - a.games || (b.wins - b.losses) - (a.wins - a.losses)
  );
}
