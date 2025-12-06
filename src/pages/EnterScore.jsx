import React, { useCallback, useEffect, useState } from "react";
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
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
import { useTournament } from "../context/TournamentContext";
import {
  getMatchFormatLabel,
  normalizeMatchFormat,
} from "../lib/matchFormats";
import {
  fetchTeamsForTournament,
  normalizeTeamPlayers,
} from "../utils/teamService";

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
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [trackStats, setTrackStats] = useState(false);
  const [trackStatsLocked, setTrackStatsLocked] = useState(false);
  const [isFunGame, setIsFunGame] = useState(false);
  const [wolfOrder, setWolfOrder] = useState(null); // array of userIds length 3
  const [wolfDecisions, setWolfDecisions] = useState([]); // per-hole: 'lone' | partnerUserId | null
  const [wolfHoles, setWolfHoles] = useState(null); // per-hole: { wolfId, decision } | null

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

  // --- Check for incomplete games and fetch games in progress ---
  // --- Fetch scores for current game ---
  useEffect(() => {
    const fetchScores = async () => {
      if (!gameId) return;
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        setGamePlayers(gameData.players || []);
        const player = gameData.players.find((p) => p.userId === userId);
        if (player) {
          // Normalize scores to ensure they have stats fields
          const normalizedScores = (player.scores || []).map((score) => ({
            ...score,
            fir: score.fir ?? null,
            gir: score.gir ?? null,
            putts: score.putts ?? null,
          }));
          setScores(normalizedScores);
          // Determine if front/back 9 based on holeCount stored in game or default
          const totalHoles = gameData.holeCount || 18;
          setHoleCount(totalHoles);
          setNineType(
            totalHoles === 9 && gameData.nineType ? gameData.nineType : "front"
          );
          setTrackStats(deriveTrackStatsPreference(player, gameData));
          setTrackStatsLocked(deriveTrackStatsLockState(player, gameData));
          setWolfOrder(gameData.wolfOrder || null);
          setWolfHoles(
            gameData.wolfHoles && Array.isArray(gameData.wolfHoles)
              ? gameData.wolfHoles
              : null
          );
          setWolfDecisions(
            sanitizeWolfDecisions(
              gameData.wolfDecisions && Array.isArray(gameData.wolfDecisions)
                ? gameData.wolfDecisions
                : Array(totalHoles).fill(null),
              totalHoles
            )
          );
          const totalPoints = normalizedScores.reduce(
            (sum, s) => sum + (s.net ?? 0),
            0
          );
          setPoints(totalPoints);
          setIsFunGame(Boolean(gameData.isFunGame));

          // Ensure wolf order exists for wolf format with exactly 3 players
          const normalizedGameFormat = normalizeMatchFormat(gameData.matchFormat || "");
          if (
            (normalizedGameFormat === "wolf" || normalizedGameFormat === "wolf-handicap") &&
            (!gameData.wolfOrder || gameData.wolfOrder.length !== 3) &&
            (gameData.players || []).length === 3
          ) {
            const ids = gameData.players.map((p) => p.userId);
            // randomize order once
            const randomized = [...ids].sort(() => Math.random() - 0.5);
            try {
              await updateDoc(gameRef, {
                wolfOrder: randomized,
                updatedAt: serverTimestamp(),
              });
              setWolfOrder(randomized);
            } catch (e) {
              console.error("Failed to set wolfOrder:", e);
            }
          }
        }
      }
    };
    fetchScores();
  }, [gameId, userId, deriveTrackStatsPreference, deriveTrackStatsLockState]);

  // --- Join existing game ---
  const joinGame = useCallback(async (game) => {
    const initialScores = game.course.holes.map(() => ({
      gross: null,
      net: null,
      fir: null,
      gir: null,
      putts: null,
    }));

    try {
      const gameRef = doc(db, "games", game.id);
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        const existingPlayer = gameData.players.find(
          (p) => p.userId === userId
        );

        setHoleCount(gameData.holeCount || 18);
        setNineType(gameData.nineType || "front");
        setMatchFormat(normalizeMatchFormat(gameData.matchFormat || ""));
        setGamePlayers(gameData.players || []);
        setWolfOrder(gameData.wolfOrder || null);
        setWolfHoles(
          gameData.wolfHoles && Array.isArray(gameData.wolfHoles)
            ? gameData.wolfHoles
            : null
        );
        setWolfDecisions(
          sanitizeWolfDecisions(
            gameData.wolfDecisions && Array.isArray(gameData.wolfDecisions)
              ? gameData.wolfDecisions
              : Array((game.course?.holes || []).length || 18).fill(null),
            (game.course?.holes || []).length || 18
          )
        );
        setIsFunGame(Boolean(gameData.isFunGame));

        if (existingPlayer) {
          setGameId(game.id);
          setSelectedCourse(game.course);
          setGameName(game.name || "");
          // Normalize scores to ensure they have stats fields
          const playerScores = (existingPlayer.scores || initialScores).map((score) => ({
            ...score,
            fir: score.fir ?? null,
            gir: score.gir ?? null,
            putts: score.putts ?? null,
          }));
          setScores(playerScores);
          const totalPoints = playerScores.reduce(
            (sum, s) => sum + (s.net ?? 0),
            0
          );
          setPoints(totalPoints);
          setTrackStats(deriveTrackStatsPreference(existingPlayer, gameData));
          setTrackStatsLocked(deriveTrackStatsLockState(existingPlayer, gameData));
        } else {
          const newPlayer = {
            userId,
            name: user?.displayName || "Unknown Player",
            handicap: user?.handicap || 0,
            scores: initialScores,
            trackStats: false,
            trackStatsLocked: false,
          };
          const updatedPlayers = [
            ...gameData.players,
            newPlayer,
          ];

          // When a new player joins, ensure game is inProgress (new player has no scores yet)
          await updateDoc(gameRef, {
            players: updatedPlayers,
            status: "inProgress",
            updatedAt: serverTimestamp(),
            playerIds: arrayUnion(userId),
          });
          setGameId(game.id);
          setSelectedCourse(game.course);
          setGameName(game.name || "");
          setScores(initialScores);
          setPoints(0);
          setMatchFormat(normalizeMatchFormat(gameData.matchFormat || ""));
          setGamePlayers(updatedPlayers);
          setTrackStats(false);
          setTrackStatsLocked(false);
        }

        // If wolf format and exactly 3 players but no wolfOrder, set it
        const normalizedGameFormat = normalizeMatchFormat(gameData.matchFormat || "");
        if (
          (normalizedGameFormat === "wolf" || normalizedGameFormat === "wolf-handicap") &&
          (!gameData.wolfOrder || gameData.wolfOrder.length !== 3) &&
          (gameData.players || []).length === 3
        ) {
          const ids = (gameData.players || []).map((p) => p.userId);
          const randomized = [...ids].sort(() => Math.random() - 0.5);
          try {
            await updateDoc(gameRef, {
              wolfOrder: randomized,
              updatedAt: serverTimestamp(),
            });
            setWolfOrder(randomized);
          } catch (e) {
            console.error("Failed to set wolfOrder on join:", e);
          }
        }
      }
    } catch (error) {
      console.error("Error joining game:", error);
      showError("Failed to join game", "Error");
    }
  }, [
    deriveTrackStatsPreference,
    deriveTrackStatsLockState,
    sanitizeWolfDecisions,
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

  // --- Wolf helpers ---
  const normalizedFormat = normalizeMatchFormat(matchFormat);
  const isWolfFormat = normalizedFormat === "wolf" || normalizedFormat === "wolf-handicap";
  const isWolfHandicapFormat = normalizedFormat === "wolf-handicap";
  const totalHolesInGame = holeCount || selectedCourse?.holes?.length || 18;
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
    if (!player || !selectedCourse?.holes?.[absHoleIndex] || !player.handicap) return null;
    const gross = getGrossFor(player, absHoleIndex);
    if (gross == null) return null;
    const handicap = player.handicap || 0;
    const baseStroke = Math.floor(handicap / 18);
    const extraStrokes = handicap % 18;
    const hole = selectedCourse.holes[absHoleIndex];
    const holeStroke = baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);
    return Math.max(0, gross - holeStroke);
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
      // Read latest from Firestore and MERGE to avoid truncating other holes
      const snap = await getDoc(gameRef);
      const data = snap.exists() ? snap.data() : {};
      const courseLen =
        (data?.course?.holes && Array.isArray(data.course.holes)
          ? data.course.holes.length
          : selectedCourse?.holes?.length) || 18;
      const finalLen = Math.max(courseLen, lengthHint);

      // Merge wolfDecisions
      const existingDecisions = Array.isArray(data?.wolfDecisions)
        ? [...data.wolfDecisions]
        : [];
      // Ensure dense array with nulls
      const mergedDecisions = Array.from({ length: finalLen }, (_, i) => {
        const val = existingDecisions[i];
        return val === undefined ? null : val;
      });
      mergedDecisions[absHoleIndex] = normalizedDecision;

      // Merge wolfHoles (explicit objects)
      const existingWolfHoles = Array.isArray(data?.wolfHoles)
        ? [...data.wolfHoles]
        : [];
      const mergedWolfHoles = Array.from({ length: finalLen }, (_, i) => {
        const current = existingWolfHoles[i];
        if (i === absHoleIndex) {
          const wid = getWolfForHole(i);
          return wid ? { wolfId: wid, decision: normalizedDecision } : null;
        }
        if (current && typeof current === "object") {
          // Preserve existing entry
          return {
            wolfId: current.wolfId ?? getWolfForHole(i),
            decision:
              current.decision === undefined
                ? (mergedDecisions[i] ?? null)
                : current.decision,
          };
        }
        const wid = getWolfForHole(i);
        return wid ? { wolfId: wid, decision: mergedDecisions[i] ?? null } : null;
      });

      // Update local state and persist
      setWolfDecisions(mergedDecisions);
      setWolfHoles(mergedWolfHoles);
      await updateDoc(gameRef, {
        wolfDecisions: mergedDecisions,
        wolfHoles: mergedWolfHoles,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to save wolf decision:", e);
      showError("Failed to save wolf decision", "Error");
    }
  };

  // Compute Wolf points for current user based on available scores/decisions
  const computeWolfTotalForUser = useCallback(
    (uid) => {
      if (!isWolfFormat || !Array.isArray(gamePlayers) || gamePlayers.length !== 3) return 0;
      let total = 0;
      for (let i = 0; i < totalHolesInGame; i++) {
        // Check wolfHoles first (preferred), then fallback to wolfDecisions
        const holeInfo = wolfHoles?.[i];
        const wolfId = holeInfo?.wolfId ?? getWolfForHole(i);
        if (!wolfId) continue;
        const decision = holeInfo && "decision" in holeInfo
          ? holeInfo.decision
          : wolfDecisions?.[i] ?? null;
        if (!decision) continue;
        const wolfPlayer = getPlayerById(wolfId);
        const others = getNonWolfPlayers(wolfId);
        if (others.length !== 2) continue;
        const [pA, pB] = others;
        const wolfScore = getScoreFor(wolfPlayer, i);
        const aScore = getScoreFor(pA, i);
        const bScore = getScoreFor(pB, i);
        if (
          wolfScore == null ||
          aScore == null ||
          bScore == null
        ) {
          continue; // need all three scores to evaluate
        }

        if (decision === "blind") {
          // Blind Lone Wolf: 6 points if win, 2 points if tie, each opponent gets 2 if lose
          const teamBest = Math.min(aScore, bScore);
          if (wolfScore < teamBest) {
            if (uid === wolfId) total += 6;
          } else if (wolfScore > teamBest) {
            // each opponent gets 2 points (higher penalty for Blind Lone Wolf loss)
            if (uid === pA.userId || uid === pB.userId) total += 2;
          } else {
            // Tie: Wolf gets 2 points
            if (uid === wolfId) total += 2;
          }
        } else if (decision === "lone") {
          const teamBest = Math.min(aScore, bScore);
          if (wolfScore < teamBest) {
            if (uid === wolfId) total += 3;
          } else if (wolfScore > teamBest) {
            // each opponent gets 1
            if (uid === pA.userId || uid === pB.userId) total += 1;
          } else {
            // Tie: Wolf gets 1 point
            if (uid === wolfId) total += 1;
          }
        } else {
          // partner scenario
          const partnerId = decision;
          const partner =
            partnerId === pA.userId ? pA : partnerId === pB.userId ? pB : null;
          const solo = partner && partner.userId === pA.userId ? pB : pA;
          if (!partner || !solo) continue;
          const teamBest = Math.min(wolfScore, getScoreFor(partner, i) ?? Infinity);
          const soloScore = getScoreFor(solo, i);
          if (teamBest < soloScore) {
            if (uid === wolfId || uid === partner.userId) total += 1;
          } else if (teamBest > soloScore) {
            if (uid === solo.userId) total += 1;
          } // ties => 0
        }
      }
      return total;
    },
    [isWolfFormat, gamePlayers, wolfHoles, wolfDecisions, totalHolesInGame, wolfOrder, isWolfHandicapFormat, selectedCourse]
  );

  // --- Handle score changes ---
  const handleScoreChange = (holeIndex, value) => {
    const updated = [...scores];
    const numericValue =
      value === "" || value === null || Number.isNaN(Number(value))
        ? null
        : Number(value);
    updated[holeIndex].gross = numericValue;

    if (
      !isWolfFormat &&
      selectedCourse &&
      user?.handicap != null &&
      numericValue != null
    ) {
      const handicap = user.handicap;
      const baseStroke = Math.floor(handicap / 18);
      const extraStrokes = handicap % 18;

      const hole = selectedCourse.holes[holeIndex];
      const holeStroke =
        baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);

      const netScore = Math.max(0, numericValue - holeStroke);
      const points = Math.max(0, hole.par + 2 - netScore);

      updated[holeIndex].netScore = netScore;
      updated[holeIndex].net = points;
    } else {
      updated[holeIndex].netScore = null;
      updated[holeIndex].net = null;
    }

    const totalPoints = updated.reduce((sum, s) => sum + (s.net ?? 0), 0);
    setPoints(totalPoints);
    setScores(updated);
  };

  // --- Handle stats changes ---
  const handleStatsChange = (holeIndex, statType, value) => {
    const updated = [...scores];
    if (statType === "fir" || statType === "gir") {
      updated[holeIndex][statType] = Boolean(value);
    } else if (statType === "putts") {
      if (value === "" || value === null || Number.isNaN(Number(value))) {
        updated[holeIndex].putts = null;
      } else {
        updated[holeIndex].putts = Number(value);
      }
    }
    setScores(updated);
  };

  const handleTrackStatsToggle = async (value) => {
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
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        throw new Error("Game not found");
      }
      const gameData = gameSnap.data();
      const updatedPlayers = (gameData.players || []).map((p) =>
        p.userId === userId
          ? { ...p, trackStats: value, trackStatsLocked: nextLocked }
          : p
      );
      await updateDoc(gameRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      });
      setGamePlayers(updatedPlayers);
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
      const gameSnap = await getDoc(gameRef);
      
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        const updatedPlayers = gameData.players.filter(p => p.userId !== userId);
        
        await updateDoc(gameRef, {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
          playerIds: arrayRemove(userId),
        });
        
        // Reset all state
        setGameId(null);
        setSelectedCourse(null);
        setGameName("");
        setMatchFormat("");
        setHoleCount("");
        setNineType("");
        setScores([]);
        setPoints(0);
        setTrackStats(false);
        setTrackStatsLocked(false);
        setIsFunGame(false);
        
        showSuccess("Left game successfully!", "Success");
      }
    } catch (error) {
      console.error("Error leaving game:", error);
      showError("Failed to leave game", "Error");
    }
  };

  // --- Auto-save scores ---
  const saveScores = async (auto = false) => {
    if (!gameId || !userId) return;
    try {
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) return;

      const gameData = gameSnap.data();
      const updatedPlayers = gameData.players.map((p) =>
        p.userId === userId ? { ...p, scores } : p
      );

      // Create updated game object to check completion
      const updatedGame = {
        ...gameData,
        players: updatedPlayers,
      };

      // Check if all players have completed all their scores
      const gameIsComplete = isGameComplete(updatedGame);

      let finalizedTeams = gameData.finalizedTeams || null;
      if (
        gameIsComplete &&
        !finalizedTeams &&
        gameData?.tournamentId
      ) {
        try {
          const tournamentTeams = await fetchTeamsForTournament(
            gameData.tournamentId
          );
          const playerIdsInGame = new Set(
            updatedPlayers.map((p) => p.userId)
          );
          finalizedTeams = tournamentTeams
            .map((team) => ({
              ...team,
              players: normalizeTeamPlayers(team),
            }))
            .filter((team) =>
              (team.players || []).some((player) =>
                playerIdsInGame.has(
                  player.uid || player.userId || player.id
                )
              )
            );
        } catch (err) {
          console.warn("Failed to snapshot teams for completed game:", err);
        }
      }

      const updatePayload = {
        players: updatedPlayers,
        status: gameIsComplete ? "complete" : "inProgress",
        updatedAt: serverTimestamp(),
      };

      if (gameIsComplete && finalizedTeams) {
        updatePayload.finalizedTeams = finalizedTeams;
        if (!gameData.finalizedAt) {
          updatePayload.finalizedAt = serverTimestamp();
        }
      }

      await updateDoc(gameRef, updatePayload);

      if (!auto) showSuccess("Scores saved successfully!", "Success");
    } catch (error) {
      console.error("Error saving scores:", error);
      if (!auto) showError("Failed to save scores", "Error");
    }
  };

  useEffect(() => {
    if (!gameId || !userId) return;
    const timeout = setTimeout(() => {
      const hasAnyScore = scores.some((s) => s.gross !== null);
      if (hasAnyScore) saveScores(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [scores, gameId, userId]);

  // --- Slice holes & scores for front/back 9 ---
  const startIndex = nineType === "back" ? 9 : 0;
  const endIndex =
    holeCount === 9 ? startIndex + 9 : selectedCourse?.holes.length || 18;
  const displayedHoles =
    selectedCourse?.holes.slice(startIndex, endIndex) || [];
  const displayedScores = scores.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6 pb-28">
      <div className="w-full max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 sm:mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl w-full sm:w-auto text-center"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-4 sm:p-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6 text-center">
            Enter Scores
          </h1>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3 sm:gap-4 mb-6">
            <button
              onClick={() => navigate("/create-game")}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Create New Game
            </button>
            <button
              type="button"
              onClick={() => setShowFormatHelp(true)}
              className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Match Format Guide
            </button>
          </div>

          {isLoadingGames && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Loading games...</p>
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
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Resumed your incomplete game! Continue entering your scores below before you can create or join a new game. You may also leave this game at the bottom of the page.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoadingGames && currentTournament && !gameId && (
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white text-center">
                Games In Progress
              </h2>
              <InProgressGamesList
                games={inProgressGames}
                onJoinGame={joinGame}
                isGameIncompleteForUser={isGameIncompleteForUser}
              />
            </div>
          )}

          {gameId && selectedCourse && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center">
                Enter Scores
              </h3>
              {isFunGame && (
                <div className="mb-4 sm:mb-6 p-4 rounded-2xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-100 text-sm sm:text-base">
                  Fun Game enabled: scores from this round will not be included in any player stats.
                </div>
              )}
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackStats}
                    onChange={(e) => handleTrackStatsToggle(e.target.checked)}
                    disabled={trackStatsLocked}
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border-blue-400 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-900 dark:text-white font-semibold">
                    Track my stats this round
                  </span>
                  {trackStatsLocked && (
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                      Locked
                    </span>
                  )}
                </label>
                <p className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <span className="block">
                    When enabled, you'll enter FIR, GIR, and putts just for your scorecard.
                  </span>
                  <span className="block text-gray-900 dark:text-white font-medium">
                    Once you turn this on for a game it stays on for the round.
                  </span>
                  {isFunGame && (
                    <span className="block text-purple-800 dark:text-purple-200 font-semibold">
                      Fun Game is on: scores won’t be included in stats even if tracking is enabled.
                    </span>
                  )}
                  {trackStatsLocked && (
                    <span className="block text-green-700 dark:text-green-400 font-semibold">
                      Tracking locked for this round.
                    </span>
                  )}
                </p>
              </div>
              <div className="text-center text-green-600 mb-4 sm:mb-6">
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
              />

              <div className="mt-4 sm:mt-6 text-center font-semibold text-lg sm:text-xl text-green-700 dark:text-green-400">
                Current Strokes: {displayedScores.reduce((sum, s) => sum + (s.gross ?? 0), 0)}
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
                <button
                  type="button"
                  onClick={leaveGame}
                  className="w-full sm:w-auto px-6 py-3 bg-red-500 text-white rounded-xl shadow-md hover:bg-red-600 transition"
                >
                  Leave Game
                </button>
                <button
                  type="button"
                  onClick={() => saveScores(false)}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white rounded-xl shadow-md hover:bg-green-700 transition"
                  disabled={!gameId}
                >
                  Finished Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal {...modal} onClose={hideModal} />

      {/* Format Help Modal */}
      {showFormatHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Match Format Guide
              </h2>
              <button
                onClick={() => setShowFormatHelp(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              {/* Stableford */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Stableford Points
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Players compete based on points earned per hole using their With handicaps score (with handicaps score minus handicap strokes). Points are awarded as follows:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                  <li>With Handicaps Albatross or better: 5 points</li>
                  <li>With Handicaps Eagle (-2): 4 points</li>
                  <li>With Handicaps Birdie (-1): 3 points</li>
                  <li>With Handicaps Par: 2 points</li>
                  <li>With Handicaps Bogey (+1): 1 point</li>
                  <li>With Handicaps Double Bogey or worse: 0 points</li>
                </ul>
              </div>

              {/* Match Play */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  1v1 Match Play
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Two players compete hole-by-hole. Each hole is won by the player with the lower With handicaps score (with handicaps minus handicap strokes). The match is won by the player who wins more holes. Uses handicaps to level the playing field.
                </p>
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">No Handicaps Version:</span> Also available as "1v1 Match Play (No Handicaps)" which uses with handicaps scores instead of With handicaps scores.
                  </p>
                </div>
              </div>

              {/* 2v2 Match Play */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  2v2 Match Play
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Two teams of two players compete against each other. Each team uses their best ball (best With handicaps score) on each hole. The team with the better ball wins the hole. Teams compete head-to-head to win the most holes.
                </p>
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">No Handicaps Version:</span> Also available as "2v2 Match Play (No handicaps)" which uses with handicaps scores instead of With handicaps scores.
                  </p>
                </div>
              </div>

              {/* American Scoring */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  American Scoring
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-3">
                  For 3 or 4 players competing against each other using <span className="font-semibold">with handicaps scores</span> (no handicaps). Points are awarded based on finishing position on each hole. Lower with handicaps score wins the hole. All tied players receive equal points.
                </p>
                
                <div className="mt-3 text-gray-600 dark:text-gray-300">
                  <p className="font-semibold mb-2 text-green-600 dark:text-green-400">3 Players (6 points per hole)</p>
                  <div className="ml-2 space-y-1">
                    <p>• All tie: 2-2-2 (2 points each)</p>
                    <p>• Clear winner, two tie for second: 4-1-1</p>
                    <p>• Clear winner, clear second, clear third: 4-2-0</p>
                    <p>• Two tie for first, one second: 3-3-0 (both tied get 3)</p>
                  </div>
                </div>
                
                <div className="mt-4 text-gray-600 dark:text-gray-300">
                  <p className="font-semibold mb-2 text-green-600 dark:text-green-400">4 Players (20 points per hole)</p>
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
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Important:</span> This format uses <span className="font-semibold">with handicaps scores</span> (actual strokes, no handicap adjustments). All tied players receive equal points. The scoring system automatically handles all tie scenarios to ensure fair point distribution.
                  </p>
                </div>
              </div>

              {/* Wolf */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Wolf (3 Players)
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Exactly 3 players. A rotating <span className="font-semibold">Wolf</span> is assigned each hole in a fixed order (randomized at game start). The Wolf must decide to <span className="font-semibold">team up</span> with one player or go <span className="font-semibold">Lone Wolf</span> <span className="italic">(decision must be made before the wolf tees off)</span>. Uses <span className="font-semibold">gross scores</span> (no handicaps).
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
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
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Wolf (With Handicaps) */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Wolf (3 Players, With Handicaps)
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Same as Wolf (3 Players) but uses <span className="font-semibold">net scores</span> (with handicaps). All scoring rules are identical, but comparisons are made using net scores instead of gross scores. Perfect for groups with varying skill levels.
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
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
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                </ul>
              </div>

              {/* Stroke Play */}
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Stroke Play
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                Two players compete in a 1v1 format to get the lowest gross score (no handicaps). Simple stroke scoring where the player with the lowest total strokes wins.
                </p>
              </div>

              {/* Scorecard */}
              <div className="pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Scorecard
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Just track your scores without any competition or point system. Perfect for solo rounds or when you just want to record your round without comparing to others.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowFormatHelp(false)}
                className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
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
