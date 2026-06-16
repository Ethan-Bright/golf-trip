import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import PageShell from "../components/layout/PageShell";
import {
  buildGameInviteMessage,
  fetchGameInviteDetails,
  processGameInvite,
  savePendingGameInvite,
} from "../lib/gameInvite";
import {
  canJoinGame,
  formatPlayerCapacityLabel,
  getGameFullMessage,
  getGamePlayerCapacity,
  getMatchFormatLabel,
} from "../lib/matchFormats";
import useJoinGameMeta from "../hooks/useJoinGameMeta";

export default function JoinGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { setTournament } = useTournament();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const joinAttemptedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!gameId) {
        setError("Invalid invite link.");
        setLoading(false);
        return;
      }

      try {
        const result = await fetchGameInviteDetails(gameId);
        if (cancelled) return;

        if (!result) {
          setError("This game could not be found. The link may have expired.");
        } else if (result.game.status !== "inProgress") {
          setError("This game is no longer in progress.");
        } else if (!canJoinGame(result.game)) {
          setError(getGameFullMessage(result.game));
          setDetails(result);
        } else {
          setDetails(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load game details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  useJoinGameMeta(details);

  const capacity = useMemo(
    () => (details?.game ? getGamePlayerCapacity(details.game) : null),
    [details]
  );
  const gameIsJoinable = details?.game ? canJoinGame(details.game) : false;

  const previewMessage = useMemo(() => {
    if (!details?.game) return "";
    return buildGameInviteMessage({
      game: details.game,
      tournamentName: details.tournamentName,
      inviterName: details.inviterName,
    });
  }, [details]);

  const holeLabel = useMemo(() => {
    if (!details?.game) return "";
    const game = details.game;
    const holeCount = game.holeCount || 18;
    if (holeCount === 9) {
      return game.nineType === "back" ? "Back 9" : "Front 9";
    }
    return game.startingHole === 10 ? "18 holes from 10" : "18 holes";
  }, [details]);

  const handleJoin = async () => {
    if (!user?.uid || !gameId) return;

    setJoining(true);
    setError("");

    try {
      const result = await processGameInvite(user, gameId);
      setTournament(result.tournamentId);
      await refreshUser();
      navigate("/scores", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to join game.");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (authLoading || loading || !user?.uid || !details?.game || joining) return;
    if (!gameIsJoinable) return;
    if (joinAttemptedRef.current) return;
    joinAttemptedRef.current = true;
    handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, loading, user?.uid, details?.game?.id, gameIsJoinable]);

  const handleAuthNavigate = (path) => {
    savePendingGameInvite(gameId);
    navigate(`${path}?game=${gameId}`);
  };

  if (authLoading || (user && joining)) {
    return (
      <PageShell title="Joining game..." description="Setting up your spot in the match.">
        <div className="mobile-card p-8 text-center text-[var(--text-muted)]">
          {joining ? "Adding you to the tournament and game..." : "Loading..."}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Game invite"
      title={details?.game?.name || "Join a golf game"}
      description="You've been invited to play. Create an account or sign in to join automatically."
      backHref="/"
    >
      {loading ? (
        <div className="mobile-card p-8 text-center text-[var(--text-muted)]">
          Loading game details...
        </div>
      ) : error && !details ? (
        <div className="mobile-card p-6 space-y-4">
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300 rounded-2xl text-sm">
            {error}
          </div>
          <Link to="/" className="btn btn-secondary btn-block">
            Go home
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="mobile-card p-6 space-y-4">
            <div className="space-y-1">
              <span className="eyebrow">Course</span>
              <p className="text-xl font-bold text-[var(--text-strong)]">
                {details.game.course?.name || "Course TBC"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-3">
                <p className="text-[var(--text-muted)]">Format</p>
                <p className="font-semibold text-[var(--text-strong)]">
                  {getMatchFormatLabel(details.game.matchFormat)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-3">
                <p className="text-[var(--text-muted)]">Holes</p>
                <p className="font-semibold text-[var(--text-strong)]">{holeLabel}</p>
              </div>
              <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-3">
                <p className="text-[var(--text-muted)]">Players</p>
                <p className="font-semibold text-[var(--text-strong)]">
                  {formatPlayerCapacityLabel(details.game)}
                </p>
                {capacity?.max !== null && capacity.spotsRemaining > 0 && (
                  <p className="text-xs text-brand-600 dark:text-brand-300 mt-1">
                    {capacity.spotsRemaining} spot
                    {capacity.spotsRemaining === 1 ? "" : "s"} left
                  </p>
                )}
                {capacity?.isFull && (
                  <p className="text-xs text-red-500 dark:text-red-300 mt-1">
                    Game full
                  </p>
                )}
              </div>
              {details.tournamentName && (
                <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-3">
                  <p className="text-[var(--text-muted)]">Tournament</p>
                  <p className="font-semibold text-[var(--text-strong)]">
                    {details.tournamentName}
                  </p>
                </div>
              )}
            </div>

            {details.inviterName && (
              <p className="text-sm text-[var(--text-muted)]">
                Invited by <span className="font-semibold">{details.inviterName}</span>
              </p>
            )}

            {details.game.players?.length > 0 && (
              <div>
                <p className="field-label">Who&apos;s playing</p>
                <ul className="text-sm text-[var(--text-muted)] space-y-1">
                  {details.game.players.map((player) => (
                    <li key={player.userId}>{player.name || "Player"}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="mobile-card p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">
              {user ? "Ready to play?" : "Join in one step"}
            </h2>
            <p className="text-sm text-[var(--text-muted)]">
              {user
                ? "Tap below to join this game and start entering scores."
                : "New here? Create an account and we'll add you to the tournament and this game automatically — no password needed."}
            </p>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300 rounded-2xl text-sm">
                {error}
              </div>
            )}

            {!gameIsJoinable ? (
              <p className="text-sm text-[var(--text-muted)]">
                This game can&apos;t accept more players right now. Ask the host
                to create a new game if you still want to play.
              </p>
            ) : user ? (
              <button
                type="button"
                onClick={() => {
                  joinAttemptedRef.current = false;
                  handleJoin();
                }}
                disabled={joining}
                className="btn btn-primary btn-block"
              >
                {joining ? "Joining..." : "Join game"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleAuthNavigate("/register")}
                  className="btn btn-primary btn-block"
                >
                  Create account & join
                </button>
                <button
                  type="button"
                  onClick={() => handleAuthNavigate("/login")}
                  className="btn btn-secondary btn-block"
                >
                  I already have an account
                </button>
              </>
            )}
          </section>

          <section className="mobile-card p-6">
            <p className="field-label">Preview message</p>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-muted)] font-sans leading-relaxed">
              {previewMessage}
            </pre>
          </section>
        </div>
      )}
    </PageShell>
  );
}
