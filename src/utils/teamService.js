import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

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

export async function fetchTeamsForTournament(tournamentId) {
  if (!tournamentId) return [];

  try {
    const teamsRef = collection(db, "tournaments", tournamentId, "teams");
    const snapshot = await getDocs(teamsRef);
    if (!snapshot.empty) {
      return snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
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
      return legacySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    }
  } catch (error) {
    console.warn("Failed to load legacy teams:", error);
  }

  return [];
}

