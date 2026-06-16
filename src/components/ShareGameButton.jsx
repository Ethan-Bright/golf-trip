import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import {
  buildGameInviteUrl,
  fetchGameInviteDetails,
  shareGameInvite,
} from "../lib/gameInvite";

export default function ShareGameButton({
  game,
  className = "",
  variant = "secondary",
  label = "Share game",
  showCopy = true,
}) {
  const { user } = useAuth();
  const { currentTournament } = useTournament();
  const [tournamentName, setTournamentName] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copyState, setCopyState] = useState("Copy link");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const tournamentId = game?.tournamentId || currentTournament;
      if (!tournamentId) {
        setTournamentName("");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "tournaments", tournamentId));
        if (!cancelled && snap.exists()) {
          setTournamentName(snap.data().name || "");
        }
      } catch (error) {
        console.error("Failed to load tournament name for share", error);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [game?.tournamentId, currentTournament]);

  if (!game?.id) return null;

  const inviteUrl = buildGameInviteUrl(game.id);
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "ghost"
        ? "btn-ghost"
        : "btn-secondary";

  const handleShare = async () => {
    setSharing(true);
    try {
      let inviterName = user?.displayName || "";
      if (!inviterName && game.createdBy) {
        const details = await fetchGameInviteDetails(game.id);
        inviterName = details?.inviterName || "";
      }

      await shareGameInvite({
        game,
        tournamentName,
        inviterName,
      });
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("Copied!");
      setTimeout(() => setCopyState("Copy link"), 1800);
    } catch (error) {
      console.error("Copy failed", error);
      setCopyState("Copy failed");
      setTimeout(() => setCopyState("Copy link"), 1800);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleShare}
        disabled={sharing}
        className={`btn btn-sm ${variantClass}`}
      >
        {sharing ? "Sharing..." : label}
      </button>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="btn btn-sm btn-secondary"
        >
          {copyState}
        </button>
      )}
    </div>
  );
}
