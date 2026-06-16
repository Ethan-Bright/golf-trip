import {
  arrayUnion,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { getMatchFormatLabel, formatPlayerCapacityLabel, getGameFullMessage, getGamePlayerCapacity } from "./matchFormats";

export const PENDING_GAME_INVITE_KEY = "golfTripPendingGameInvite";
export const FORCE_JOIN_GAME_KEY = "golfTripForceJoinGameId";

export function buildGameInviteUrl(gameId) {
  if (typeof window === "undefined" || !gameId) return "";
  return `${window.location.origin}/join-game/${gameId}`;
}

export function savePendingGameInvite(gameId) {
  if (!gameId) return;
  try {
    sessionStorage.setItem(PENDING_GAME_INVITE_KEY, gameId);
  } catch (e) {
    console.error("Failed to save pending game invite", e);
  }
}

export function getPendingGameInvite() {
  try {
    return sessionStorage.getItem(PENDING_GAME_INVITE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingGameInvite() {
  try {
    sessionStorage.removeItem(PENDING_GAME_INVITE_KEY);
  } catch {
    // ignore
  }
}

export function setForceJoinGameId(gameId) {
  if (!gameId) return;
  try {
    sessionStorage.setItem(FORCE_JOIN_GAME_KEY, gameId);
  } catch (e) {
    console.error("Failed to save force-join game id", e);
  }
}

export function getForceJoinGameId() {
  try {
    return sessionStorage.getItem(FORCE_JOIN_GAME_KEY);
  } catch {
    return null;
  }
}

export function clearForceJoinGameId() {
  try {
    sessionStorage.removeItem(FORCE_JOIN_GAME_KEY);
  } catch {
    // ignore
  }
}

function formatHoleDescription(game) {
  const holeCount = game.holeCount || 18;
  if (holeCount === 9) {
    return game.nineType === "back" ? "9 Holes (Back 9)" : "9 Holes (Front 9)";
  }
  if (game.startingHole === 10) {
    return "18 Holes (Starting Hole 10)";
  }
  return "18 Holes";
}

export function buildGameInviteMessage({
  game,
  tournamentName,
  inviterName,
  url,
}) {
  const inviteUrl = url || buildGameInviteUrl(game?.id);
  const courseName = game?.course?.name || "Golf course TBC";
  const formatLabel = getMatchFormatLabel(game?.matchFormat);
  const holesLabel = formatHoleDescription(game);
  const playersLabel = formatPlayerCapacityLabel(game);
  const hostLine = inviterName ? `Hosted by ${inviterName}` : null;
  const tournamentLine = tournamentName ? `🏆 ${tournamentName}` : null;

  const lines = [
    "🏌️ You're invited to play!",
    "",
    `📍 ${courseName}`,
    game?.name ? `🎯 ${game.name}` : null,
    `⛳ ${formatLabel} · ${holesLabel}`,
    `👥 ${playersLabel}`,
    hostLine,
    tournamentLine,
    "",
    "Tap to join:",
    inviteUrl,
    "",
    "Golf Trip Leaderboard",
  ].filter(Boolean);

  return lines.join("\n");
}

export async function fetchGameInviteDetails(gameId) {
  if (!gameId) return null;

  const gameSnap = await getDoc(doc(db, "games", gameId));
  if (!gameSnap.exists()) return null;

  const game = { id: gameSnap.id, ...gameSnap.data() };
  let tournamentName = "";

  if (game.tournamentId) {
    const tournamentSnap = await getDoc(doc(db, "tournaments", game.tournamentId));
    if (tournamentSnap.exists()) {
      tournamentName = tournamentSnap.data().name || "";
    }
  }

  let inviterName = "";
  if (game.createdBy) {
    const creatorSnap = await getDoc(doc(db, "users", game.createdBy));
    if (creatorSnap.exists()) {
      inviterName = creatorSnap.data().displayName || "";
    }
  }

  return { game, tournamentName, inviterName };
}

export async function joinTournamentViaInvite(user, tournamentId) {
  if (!user?.uid || !tournamentId) {
    throw new Error("Missing user or tournament");
  }

  const memberRef = doc(db, "tournaments", tournamentId, "members", user.uid);
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.exists()) {
    return { joined: false, tournamentId };
  }

  const tournamentRef = doc(db, "tournaments", tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) {
    throw new Error("Tournament not found");
  }

  const tournamentData = tournamentSnap.data();

  await setDoc(memberRef, {
    uid: user.uid,
    displayName: user.displayName,
    handicap: user.handicap ?? 0,
    profilePictureUrl: user.profilePictureUrl ?? null,
    joinedAt: new Date(),
  });

  await setDoc(
    tournamentRef,
    { memberCount: (tournamentData.memberCount || 0) + 1 },
    { merge: true }
  );

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  const currentTournaments = userSnap.data()?.tournaments || [];

  if (!currentTournaments.includes(tournamentId)) {
    await setDoc(
      userRef,
      { tournaments: [...currentTournaments, tournamentId] },
      { merge: true }
    );
  }

  return { joined: true, tournamentId };
}

export async function joinGameAsPlayer(gameId, user) {
  if (!gameId || !user?.uid) {
    throw new Error("Missing game or user");
  }

  const gameRef = doc(db, "games", gameId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(gameRef);
    if (!snap.exists()) throw new Error("Game not found");

    const data = snap.data();
    if (data.status !== "inProgress") {
      throw new Error("This game is no longer accepting players");
    }

    const players = Array.isArray(data.players) ? data.players : [];
    const existing = players.find((p) => p.userId === user.uid);
    if (existing) {
      return { game: { id: snap.id, ...data }, alreadyJoined: true };
    }

    const capacity = getGamePlayerCapacity({ ...data, players });
    if (capacity.isFull) {
      throw new Error(getGameFullMessage({ ...data, players }));
    }

    const holeLen = (data.course?.holes || []).length || 18;
    const initialScores = Array.from({ length: holeLen }, () => ({
      gross: null,
      net: null,
      netScore: null,
      fir: null,
      gir: null,
      putts: null,
    }));

    const newPlayer = {
      userId: user.uid,
      name: user.displayName || "Unknown Player",
      handicap: user.handicap ?? 0,
      scores: initialScores,
      trackStats: false,
      trackStatsLocked: false,
    };

    tx.update(gameRef, {
      players: [...players, newPlayer],
      status: "inProgress",
      updatedAt: serverTimestamp(),
      playerIds: arrayUnion(user.uid),
    });

    return {
      game: {
        id: snap.id,
        ...data,
        players: [...players, newPlayer],
      },
      alreadyJoined: false,
    };
  });
}

export async function processGameInvite(user, gameId) {
  const details = await fetchGameInviteDetails(gameId);
  if (!details?.game) {
    throw new Error("Game not found or invite link is invalid");
  }

  const { game, tournamentName } = details;

  if (!game.tournamentId) {
    throw new Error("This game is not linked to a tournament");
  }

  if (getGamePlayerCapacity(game).isFull) {
    throw new Error(getGameFullMessage(game));
  }

  await joinTournamentViaInvite(user, game.tournamentId);
  await joinGameAsPlayer(gameId, user);

  clearPendingGameInvite();
  setForceJoinGameId(gameId);

  return { game, tournamentName, tournamentId: game.tournamentId };
}

export async function shareGameInvite({ game, tournamentName, inviterName }) {
  const url = buildGameInviteUrl(game.id);
  const text = buildGameInviteMessage({
    game,
    tournamentName,
    inviterName,
    url,
  });

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Join my golf game",
        text,
      });
      return { method: "share" };
    } catch (error) {
      if (error?.name === "AbortError") {
        return { method: "cancelled" };
      }
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  return { method: "whatsapp" };
}
