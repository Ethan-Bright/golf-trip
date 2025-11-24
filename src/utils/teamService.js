import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export const MAX_TEAM_SIZE = 3;

const PLAYER_SLOTS = ["player1", "player2", "player3"];

export function getTournamentTeamRef(tournamentId, teamId) {
  if (!tournamentId || !teamId) return null;
  return doc(db, "tournaments", tournamentId, "teams", teamId);
}

export async function getTournamentTeam(tournamentId, teamId) {
  const teamRef = getTournamentTeamRef(tournamentId, teamId);
  if (!teamRef) return null;
  const snap = await getDoc(teamRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function normalizeTeamPlayers(teamData = {}) {
  const normalized = [];
  const seenIds = new Set();

  const pushPlayer = (player) => {
    if (!player || typeof player !== "object") return;
    const uid = player.uid || player.userId || player.id;
    if (!uid || seenIds.has(uid)) return;
    seenIds.add(uid);
    normalized.push({
      uid,
      displayName: player.displayName || player.name || "",
      handicap: player.handicap ?? null,
      profilePictureUrl: player.profilePictureUrl || null,
    });
  };

  const source =
    Array.isArray(teamData.players) && teamData.players.length > 0
      ? teamData.players
      : PLAYER_SLOTS.map((slot) => teamData[slot]).filter(Boolean);

  source.forEach(pushPlayer);

  return normalized.slice(0, MAX_TEAM_SIZE);
}

const withNormalizedPlayers = (docSnap) => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    players: normalizeTeamPlayers(data),
  };
};

export async function fetchTeamsForTournament(tournamentId) {
  if (!tournamentId) return [];

  try {
    const teamsRef = collection(db, "tournaments", tournamentId, "teams");
    const snapshot = await getDocs(teamsRef);
    if (!snapshot.empty) {
      return snapshot.docs.map(withNormalizedPlayers);
    }
  } catch (error) {
    console.warn("Failed to load teams from tournament subcollection:", error);
  }

  try {
    const legacyQuery = query(
      collection(db, "teams"),
      where("tournamentId", "==", tournamentId)
    );
    const legacySnapshot = await getDocs(legacyQuery);
    if (!legacySnapshot.empty) {
      return legacySnapshot.docs.map(withNormalizedPlayers);
    }
  } catch (error) {
    console.warn("Failed to load legacy teams:", error);
  }

  return [];
}

