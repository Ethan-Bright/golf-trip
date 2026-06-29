/**
 * Helpers for "score for a friend" delegate requests stored on game documents.
 *
 * Each entry in `scoringDelegates`:
 * { id, scorerUserId, scorerName, playerUserId, playerName, status, createdAt }
 * status: pending | approved | declined | revoked
 */

export function normalizeScoringDelegates(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry) =>
      entry &&
      typeof entry.id === "string" &&
      typeof entry.scorerUserId === "string" &&
      typeof entry.playerUserId === "string" &&
      typeof entry.status === "string"
  );
}

export function canScoreForPlayer(delegates, scorerUserId, playerUserId) {
  if (!scorerUserId || !playerUserId) return false;
  if (scorerUserId === playerUserId) return true;
  return delegates.some(
    (d) =>
      d.scorerUserId === scorerUserId &&
      d.playerUserId === playerUserId &&
      d.status === "approved"
  );
}

export function getIncomingPendingRequests(delegates, playerUserId) {
  return delegates.filter(
    (d) => d.playerUserId === playerUserId && d.status === "pending"
  );
}

export function getOutgoingPendingRequests(delegates, scorerUserId) {
  return delegates.filter(
    (d) => d.scorerUserId === scorerUserId && d.status === "pending"
  );
}

export function getApprovedTargetsForScorer(delegates, scorerUserId) {
  return delegates.filter(
    (d) => d.scorerUserId === scorerUserId && d.status === "approved"
  );
}

export function getDelegateForPair(delegates, scorerUserId, playerUserId) {
  return (
    delegates.find(
      (d) =>
        d.scorerUserId === scorerUserId && d.playerUserId === playerUserId
    ) || null
  );
}

export function removeDelegatesForUser(delegates, userId) {
  return delegates.filter(
    (d) => d.scorerUserId !== userId && d.playerUserId !== userId
  );
}

export function createDelegateRequest({
  scorerUserId,
  scorerName,
  playerUserId,
  playerName,
}) {
  return {
    id: `${scorerUserId}_${playerUserId}_${Date.now()}`,
    scorerUserId,
    scorerName: scorerName || "Unknown",
    playerUserId,
    playerName: playerName || "Unknown",
    status: "pending",
    createdAt: Date.now(),
  };
}

export function upsertDelegateEntry(delegates, entry) {
  const withoutPair = delegates.filter(
    (d) =>
      !(
        d.scorerUserId === entry.scorerUserId &&
        d.playerUserId === entry.playerUserId
      )
  );
  return [...withoutPair, entry];
}

export function updateDelegateById(delegates, id, patch) {
  return delegates.map((d) => (d.id === id ? { ...d, ...patch } : d));
}

/** Only one approved scorer per player; revoke other approvals when accepting. */
export function approveDelegateRequest(delegates, requestId) {
  const request = delegates.find((d) => d.id === requestId);
  if (!request || request.status !== "pending") return delegates;

  const now = Date.now();
  return delegates.map((d) => {
    if (d.id === requestId) {
      return { ...d, status: "approved", respondedAt: now };
    }
    if (d.playerUserId === request.playerUserId && d.status === "approved") {
      return { ...d, status: "revoked", respondedAt: now };
    }
    return d;
  });
}

export function declineDelegateRequest(delegates, requestId) {
  return updateDelegateById(delegates, requestId, {
    status: "declined",
    respondedAt: Date.now(),
  });
}

export function revokeApprovedDelegate(delegates, scorerUserId, playerUserId) {
  return delegates.map((d) =>
    d.scorerUserId === scorerUserId &&
    d.playerUserId === playerUserId &&
    d.status === "approved"
      ? { ...d, status: "revoked", respondedAt: Date.now() }
      : d
  );
}
