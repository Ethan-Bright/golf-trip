import { useCallback, useEffect, useRef, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { getForceJoinGameId } from "../lib/gameInvite";

export default function useInProgressGames({
  currentTournament,
  gameId,
  isGameIncompleteForUser,
  onAutoResume,
}) {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resumedGameId, setResumedGameId] = useState(null);
  const loadedTournamentRef = useRef(null);
  const onAutoResumeRef = useRef(onAutoResume);
  const isGameIncompleteForUserRef = useRef(isGameIncompleteForUser);

  onAutoResumeRef.current = onAutoResume;
  isGameIncompleteForUserRef.current = isGameIncompleteForUser;

  const fetchGames = useCallback(async () => {
    if (!currentTournament) {
      setGames([]);
      setIsLoading(false);
      loadedTournamentRef.current = null;
      return;
    }

    const isInitialLoad = loadedTournamentRef.current !== currentTournament;
    if (isInitialLoad) {
      setIsLoading(true);
    }

    const gamesQuery = query(
      collection(db, "games"),
      where("status", "==", "inProgress"),
      where("tournamentId", "==", currentTournament),
      orderBy("updatedAt", "desc")
    );
    const snapshot = await getDocs(gamesQuery);
    const fetched = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const sorted = [...fetched].sort((a, b) => {
      const aUpdated = a.updatedAt?.seconds || 0;
      const bUpdated = b.updatedAt?.seconds || 0;
      return bUpdated - aUpdated;
    });

    setGames(sorted);

    const incompleteChecker = isGameIncompleteForUserRef.current;
    const incompleteForUser =
      typeof incompleteChecker === "function"
        ? sorted.find(incompleteChecker)
        : null;

    if (
      incompleteForUser &&
      !gameId &&
      !getForceJoinGameId() &&
      onAutoResumeRef.current &&
      resumedGameId !== incompleteForUser.id
    ) {
      try {
        await onAutoResumeRef.current(incompleteForUser);
        setResumedGameId(incompleteForUser.id);
      } catch (error) {
        console.error("Failed to resume game", error);
        setResumedGameId(null);
      }
    }

    loadedTournamentRef.current = currentTournament;
    setIsLoading(false);
  }, [currentTournament, gameId, resumedGameId]);

  useEffect(() => {
    if (gameId) return;
    fetchGames();
  }, [fetchGames, gameId]);

  return {
    inProgressGames: games,
    isLoadingGames: isLoading,
    refreshGames: fetchGames,
    resumedGame: Boolean(resumedGameId),
  };
}
