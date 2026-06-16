import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import {
  getPendingGameInvite,
  processGameInvite,
  savePendingGameInvite,
} from "../lib/gameInvite";

/**
 * After login/register, auto-join tournament + game when the user arrived via
 * a game invite link (?game=… or sessionStorage pending invite).
 */
export function useGameInviteRedirect() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, refreshUser, setUserAndPersist } = useAuth();
  const { setTournament } = useTournament();
  const [processing, setProcessing] = useState(false);

  const gameIdFromUrl = searchParams.get("game");

  useEffect(() => {
    if (gameIdFromUrl) {
      savePendingGameInvite(gameIdFromUrl);
    }
  }, [gameIdFromUrl]);

  const processInviteIfPending = useCallback(
    async (userOverride) => {
      const activeUser = userOverride || user;
      const gameId = getPendingGameInvite() || gameIdFromUrl;
      if (!gameId || !activeUser?.uid || processing) return false;

      setProcessing(true);
      try {
        const result = await processGameInvite(activeUser, gameId);
        setTournament(result.tournamentId);

        const userSnap = await getDoc(doc(db, "users", activeUser.uid));
        if (userSnap.exists()) {
          setUserAndPersist({ ...activeUser, ...userSnap.data() });
        } else {
          await refreshUser();
        }

        if (gameIdFromUrl) {
          setSearchParams({}, { replace: true });
        }

        navigate("/scores", { replace: true });
        return true;
      } catch (err) {
        console.error("Failed to process game invite:", err);
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [
      gameIdFromUrl,
      navigate,
      processing,
      refreshUser,
      setSearchParams,
      setTournament,
      setUserAndPersist,
      user,
    ]
  );

  const hasPendingInvite = Boolean(getPendingGameInvite() || gameIdFromUrl);

  return { processInviteIfPending, processing, hasPendingInvite };
}
