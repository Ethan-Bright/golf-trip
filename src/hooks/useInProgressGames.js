import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function useInProgressGames({
  currentTournament,
  gameId,
  isGameIncompleteForUser,
  onAutoResume,
}) {
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resumedGameId, setResumedGameId] = useState(null);

  const fetchGames = useCallback(async () => {
    if (!currentTournament) {
      setGames([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
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

    const incompleteForUser =
      typeof isGameIncompleteForUser === "function"
        ? sorted.find(isGameIncompleteForUser)
        : null;

    if (
      incompleteForUser &&
      !gameId &&
      onAutoResume &&
      resumedGameId !== incompleteForUser.id
    ) {
      try {
        await onAutoResume(incompleteForUser);
        setResumedGameId(incompleteForUser.id);
      } catch (error) {
        console.error("Failed to resume game", error);
        setResumedGameId(null);
      }
    }

    setIsLoading(false);
  }, [currentTournament, gameId, isGameIncompleteForUser, onAutoResume, resumedGameId]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return {
    inProgressGames: games,
    isLoadingGames: isLoading,
    refreshGames: fetchGames,
    resumedGame: Boolean(resumedGameId),
  };
}

