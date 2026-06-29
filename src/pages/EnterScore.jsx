import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  doc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import useModal from "../hooks/useModal";
import useInProgressGames from "../hooks/useInProgressGames";
import InProgressGamesList from "../components/scoreEntry/InProgressGamesList";
import ScorecardGrid from "../components/scoreEntry/ScorecardGrid";
import ScoringDelegatePanel from "../components/scoreEntry/ScoringDelegatePanel";
import ShareGameButton from "../components/ShareGameButton";
import { useTournament } from "../context/TournamentContext";
import {
  getMatchFormatLabel,
  normalizeMatchFormat,
  canJoinGame,
  getGameFullMessage,
} from "../lib/matchFormats";
import {
  clearForceJoinGameId,
  getForceJoinGameId,
} from "../lib/gameInvite";
import { strokesReceivedForHole } from "../lib/scoring";
import {
  fetchTeamsForTournament,
  normalizeTeamPlayers,
} from "../utils/teamService";
import {
  approveDelegateRequest,
  canScoreForPlayer,
  createDelegateRequest,
  declineDelegateRequest,
  normalizeScoringDelegates,
  removeDelegatesForUser,
  revokeApprovedDelegate,
  upsertDelegateEntry,
} from "../lib/scoringDelegates";

export default function EnterScore({ userId, user }) {
  const navigate = useNavigate();
  const { modal, hideModal, showSuccess, showError, showChoice } = useModal();
  const { currentTournament } = useTournament();
  const [matchFormat, setMatchFormat] = useState(""); // start with placeholder
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [points, setPoints] = useState(0);
  const [holeCount, setHoleCount] = useState(""); // start empty for "Select Number of Holes"
  const [nineType, setNineType] = useState(""); // start empty for "Select 9 Holes"
  const [startingHole, setStartingHole] = useState(1); // tee box start for 18-hole rounds (1 or 10)
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [trackStats, setTrackStats] = useState(false);
  const [trackStatsLocked, setTrackStatsLocked] = useState(false);
  const [isFunGame, setIsFunGame] = useState(false);
  const [wolfOrder, setWolfOrder] = useState(null); // array of userIds length 3
  const [wolfDecisions, setWolfDecisions] = useState([]); // per-hole: 'lone' | partnerUserId | null
  const [wolfHoles, setWolfHoles] = useState(null); // per-hole: { wolfId, decision } | null
  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);
  const [scoringDelegates, setScoringDelegates] = useState([]);
  const [activeScoringTargetUserId, setActiveScoringTargetUserId] =
    useState(null);

  // Concurrency / live-sync guards.
  const seededGameIdRef = useRef(null); // which gameId's score buffer we've seeded
  const isDirtyRef = useRef(false); // true once the user edits, gates auto-save
  const saveInFlightRef = useRef(false); // a save is currently writing
  const pendingSaveRef = useRef(null); // queued save (auto flag) while one is in flight
  const wolfOrderWriteRef = useRef(false); // prevents duplicate wolfOrder writes

  const normalizedFormat = normalizeMatchFormat(matchFormat);
  const isWolfFormat =
    normalizedFormat === "wolf" || normalizedFormat === "wolf-handicap";
  const isWolfHandicapFormat = normalizedFormat === "wolf-handicap";

  const effectiveScoringUserId = activeScoringTargetUserId || userId;
  const scoringForFriend =
    Boolean(activeScoringTargetUserId) &&
    activeScoringTargetUserId !== userId;
  const activeScoringPlayer = useMemo(
    () =>
      (gamePlayers || []).find((p) => p.userId === effectiveScoringUserId) ||
      null,
    [gamePlayers, effectiveScoringUserId]
  );

  const normalizePlayerScores = useCallback((playerScores) => {
    return (playerScores || []).map((score) => ({
      ...score,
      fir: score.fir ?? null,
      gir: score.gir ?? null,
      putts: score.putts ?? null,
    }));
  }, []);

  const sanitizeWolfDecisions = useCallback(
    (decisions, length) => {
      const allowedUserIds = new Set((gamePlayers || []).map((p) => p.userId));
      const out = Array.from({ length }, () => null);
      if (Array.isArray(decisions)) {
        for (let i = 0; i < Math.min(decisions.length, length); i++) {
          const v = decisions[i];
          if (v === "lone" || v === "blind") {
            out[i] = v;
          } else if (typeof v === "string" && allowedUserIds.has(v)) {
            out[i] = v;
          } else {
            out[i] = null;
          }
        }
      }
      return out;
    },
    [gamePlayers]
  );

  const deriveTrackStatsPreference = useCallback(
    (player, gameData) => player?.trackStats ?? gameData?.trackStats ?? false,
    []
  );

  const deriveTrackStatsLockState = useCallback(
    (player, gameData) =>
      player?.trackStatsLocked ??
      player?.trackStats ??
      gameData?.trackStatsLocked ??
      gameData?.trackStats ??
      false,
    []
  );

  const seedScoresFromPlayer = useCallback(
    (player, gameData) => {
      if (!player) return;
      const normalizedScores = normalizePlayerScores(player.scores);
      setScores(normalizedScores);
      setTrackStats(deriveTrackStatsPreference(player, gameData));
      setTrackStatsLocked(deriveTrackStatsLockState(player, gameData));
      setPoints(normalizedScores.reduce((sum, s) => sum + (s.net ?? 0), 0));
      isDirtyRef.current = false;
    },
    [
      deriveTrackStatsPreference,
      deriveTrackStatsLockState,
      normalizePlayerScores,
    ]
  );

  const isGameIncompleteForUser = useCallback(
    (game) => {
      const player = game.players?.find((p) => p.userId === userId);
      if (!player) return false;

      const expectedHoles = game.holeCount || 18;
      const startIndex = game.nineType === "back" ? 9 : 0;
      const endIndex =
        expectedHoles === 9
          ? startIndex + 9
          : game.course?.holes?.length || player.scores?.length || 18;

      const relevantScores = (player.scores || []).slice(startIndex, endIndex);

      return !relevantScores.every((score) => score?.gross !== null);
    },
    [userId]
  );

  const isGameComplete = useCallback((game) => {
    if (!game.players || game.players.length === 0) return false;

    const expectedHoles = game.holeCount || 18;
    const startIndex = game.nineType === "back" ? 9 : 0;
    const endIndex =
      expectedHoles === 9
        ? startIndex + 9
        : game.course?.holes?.length || 18;

    const expectedScoreCount = endIndex - startIndex;

    // Check if all players have completed all their scores
    return game.players.every((player) => {
      const allScores = player.scores || [];
      // Ensure we have at least enough scores in the array
      if (allScores.length < endIndex) return false;
      
      const relevantScores = allScores.slice(startIndex, endIndex);
      // Ensure we have the right number of scores
      if (relevantScores.length !== expectedScoreCount) return false;
      // Check that all scores have a gross value (not null)
      return relevantScores.every((score) => score?.gross !== null && score?.gross !== undefined);
    });
  }, []);

  // --- Live sync of the current game ---
  // Subscribe to the game doc so other players' scores, wolf decisions, and
  // roster changes appear in real time. We only seed THIS user's editable score
  // buffer once per game so incoming snapshots never clobber active edits.
  useEffect(() => {
    if (!gameId) return undefined;
    const gameRef = doc(db, "games", gameId);

    const unsub = onSnapshot(
      gameRef,
      (gameSnap) => {
        if (!gameSnap.exists()) return;
        const gameData = gameSnap.data();
        const remotePlayers = gameData.players || [];
        const totalHoles = gameData.holeCount || 18;

        setGamePlayers(remotePlayers);
        setWolfOrder(gameData.wolfOrder || null);
        setWolfHoles(
          Array.isArray(gameData.wolfHoles) ? gameData.wolfHoles : null
        );
        setIsFunGame(Boolean(gameData.isFunGame));

        const liveDelegates = normalizeScoringDelegates(
          gameData.scoringDelegates
        );
        setScoringDelegates(liveDelegates);

        // Sanitize wolf decisions against the live roster (avoids a stale-closure
        // dependency on gamePlayers, which would force a resubscribe each change).
        const allowedIds = new Set(remotePlayers.map((p) => p.userId));
        const liveDecisions = Array.isArray(gameData.wolfDecisions)
          ? gameData.wolfDecisions
          : [];
        setWolfDecisions(
          Array.from({ length: totalHoles }, (_, i) => {
            const v = liveDecisions[i];
            if (v === "lone" || v === "blind") return v;
            if (typeof v === "string" && allowedIds.has(v)) return v;
            return null;
          })
        );

        // Seed the editable buffer + per-round prefs only on the first snapshot
        // for this game (or after a fresh join), never on subsequent updates.
        if (seededGameIdRef.current !== gameId) {
          const scoringTarget = activeScoringTargetUserId || userId;
          const targetPlayer = remotePlayers.find(
            (p) => p.userId === scoringTarget
          );
          const me = remotePlayers.find((p) => p.userId === userId);
          const playerToSeed =
            targetPlayer &&
            canScoreForPlayer(liveDelegates, userId, scoringTarget)
              ? targetPlayer
              : me;
          if (playerToSeed) {
            seedScoresFromPlayer(playerToSeed, gameData);
            setHoleCount(totalHoles);
            setNineType(
              totalHoles === 9 && gameData.nineType ? gameData.nineType : "front"
            );
            setStartingHole(gameData.startingHole || 1);
            seededGameIdRef.current = gameId;
          }
        }
      },
      (error) => {
        console.error("Error syncing game:", error);
      }
    );

    return () => unsub();
  }, [gameId, userId, activeScoringTargetUserId, seedScoresFromPlayer]);

  // If delegate access is revoked while scoring for a friend, switch back to self.
  useEffect(() => {
    if (!activeScoringTargetUserId || !userId) return;
    if (
      canScoreForPlayer(scoringDelegates, userId, activeScoringTargetUserId)
    ) {
      return;
    }
    setActiveScoringTargetUserId(null);
    const me = gamePlayers.find((p) => p.userId === userId);
    if (me) {
      seedScoresFromPlayer(me, {
        trackStats,
        trackStatsLocked,
      });
    }
  }, [
    activeScoringTargetUserId,
    scoringDelegates,
    userId,
    gamePlayers,
    seedScoresFromPlayer,
    trackStats,
    trackStatsLocked,
  ]);

  // Ensure a wolf order exists once a wolf game has exactly 3 players. Guarded by
  // a transaction so concurrent clients can't each randomize a different order.
  useEffect(() => {
    if (!gameId || !isWolfFormat) return;
    if ((gamePlayers || []).length !== 3) return;
    if (Array.isArray(wolfOrder) && wolfOrder.length === 3) return;
    if (wolfOrderWriteRef.current) return;
    wolfOrderWriteRef.current = true;

    (async () => {
      try {
        const gameRef = doc(db, "games", gameId);
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(gameRef);
          if (!snap.exists()) return;
          const data = snap.data();
          if (Array.isArray(data.wolfOrder) && data.wolfOrder.length === 3) return;
          const ids = (data.players || []).map((p) => p.userId);
          if (ids.length !== 3) return;
          const randomized = [...ids].sort(() => Math.random() - 0.5);
          tx.update(gameRef, {
            wolfOrder: randomized,
            updatedAt: serverTimestamp(),
          });
        });
      } catch (e) {
        console.error("Failed to set wolfOrder:", e);
      } finally {
        wolfOrderWriteRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, isWolfFormat, gamePlayers, wolfOrder]);

  // --- Join existing game ---
  const joinGame = useCallback(async (game) => {
    if (!game?.course?.holes) {
      showError("This game is missing course data and can't be joined.", "Error");
      return;
    }

    const alreadyInGame = game.players?.some((p) => p.userId === userId);
    if (!alreadyInGame && !canJoinGame(game)) {
      showError(getGameFullMessage(game), "Game Full");
      return;
    }

    const initialScores = game.course.holes.map(() => ({
      gross: null,
      net: null,
      netScore: null,
      fir: null,
      gir: null,
      putts: null,
    }));

    try {
      const gameRef = doc(db, "games", game.id);
      const holeLen = (game.course?.holes || []).length || 18;

      // Re-read inside a transaction and append atomically so two players
      // joining at once can't drop each other from the roster.
      const { gameData, joinedPlayer, isExisting } = await runTransaction(
        db,
        async (tx) => {
          const snap = await tx.get(gameRef);
          if (!snap.exists()) throw new Error("Game not found");
          const data = snap.data();
          const players = Array.isArray(data.players) ? data.players : [];
          const existing = players.find((p) => p.userId === userId);
          if (existing) {
            return { gameData: data, joinedPlayer: existing, isExisting: true };
          }
          const newPlayer = {
            userId,
            name: user?.displayName || "Unknown Player",
            handicap: user?.handicap ?? 0,
            scores: initialScores,
            trackStats: false,
            trackStatsLocked: false,
          };
          tx.update(gameRef, {
            players: [...players, newPlayer],
            status: "inProgress",
            updatedAt: serverTimestamp(),
            playerIds: arrayUnion(userId),
          });
          return {
            gameData: { ...data, players: [...players, newPlayer] },
            joinedPlayer: newPlayer,
            isExisting: false,
          };
        }
      );

      const totalHoles = gameData.holeCount || holeLen;

      setHoleCount(totalHoles);
      setNineType(gameData.nineType || "front");
      setStartingHole(gameData.startingHole || 1);
      setMatchFormat(normalizeMatchFormat(gameData.matchFormat || ""));
      setGamePlayers(gameData.players || []);
      setWolfOrder(gameData.wolfOrder || null);
      setWolfHoles(
        Array.isArray(gameData.wolfHoles) ? gameData.wolfHoles : null
      );
      const joinPlayers = gameData.players || [];
      const allowedUserIds = new Set(joinPlayers.map((p) => p.userId));
      const rawWolfDecisions = Array.isArray(gameData.wolfDecisions)
        ? gameData.wolfDecisions
        : Array(holeLen).fill(null);
      setWolfDecisions(
        Array.from({ length: holeLen }, (_, i) => {
          const v = rawWolfDecisions[i];
          if (v === "lone" || v === "blind") return v;
          if (typeof v === "string" && allowedUserIds.has(v)) return v;
          return null;
        })
      );
      setIsFunGame(Boolean(gameData.isFunGame));
      setSelectedCourse(game.course);
      setGameName(game.name || "");

      const playerScores = normalizePlayerScores(
        joinedPlayer.scores || initialScores
      );
      setScores(playerScores);
      setPoints(playerScores.reduce((sum, s) => sum + (s.net ?? 0), 0));
      setTrackStats(
        isExisting ? deriveTrackStatsPreference(joinedPlayer, gameData) : false
      );
      setTrackStatsLocked(
        isExisting ? deriveTrackStatsLockState(joinedPlayer, gameData) : false
      );
      setScoringDelegates(normalizeScoringDelegates(gameData.scoringDelegates));
      setActiveScoringTargetUserId(null);

      // Mark this game's buffer as seeded so the live snapshot won't overwrite
      // the scores we just set, then activate the game.
      isDirtyRef.current = false;
      seededGameIdRef.current = game.id;
      setGameId(game.id);
    } catch (error) {
      console.error("Error joining game:", error);
      showError("Failed to join game", "Error");
    }
  }, [
    deriveTrackStatsPreference,
    deriveTrackStatsLockState,
    normalizePlayerScores,
    showError,
    user?.displayName,
    user?.handicap,
    userId,
  ]);

  const {
    inProgressGames,
    isLoadingGames,
    resumedGame,
  } = useInProgressGames({
    userId,
    currentTournament,
    gameId,
    isGameIncompleteForUser,
    onAutoResume: joinGame,
  });

  // After accepting a game invite, open that specific game (not another in-progress round).
  useEffect(() => {
    const forcedGameId = getForceJoinGameId();
    if (!forcedGameId || gameId || isLoadingGames) return;

    const forcedGame = inProgressGames.find((g) => g.id === forcedGameId);
    if (forcedGame) {
      clearForceJoinGameId();
      joinGame(forcedGame);
    }
  }, [gameId, inProgressGames, isLoadingGames, joinGame]);

  const totalHolesInGame = holeCount || selectedCourse?.holes?.length || 18;
  const startIndex = useMemo(
    () => (nineType === "back" ? 9 : 0),
    [nineType]
  );
  const endIndex = useMemo(
    () =>
      holeCount === 9
        ? startIndex + 9
        : selectedCourse?.holes.length || 18,
    [holeCount, startIndex, selectedCourse]
  );
  const displayedHoles = useMemo(
    () => selectedCourse?.holes.slice(startIndex, endIndex) || [],
    [selectedCourse, startIndex, endIndex]
  );
  const displayedScores = useMemo(
    () => scores.slice(startIndex, endIndex),
    [scores, startIndex, endIndex]
  );

  const playOrder = useMemo(() => {
    const totalHoles = endIndex - startIndex;
    if (!selectedCourse?.holes || totalHoles <= 0) return [];

    if (holeCount === 9) {
      return Array.from({ length: totalHoles }, (_, i) => startIndex + i);
    }

    const baseOrder = Array.from({ length: totalHoles }, (_, i) => startIndex + i);
    if (holeCount === 18 && startingHole === 10) {
      return Array.from({ length: totalHoles }, (_, i) => (9 + i) % totalHoles);
    }
    return baseOrder;
  }, [endIndex, startIndex, selectedCourse, holeCount, startingHole]);

  const playOrderIndexMap = useMemo(() => {
    const map = new Map();
    playOrder.forEach((holeIdx, orderPos) => map.set(holeIdx, orderPos));
    return map;
  }, [playOrder]);

  const firstUnenteredOrderPos = useMemo(
    () =>
      playOrder.findIndex((absIndex) => {
        const gross = scores?.[absIndex]?.gross;
        return gross === null || gross === undefined;
      }),
    [playOrder, scores]
  );

  const firstUnenteredHoleIndex = useMemo(
    () =>
      firstUnenteredOrderPos === -1 ? null : playOrder[firstUnenteredOrderPos],
    [firstUnenteredOrderPos, playOrder]
  );

  const getHoleLockState = useCallback(
    (absIndex) => {
      const orderPos = playOrderIndexMap.get(absIndex);
      const gross = scores?.[absIndex]?.gross;
      const holeInfo = wolfHoles?.[absIndex];
      const wolfDecision =
        holeInfo && "decision" in holeInfo
          ? holeInfo.decision
          : wolfDecisions?.[absIndex] ?? null;
      const wolfLocked =
        isWolfFormat &&
        (wolfDecision === null || wolfDecision === undefined);
      const futureLocked =
        firstUnenteredOrderPos !== -1 &&
        orderPos !== undefined &&
        orderPos > firstUnenteredOrderPos &&
        (gross === null || gross === undefined);
      const locked = Boolean(wolfLocked || futureLocked);
      const reason = wolfLocked
        ? "Wolf must choose before scoring."
        : futureLocked
        ? "Enter earlier holes first."
        : "";

      return { locked, reason, wolfDecision };
    },
    [
      playOrderIndexMap,
      scores,
      wolfHoles,
      wolfDecisions,
      isWolfFormat,
      firstUnenteredOrderPos,
    ]
  );

  useEffect(() => {
    setHasAutoScrolled(false);
  }, [gameId, startIndex, startingHole, holeCount]);

  useEffect(() => {
    if (hasAutoScrolled) return;
    if (
      firstUnenteredHoleIndex === null ||
      firstUnenteredHoleIndex === undefined ||
      typeof document === "undefined"
    ) {
      return;
    }

    const card = document.getElementById(`hole-card-${firstUnenteredHoleIndex}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const input = document.getElementById(
      `hole-input-${firstUnenteredHoleIndex}`
    );
    if (input) {
      input.focus({ preventScroll: true });
    }
    setHasAutoScrolled(true);
  }, [firstUnenteredHoleIndex, hasAutoScrolled]);
  const getWolfForHole = (absHoleIndex) => {
    if (!isWolfFormat || !wolfOrder || wolfOrder.length !== 3) return null;
    return wolfOrder[absHoleIndex % 3] || null;
  };
  const getPlayerById = (id) => (gamePlayers || []).find((p) => p.userId === id) || null;
  const getNonWolfPlayers = (wolfId) =>
    (gamePlayers || []).filter((p) => p.userId !== wolfId);
  const getGrossFor = (player, absHoleIndex) =>
    (player?.scores?.[absHoleIndex]?.gross ?? null);
  
  // Get net score for a player on a hole (for handicap formats)
  const getNetFor = (player, absHoleIndex) => {
    if (
      !player ||
      !selectedCourse?.holes?.[absHoleIndex] ||
      player.handicap === null ||
      player.handicap === undefined
    )
      return null;
    const gross = getGrossFor(player, absHoleIndex);
    if (gross == null) return null;
    const hole = selectedCourse.holes[absHoleIndex];
    const strokeAdjustment = strokesReceivedForHole(
      player.handicap,
      hole.strokeIndex
    );
    return Math.max(0, gross - strokeAdjustment);
  };
  
  // Get score (gross or net depending on format)
  const getScoreFor = (player, absHoleIndex) => {
    if (isWolfHandicapFormat) {
      return getNetFor(player, absHoleIndex);
    }
    return getGrossFor(player, absHoleIndex);
  };

  const handleWolfDecisionChange = async (absHoleIndex, decision) => {
    // decision: 'lone', 'blind', or partnerUserId
    const lengthHint = Math.max((totalHolesInGame || 18), absHoleIndex + 1);
    // Normalize the incoming decision
    let normalizedDecision = null;
    if (decision === "lone" || decision === "blind") {
      normalizedDecision = decision;
    } else if (
      typeof decision === "string" &&
      (gamePlayers || []).some((p) => p.userId === decision)
    ) {
      normalizedDecision = decision;
    } else {
      normalizedDecision = null;
    }
    if (!gameId) return;
    try {
      const gameRef = doc(db, "games", gameId);
      // Read + merge + write atomically so concurrent decisions on different
      // holes can't truncate or clobber each other.
      const { mergedDecisions, mergedWolfHoles } = await runTransaction(
        db,
        async (tx) => {
          const snap = await tx.get(gameRef);
          const data = snap.exists() ? snap.data() : {};
          const courseLen =
            (data?.course?.holes && Array.isArray(data.course.holes)
              ? data.course.holes.length
              : selectedCourse?.holes?.length) || 18;
          const finalLen = Math.max(courseLen, lengthHint);

          const existingDecisions = Array.isArray(data?.wolfDecisions)
            ? [...data.wolfDecisions]
            : [];
          const nextDecisions = Array.from({ length: finalLen }, (_, i) => {
            const val = existingDecisions[i];
            return val === undefined ? null : val;
          });
          nextDecisions[absHoleIndex] = normalizedDecision;

          const existingWolfHoles = Array.isArray(data?.wolfHoles)
            ? [...data.wolfHoles]
            : [];
          const nextWolfHoles = Array.from({ length: finalLen }, (_, i) => {
            const current = existingWolfHoles[i];
            if (i === absHoleIndex) {
              const wid = getWolfForHole(i);
              return wid ? { wolfId: wid, decision: normalizedDecision } : null;
            }
            if (current && typeof current === "object") {
              return {
                wolfId: current.wolfId ?? getWolfForHole(i),
                decision:
                  current.decision === undefined
                    ? (nextDecisions[i] ?? null)
                    : current.decision,
              };
            }
            const wid = getWolfForHole(i);
            return wid
              ? { wolfId: wid, decision: nextDecisions[i] ?? null }
              : null;
          });

          tx.update(gameRef, {
            wolfDecisions: nextDecisions,
            wolfHoles: nextWolfHoles,
            updatedAt: serverTimestamp(),
          });

          return { mergedDecisions: nextDecisions, mergedWolfHoles: nextWolfHoles };
        }
      );

      setWolfDecisions(mergedDecisions);
      setWolfHoles(mergedWolfHoles);
    } catch (e) {
      console.error("Failed to save wolf decision:", e);
      showError("Failed to save wolf decision", "Error");
    }
  };

  const updateScoringDelegates = async (nextDelegates) => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(gameRef);
      if (!snap.exists()) throw new Error("Game not found");
      tx.update(gameRef, {
        scoringDelegates: nextDelegates,
        updatedAt: serverTimestamp(),
      });
    });
    setScoringDelegates(nextDelegates);
  };

  const handleRequestScoring = async (playerUserId) => {
    if (!gameId || !userId || playerUserId === userId) return;
    const target = gamePlayers.find((p) => p.userId === playerUserId);
    if (!target) {
      showError("That player is not in this game.", "Error");
      return;
    }
    const existing = scoringDelegates.find(
      (d) =>
        d.scorerUserId === userId &&
        d.playerUserId === playerUserId &&
        (d.status === "pending" || d.status === "approved")
    );
    if (existing) {
      showError("You already have a pending or approved request.", "Error");
      return;
    }
    try {
      const next = upsertDelegateEntry(
        scoringDelegates,
        createDelegateRequest({
          scorerUserId: userId,
          scorerName: user?.displayName,
          playerUserId,
          playerName: target.name,
        })
      );
      await updateScoringDelegates(next);
      showSuccess(
        `Request sent to ${target.name}. They must approve before you can enter their scores.`,
        "Request sent"
      );
    } catch (error) {
      console.error("Failed to request scoring delegate:", error);
      showError("Failed to send scoring request", "Error");
    }
  };

  const handleCancelScoringRequest = async (playerUserId) => {
    if (!gameId || !userId) return;
    try {
      const next = scoringDelegates.filter(
        (d) =>
          !(
            d.scorerUserId === userId &&
            d.playerUserId === playerUserId &&
            d.status === "pending"
          )
      );
      await updateScoringDelegates(next);
    } catch (error) {
      console.error("Failed to cancel scoring request:", error);
      showError("Failed to cancel request", "Error");
    }
  };

  const handleRespondToScoringRequest = async (requestId, approved) => {
    if (!gameId || !userId) return;
    const request = scoringDelegates.find((d) => d.id === requestId);
    if (!request || request.playerUserId !== userId) return;
    try {
      const next = approved
        ? approveDelegateRequest(scoringDelegates, requestId)
        : declineDelegateRequest(scoringDelegates, requestId);
      await updateScoringDelegates(next);
      showSuccess(
        approved
          ? `${request.scorerName} can now enter scores for you.`
          : "Scoring request declined.",
        approved ? "Access granted" : "Request declined"
      );
    } catch (error) {
      console.error("Failed to respond to scoring request:", error);
      showError("Failed to update request", "Error");
    }
  };

  const handleRevokeScoringDelegate = async (scorerUserId, playerUserId) => {
    if (!gameId || !userId || playerUserId !== userId) return;
    try {
      const next = revokeApprovedDelegate(
        scoringDelegates,
        scorerUserId,
        playerUserId
      );
      await updateScoringDelegates(next);
      showSuccess("Scoring access revoked.", "Success");
    } catch (error) {
      console.error("Failed to revoke scoring delegate:", error);
      showError("Failed to revoke access", "Error");
    }
  };

  const handleSwitchScoringTarget = async (targetUserId) => {
    const nextTarget =
      !targetUserId || targetUserId === userId ? null : targetUserId;
    if (nextTarget === activeScoringTargetUserId) return;

    if (nextTarget && !canScoreForPlayer(scoringDelegates, userId, nextTarget)) {
      showError("You do not have permission to score for that player.", "Error");
      return;
    }

    if (isDirtyRef.current) {
      await saveScores(true);
    }

    const targetPlayer = gamePlayers.find(
      (p) => p.userId === (nextTarget || userId)
    );
    if (targetPlayer) {
      seedScoresFromPlayer(targetPlayer, {
        trackStats,
        trackStatsLocked,
      });
    }

    seededGameIdRef.current = gameId;
    setActiveScoringTargetUserId(nextTarget);
    setHasAutoScrolled(false);
  };

  // --- Handle score changes ---
  const handleScoreChange = (holeIndex, value) => {
    const lockState = getHoleLockState(holeIndex);
    if (lockState?.locked) return;

    const updated = [...scores];
    if (!updated[holeIndex]) {
      updated[holeIndex] = {
        gross: null,
        net: null,
        netScore: null,
        fir: null,
        gir: null,
        putts: null,
      };
    }

    let numericValue =
      value === "" || value === null || Number.isNaN(Number(value))
        ? null
        : Math.round(Number(value));
    // Clamp typed values to a sane gross-score range (1 = hole-in-one).
    if (numericValue != null) {
      numericValue = Math.min(20, Math.max(1, numericValue));
    }
    updated[holeIndex].gross = numericValue;

    if (
      !isWolfFormat &&
      selectedCourse &&
      activeScoringPlayer?.handicap != null &&
      numericValue != null
    ) {
      const hole = selectedCourse.holes[holeIndex];
      const strokeAdjustment = strokesReceivedForHole(
        activeScoringPlayer.handicap ?? 0,
        hole.strokeIndex
      );

      const netScore = Math.max(0, numericValue - strokeAdjustment);
      const points = Math.max(0, hole.par + 2 - netScore);

      updated[holeIndex].netScore = netScore;
      updated[holeIndex].net = points;
    } else {
      updated[holeIndex].netScore = null;
      updated[holeIndex].net = null;
    }

    const totalPoints = updated.reduce((sum, s) => sum + (s.net ?? 0), 0);
    isDirtyRef.current = true;
    setPoints(totalPoints);
    setScores(updated);
  };

  // --- Handle stats changes ---
  const handleStatsChange = (holeIndex, statType, value) => {
    const lockState = getHoleLockState(holeIndex);
    if (lockState?.locked) return;

    const updated = [...scores];
    if (!updated[holeIndex]) return;
    isDirtyRef.current = true;
    if (statType === "fir" || statType === "gir") {
      updated[holeIndex][statType] = Boolean(value);
    } else if (statType === "putts") {
      if (value === "" || value === null || Number.isNaN(Number(value))) {
        updated[holeIndex].putts = null;
      } else {
        updated[holeIndex].putts = Math.min(20, Math.max(0, Math.round(Number(value))));
      }
    }
    setScores(updated);
  };

  const handleTrackStatsToggle = async (value) => {
    if (scoringForFriend) return;
    if (value === trackStats) return;

    if (value) {
      if (trackStatsLocked) return;
      const confirmed = await showChoice(
        "Once you enable Track My Stats for this game you won't be able to disable it for the rest of the round. Enable and lock it now?",
        "Lock Track My Stats?",
        "Enable & Lock",
        "Cancel"
      );
      if (!confirmed) {
        return;
      }
    } else if (trackStatsLocked) {
      return;
    }

    const nextLocked = trackStatsLocked || value;
    const previousState = { trackStats, trackStatsLocked };

    setTrackStats(value);
    setTrackStatsLocked(nextLocked);

    if (!gameId || !userId) return;

    try {
      const gameRef = doc(db, "games", gameId);
      // Transaction so toggling stats only rewrites this user's slot and can't
      // overwrite another player's concurrently-saved scores.
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists()) throw new Error("Game not found");
        const gameData = snap.data();
        const updatedPlayers = (gameData.players || []).map((p) =>
          p.userId === userId
            ? { ...p, trackStats: value, trackStatsLocked: nextLocked }
            : p
        );
        tx.update(gameRef, {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      console.error("Failed to update track stats preference:", error);
      setTrackStats(previousState.trackStats);
      setTrackStatsLocked(previousState.trackStatsLocked);
      showError("Failed to update track stats preference", "Error");
    }
  };

  // --- Leave current game ---
  const leaveGame = async () => {
    if (!gameId || !userId) return;
    
    try {
      const gameRef = doc(db, "games", gameId);
      // Transaction so a leave can't race with another player's score save.
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists()) return;
        const gameData = snap.data();
        const updatedPlayers = (gameData.players || []).filter(
          (p) => p.userId !== userId
        );
        const cleanedDelegates = removeDelegatesForUser(
          gameData.scoringDelegates || [],
          userId
        );
        tx.update(gameRef, {
          players: updatedPlayers,
          scoringDelegates: cleanedDelegates,
          updatedAt: serverTimestamp(),
          playerIds: arrayRemove(userId),
        });
      });

      {
        // Reset all state
        seededGameIdRef.current = null;
        isDirtyRef.current = false;
        setGameId(null);
        setSelectedCourse(null);
        setGameName("");
        setMatchFormat("");
        setHoleCount("");
        setNineType("");
        setStartingHole(1);
        setScores([]);
        setPoints(0);
        setTrackStats(false);
        setTrackStatsLocked(false);
        setIsFunGame(false);
        setHasAutoScrolled(false);
        setScoringDelegates([]);
        setActiveScoringTargetUserId(null);
        
        showSuccess("Left game successfully!", "Success");
      }
    } catch (error) {
      console.error("Error leaving game:", error);
      showError("Failed to leave game", "Error");
    }
  };

  // --- Save scores ---
  // Uses a transaction so only THIS user's score slot is updated (never
  // overwriting another player's concurrent save). An in-flight guard serializes
  // overlapping saves so a slow write can't land after a newer one.
  const saveScores = async (auto = false) => {
    if (!gameId || !userId) return;

    const targetUserId = effectiveScoringUserId;
    if (!canScoreForPlayer(scoringDelegates, userId, targetUserId)) {
      if (!auto) {
        showError("You do not have permission to save these scores.", "Error");
      }
      return;
    }

    if (saveInFlightRef.current) {
      // Queue the latest save; keep a manual save sticky over an auto one.
      pendingSaveRef.current = pendingSaveRef.current === false ? false : auto;
      return;
    }
    saveInFlightRef.current = true;

    const scoresSnapshot = scores;
    try {
      const gameRef = doc(db, "games", gameId);

      let gameIsComplete = false;
      let completedContext = null;

      await runTransaction(db, async (tx) => {
        const snap = await tx.get(gameRef);
        if (!snap.exists()) return;
        const gameData = snap.data();
        const updatedPlayers = (gameData.players || []).map((p) =>
          p.userId === targetUserId ? { ...p, scores: scoresSnapshot } : p
        );

        gameIsComplete = isGameComplete({
          ...gameData,
          players: updatedPlayers,
        });

        tx.update(gameRef, {
          players: updatedPlayers,
          status: gameIsComplete ? "complete" : "inProgress",
          updatedAt: serverTimestamp(),
        });

        if (
          gameIsComplete &&
          !gameData.finalizedTeams &&
          gameData?.tournamentId
        ) {
          completedContext = {
            tournamentId: gameData.tournamentId,
            playerIds: updatedPlayers.map((p) => p.userId),
            hasFinalizedAt: Boolean(gameData.finalizedAt),
          };
        }
      });

      // Snapshot finalized teams AFTER the transaction (it reads another
      // collection, which isn't allowed inside a Firestore transaction).
      if (completedContext) {
        try {
          const tournamentTeams = await fetchTeamsForTournament(
            completedContext.tournamentId
          );
          const playerIdsInGame = new Set(completedContext.playerIds);
          const finalizedTeams = tournamentTeams
            .map((team) => ({ ...team, players: normalizeTeamPlayers(team) }))
            .filter((team) =>
              (team.players || []).some((player) =>
                playerIdsInGame.has(player.uid || player.userId || player.id)
              )
            );
          const finalizePayload = { finalizedTeams };
          if (!completedContext.hasFinalizedAt) {
            finalizePayload.finalizedAt = serverTimestamp();
          }
          await updateDoc(gameRef, finalizePayload);
        } catch (err) {
          console.warn("Failed to snapshot teams for completed game:", err);
        }
      }

      if (!auto) {
        showSuccess(
          scoringForFriend
            ? `Scores saved for ${activeScoringPlayer?.name || "player"}!`
            : "Scores saved successfully!",
          "Success"
        );
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      if (!auto) showError("Failed to save scores", "Error");
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current !== null) {
        const nextAuto = pendingSaveRef.current;
        pendingSaveRef.current = null;
        // Run the queued save with the freshest scores.
        saveScores(nextAuto);
      }
    }
  };

  useEffect(() => {
    if (!gameId || !userId) return;
    // Only auto-save after the user has actually edited (not on initial seed).
    if (!isDirtyRef.current) return;
    const timeout = setTimeout(() => {
      saveScores(true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [scores, gameId, userId]);

  return (
    <div className="min-h-screen p-4 sm:p-6 pb-28">
      <div className="w-full max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="btn btn-ghost mb-6 sm:mb-8 w-full sm:w-auto"
        >
          ← Back to Dashboard
        </button>

        <div className="card p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-strong)] mb-4 sm:mb-6 text-center">
            Enter Scores
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-4 mb-6">
            <button
              onClick={() => navigate("/create-game")}
              className="btn btn-primary w-full sm:w-auto"
            >
              Create New Game
            </button>
            <button
              type="button"
              onClick={() => setShowFormatHelp(true)}
              className="btn btn-secondary w-full sm:w-auto"
            >
              Match Format Guide
            </button>
          </div>

          {isLoadingGames && !gameId && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500/30 border-t-brand-500"></div>
              <p className="mt-2 text-[var(--text-muted)]">Loading games...</p>
            </div>
          )}

          {!isLoadingGames && !currentTournament && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm sm:text-base text-red-700 dark:text-red-300">
              You must select a tournament before entering scores. Visit the dashboard to choose one.
            </div>
          )}
          {gameId && isWolfFormat && (gamePlayers || []).length !== 3 && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl text-sm sm:text-base text-yellow-800 dark:text-yellow-200">
              Wolf format requires exactly 3 players. Waiting for others to join.
            </div>
          )}

          {resumedGame && gameId && (
            <div className="mb-4 p-4 bg-brand-500/15 border border-brand-500/40 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-brand-600 dark:text-brand-300">
                    Resumed your incomplete game! Continue entering your scores below before you can create or join a new game. You may also leave this game at the bottom of the page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoadingGames && currentTournament && !gameId && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[var(--text-strong)] text-center">
                Games In Progress
              </h2>
              <InProgressGamesList
                games={inProgressGames}
                onJoinGame={joinGame}
                isGameIncompleteForUser={isGameIncompleteForUser}
                currentUserId={userId}
              />
            </div>
          )}

          {gameId && selectedCourse && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--text-strong)] mb-3 sm:mb-4 text-center">
                Enter Scores
              </h3>
              {isFunGame && (
                <div className="mb-4 sm:mb-6 p-4 rounded-2xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-100 text-sm sm:text-base">
                  Fun Game enabled: scores from this round will not be included in any player stats.
                </div>
              )}
              <div className="text-center text-brand-600 dark:text-brand-300 mb-4 sm:mb-6">
                Game:{" "}
                <span className="font-semibold">
                  {gameName || "Untitled Game"}
                </span>
                {isFunGame && (
                  <span className="ml-2 text-xs font-semibold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded-full align-middle">
                    Fun Game
                  </span>
                )}
                {selectedCourse?.name && (
                  <>
                    {" "}
                    • Course:{" "}
                    <span className="font-semibold">{selectedCourse.name}</span>
                  </>
                )}
                {matchFormat && (
                  <>
                    {" "}
                    • Format:{" "}
                    <span className="font-semibold">
                      {getMatchFormatLabel(matchFormat)}
                    </span>
                  </>
                )}
                {scoringForFriend && activeScoringPlayer && (
                  <>
                    {" "}
                    • Scoring for:{" "}
                    <span className="font-semibold">{activeScoringPlayer.name}</span>
                  </>
                )}
              </div>
              <div className="flex justify-center mb-4 sm:mb-6">
                <ShareGameButton
                  game={{
                    id: gameId,
                    name: gameName,
                    course: selectedCourse,
                    matchFormat,
                    holeCount,
                    nineType,
                    startingHole,
                    players: gamePlayers,
                    tournamentId: currentTournament,
                    createdBy: userId,
                  }}
                  label="Invite players"
                  variant="secondary"
                  className="justify-center"
                />
              </div>

              <ScoringDelegatePanel
                gamePlayers={gamePlayers}
                currentUserId={userId}
                scoringDelegates={scoringDelegates}
                activeScoringTargetUserId={activeScoringTargetUserId}
                onSwitchTarget={handleSwitchScoringTarget}
                onRequestScoring={handleRequestScoring}
                onRespondToRequest={handleRespondToScoringRequest}
                onRevokeDelegate={handleRevokeScoringDelegate}
                onCancelRequest={handleCancelScoringRequest}
              />

              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
                {scoringForFriend ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Stats tracking follows{" "}
                    <span className="font-semibold text-[var(--text-strong)]">
                      {activeScoringPlayer?.name}
                    </span>
                    &apos;s scorecard settings. Only they can change that
                    preference.
                  </p>
                ) : (
                  <>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={trackStats}
                        onChange={(e) => handleTrackStatsToggle(e.target.checked)}
                        disabled={trackStatsLocked}
                        className="w-5 h-5 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border-blue-400 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <span className="text-[var(--text-strong)] font-semibold">
                        Track my stats this round
                      </span>
                      {trackStatsLocked && (
                        <span className="text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-500/15 px-2 py-0.5 rounded-full">
                          Locked
                        </span>
                      )}
                    </label>
                    <p className="text-sm text-[var(--text-muted)] space-y-1">
                      <span className="block">
                        When enabled, you'll enter FIR, GIR, and putts just for your scorecard.
                      </span>
                      <span className="block text-[var(--text-strong)] font-medium">
                        Once you turn this on for a game it stays on for the round.
                      </span>
                      {isFunGame && (
                        <span className="block text-purple-800 dark:text-purple-200 font-semibold">
                          Fun Game is on: scores won’t be included in stats even if tracking is enabled.
                        </span>
                      )}
                      {trackStatsLocked && (
                        <span className="block text-brand-600 dark:text-brand-300 font-semibold">
                          Tracking locked for this round.
                        </span>
                      )}
                    </p>
                  </>
                )}
              </div>

              <ScorecardGrid
                holes={displayedHoles}
                scores={displayedScores}
                startIndex={startIndex}
                trackStats={trackStats}
                userId={userId}
                isWolfFormat={isWolfFormat}
                wolfOrder={wolfOrder}
                gamePlayers={gamePlayers}
                wolfHoles={wolfHoles}
                wolfDecisions={wolfDecisions}
                getWolfForHole={getWolfForHole}
                getPlayerById={getPlayerById}
                getNonWolfPlayers={getNonWolfPlayers}
                getGrossFor={getGrossFor}
                onScoreChange={handleScoreChange}
                onStatsChange={handleStatsChange}
                onWolfDecisionChange={handleWolfDecisionChange}
                getHoleLockState={getHoleLockState}
                firstUnenteredHoleIndex={firstUnenteredHoleIndex}
              />

              <div className="mt-4 sm:mt-6 text-center font-semibold text-lg sm:text-xl text-brand-600 dark:text-brand-300">
                Current Strokes: {displayedScores.reduce((sum, s) => sum + (s.gross ?? 0), 0)}
              </div>

              <div className="flex flex-col sm:flex-col justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={() => saveScores(false)}
                  className="btn btn-primary btn-block"
                  disabled={!gameId}
                >
                  Finished Game
                </button>
                <button
                  type="button"
                  onClick={leaveGame}
                  className="btn btn-danger btn-block"
                >
                  Leave Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal {...modal} onClose={hideModal} />

      {/* Format Help Modal */}
      {showFormatHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card card-elevated max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[var(--text-strong)]">
                Match Format Guide
              </h2>
              <button
                onClick={() => setShowFormatHelp(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-strong)] text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Stableford */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  Stableford Points
                </h3>
                <p className="text-[var(--text-muted)]">
                  Players compete based on points earned per hole using their With handicaps score (with handicaps score minus handicap strokes). Points are awarded as follows:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-[var(--text-muted)]">
                  <li>With Handicaps Albatross or better: 5 points</li>
                  <li>With Handicaps Eagle (-2): 4 points</li>
                  <li>With Handicaps Birdie (-1): 3 points</li>
                  <li>With Handicaps Par: 2 points</li>
                  <li>With Handicaps Bogey (+1): 1 point</li>
                  <li>With Handicaps Double Bogey or worse: 0 points</li>
                </ul>
              </div>

              {/* Match Play */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  1v1 Match Play
                </h3>
                <p className="text-[var(--text-muted)] mb-2">
                  Two players compete hole-by-hole. Each hole is won by the player with the lower With handicaps score (with handicaps minus handicap strokes). The match is won by the player who wins more holes. Uses handicaps to level the playing field.
                </p>
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-[var(--text-muted)]">
                    <span className="font-semibold">No Handicaps Version:</span> Also available as "1v1 Match Play (No Handicaps)" which uses with handicaps scores instead of With handicaps scores.
                  </p>
                </div>
              </div>

              {/* 2v2 Match Play */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  2v2 Match Play
                </h3>
                <p className="text-[var(--text-muted)] mb-2">
                  Two teams of two players compete against each other. Each team uses their best ball (best With handicaps score) on each hole. The team with the better ball wins the hole. Teams compete head-to-head to win the most holes.
                </p>
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-[var(--text-muted)]">
                    <span className="font-semibold">No Handicaps Version:</span> Also available as "2v2 Match Play (No handicaps)" which uses with handicaps scores instead of With handicaps scores.
                  </p>
                </div>
              </div>

              {/* American Scoring */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  American Scoring
                </h3>
                <p className="text-[var(--text-muted)] mb-3">
                  For 3 or 4 players competing against each other using <span className="font-semibold">with handicaps scores</span> (no handicaps). Points are awarded based on finishing position on each hole. Lower with handicaps score wins the hole. All tied players receive equal points.
                </p>
                
                <div className="mt-3 text-[var(--text-muted)]">
                  <p className="font-semibold mb-2 text-brand-600 dark:text-brand-300">3 Players (6 points per hole)</p>
                  <div className="ml-2 space-y-1">
                    <p>• All tie: 2-2-2 (2 points each)</p>
                    <p>• Clear winner, two tie for second: 4-1-1</p>
                    <p>• Clear winner, clear second, clear third: 4-2-0</p>
                    <p>• Two tie for first, one second: 3-3-0 (both tied get 3)</p>
                  </div>
                </div>
                
                <div className="mt-4 text-[var(--text-muted)]">
                  <p className="font-semibold mb-2 text-brand-600 dark:text-brand-300">4 Players (20 points per hole)</p>
                  <div className="ml-2 space-y-1">
                    <p>• All tie: 5-5-5-5 (5 points each)</p>
                    <p>• Clear 1st, 2nd, 3rd, 4th (all different): 8-6-4-2</p>
                    <p>• Clear 1st, two tie for 2nd, clear 4th: 8-6-6-0 (both tied get 6)</p>
                    <p>• Two tie for 1st, clear 3rd, clear 4th: 7-7-4-2 (both tied get 7)</p>
                    <p>• Two tie for 1st, two tie for last: 7-7-3-3 (both tied pairs get equal points)</p>
                    <p>• Three tie for 1st, clear 4th: 6-6-6-2 (all three tied get 6)</p>
                    <p>• Solo 1st, three tie for last: 8-4-4-4 (all three tied get 4)</p>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-sm text-[var(--text-muted)]">
                    <span className="font-semibold">Important:</span> This format uses <span className="font-semibold">with handicaps scores</span> (actual strokes, no handicap adjustments). All tied players receive equal points. The scoring system automatically handles all tie scenarios to ensure fair point distribution.
                  </p>
                </div>
              </div>

              {/* Wolf */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  Wolf (3 Players)
                </h3>
                <p className="text-[var(--text-muted)] mb-2">
                  Exactly 3 players. A rotating <span className="font-semibold">Wolf</span> is assigned each hole in a fixed order (randomized at game start). The Wolf must decide to <span className="font-semibold">team up</span> with one player or go <span className="font-semibold">Lone Wolf</span> <span className="italic">(decision must be made before the wolf tees off)</span>. Uses <span className="font-semibold">gross scores</span> (no handicaps).
                </p>
                <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
                  <li>
                    <span className="font-semibold">Partnered (2v1)</span>: Wolf + partner play best ball (lowest of the two gross scores) against the solo player’s gross score.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Team best &lt; Solo: Wolf + partner each <span className="font-semibold">+1</span></li>
                      <li>Solo &lt; Team best: Solo <span className="font-semibold">+3</span></li>
                      <li>Tie: Solo <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Lone Wolf (1v2)</span>: Wolf's gross vs opponents' best ball.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf &lt; Opponents' best: Wolf <span className="font-semibold">+3</span></li>
                      <li>Opponents' best &lt; Wolf: Each opponent <span className="font-semibold">+1</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Blind Lone Wolf (1v2)</span>: High-risk, high-reward option. Wolf must choose <span className="font-semibold">before any player tees off</span>.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf &lt; Opponents' best: Wolf <span className="font-semibold">+6</span></li>
                      <li>Opponents' best &lt; Wolf: Each opponent <span className="font-semibold">+2</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+2</span></li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Wolf (With Handicaps) */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  Wolf (3 Players, With Handicaps)
                </h3>
                <p className="text-[var(--text-muted)] mb-2">
                  Same as Wolf (3 Players) but uses <span className="font-semibold">net scores</span> (with handicaps). All scoring rules are identical, but comparisons are made using net scores instead of gross scores. Perfect for groups with varying skill levels.
                </p>
                <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
                  <li>
                    <span className="font-semibold">Partnered (2v1)</span>: Wolf + partner best ball (lowest net) vs solo player's net.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Team best &lt; Solo: Wolf + partner each <span className="font-semibold">+1</span></li>
                      <li>Solo &lt; Team best: Solo <span className="font-semibold">+3</span></li>
                      <li>Tie: Solo <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Lone Wolf (1v2)</span>: Wolf's net vs opponents' best ball (net).
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf &lt; Opponents' best: Wolf <span className="font-semibold">+3</span></li>
                      <li>Opponents' best &lt; Wolf: Each opponent <span className="font-semibold">+1</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Blind Lone Wolf (1v2)</span>: High-risk, high-reward option. Wolf must choose <span className="font-semibold">before any player tees off</span>.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf &lt; Opponents' best: Wolf <span className="font-semibold">+6</span></li>
                      <li>Opponents' best &lt; Wolf: Each opponent <span className="font-semibold">+2</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+2</span></li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Stroke Play */}
              <div className="border-b border-[var(--surface-card-border)] pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  Stroke Play
                </h3>
                <p className="text-[var(--text-muted)]">
                Two players compete in a 1v1 format to get the lowest gross score (no handicaps). Simple stroke scoring where the player with the lowest total strokes wins.
                </p>
              </div>

              {/* Scorecard */}
              <div className="pb-4">
                <h3 className="text-xl font-semibold text-[var(--text-strong)] mb-2">
                  Scorecard
                </h3>
                <p className="text-[var(--text-muted)]">
                  Just track your scores without any competition or point system. Perfect for solo rounds or when you just want to record your round without comparing to others.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowFormatHelp(false)}
                className="btn btn-primary"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
