import React, { useCallback, useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";
import { Modal, useModal } from "../components/Modal";
import { useTournament } from "../context/TournamentContext";
import {
  getMatchFormatLabel,
  normalizeMatchFormat,
} from "../lib/matchFormats";

export default function EnterScore({ userId, user }) {
  const navigate = useNavigate();
  const { modal, showModal, hideModal, showSuccess, showError } = useModal();
  const { currentTournament } = useTournament();
  const [matchFormat, setMatchFormat] = useState(""); // start with placeholder
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState(null);
  const [gamePlayers, setGamePlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [inProgressGames, setInProgressGames] = useState([]);
  const [points, setPoints] = useState(0);
  const [holeCount, setHoleCount] = useState(""); // start empty for "Select Number of Holes"
  const [nineType, setNineType] = useState(""); // start empty for "Select 9 Holes"
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [resumedGame, setResumedGame] = useState(false);
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [trackStats, setTrackStats] = useState(false);
  const [wolfOrder, setWolfOrder] = useState(null); // array of userIds length 3
  const [wolfDecisions, setWolfDecisions] = useState([]); // per-hole: 'lone' | partnerUserId | null
  const [wolfHoles, setWolfHoles] = useState(null); // per-hole: { wolfId, decision } | null

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
  useEffect(() => {
    const fetchGames = async () => {
      setIsLoadingGames(true);
      if (!currentTournament) {
        setIsLoadingGames(false);
        return;
      }
      
      const q = query(
        collection(db, "games"),
        where("status", "==", "inProgress"),
        where("tournamentId", "==", currentTournament)
      );
      const snapshot = await getDocs(q);
      const games = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const sortedGames = [...games].sort((a, b) => {
        const aIncomplete = isGameIncompleteForUser(a);
        const bIncomplete = isGameIncompleteForUser(b);

        if (aIncomplete !== bIncomplete) {
          return aIncomplete ? -1 : 1;
        }

        const aUpdated = a.updatedAt?.seconds || 0;
        const bUpdated = b.updatedAt?.seconds || 0;
        return bUpdated - aUpdated;
      });

      setInProgressGames(sortedGames);
      
      // Check if user has any incomplete games
      const userIncompleteGame = sortedGames.find(isGameIncompleteForUser);
      
      // If user has incomplete game, automatically load it
      if (userIncompleteGame && !gameId) {
        setResumedGame(true);
        await joinGame(userIncompleteGame);
      }
      setIsLoadingGames(false);
    };
    fetchGames();
  }, [gameId, userId, currentTournament, isGameIncompleteForUser]);

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
          setTrackStats(gameData.trackStats || false);
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
  }, [gameId, userId]);

  // --- Join existing game ---
  const joinGame = async (game) => {
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
        setTrackStats(gameData.trackStats || false);
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
        } else {
          const updatedPlayers = [
            ...gameData.players,
            {
              userId,
              name: user?.displayName || "Unknown Player",
              handicap: user?.handicap || 0,
              scores: initialScores,
            },
          ];

          // When a new player joins, ensure game is inProgress (new player has no scores yet)
          await updateDoc(gameRef, {
            players: updatedPlayers,
            status: "inProgress",
            updatedAt: serverTimestamp(),
          });
          setGameId(game.id);
          setSelectedCourse(game.course);
          setGameName(game.name || "");
          setScores(initialScores);
          setPoints(0);
          setMatchFormat(normalizeMatchFormat(gameData.matchFormat || ""));
          setTrackStats(gameData.trackStats || false);
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
  };

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

  // Ensure wolfDecisions array is full length and contains only allowed values (no undefined)
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
          // Blind Lone Wolf: 6 points if win, 1 point if tie, each opponent gets 2 if lose
          const teamBest = Math.min(aScore, bScore);
          if (wolfScore < teamBest) {
            if (uid === wolfId) total += 6;
          } else if (wolfScore > teamBest) {
            // each opponent gets 2 points (higher penalty for Blind Lone Wolf loss)
            if (uid === pA.userId || uid === pB.userId) total += 2;
          } else {
            // Tie: Wolf gets 1 point (same as regular Lone Wolf)
            if (uid === wolfId) total += 1;
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
  const handleChange = (holeIndex, value) => {
    const updated = [...scores];
    const gross = value === "" ? null : Number(value);
    updated[holeIndex].gross = gross;

    if (!isWolfFormat && selectedCourse && user?.handicap != null && gross != null) {
      const handicap = user.handicap;
      const baseStroke = Math.floor(handicap / 18);
      const extraStrokes = handicap % 18;

      const hole = selectedCourse.holes[holeIndex];
      const holeStroke =
        baseStroke + (hole.strokeIndex <= extraStrokes ? 1 : 0);

      const netScore = Math.max(0, gross - holeStroke);
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

  const handleInputChange = (e, idx) => handleChange(idx, e.target.value);

  // --- Handle stats changes ---
  const handleStatsChange = (holeIndex, statType, value) => {
    const updated = [...scores];
    if (statType === 'fir' || statType === 'gir') {
      updated[holeIndex][statType] = value;
    } else if (statType === 'putts') {
      updated[holeIndex].putts = value === "" ? null : Number(value);
    }
    setScores(updated);
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
        setResumedGame(false);
        
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

      await updateDoc(gameRef, {
        players: updatedPlayers,
        status: gameIsComplete ? "complete" : "inProgress",
        updatedAt: serverTimestamp(),
      });

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
  const holeInputs = displayedScores.map((s) => s.gross ?? "");

  return (
    <div className="min-h-screen bg-gray-900 p-4 sm:p-6">
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
              {inProgressGames.length === 0 ? (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-gray-700 dark:text-gray-300">
                  No games are currently in progress. Create a new game to get started.
                </div>
              ) : (
                <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2">
                  {inProgressGames.map((game) => {
                    const incompleteForUser = isGameIncompleteForUser(game);
                    return (
                      <div
                        key={game.id}
                        className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex flex-col text-center sm:text-left">
                          <span className="text-gray-900 dark:text-white font-medium">
                            {game.name || "Untitled Game"}
                          </span>
                          {game.course?.name && (
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              Course: {game.course.name}
                            </span>
                          )}
                          {game.matchFormat && (
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              Format: {getMatchFormatLabel(game.matchFormat)}
                            </span>
                          )}
                          {incompleteForUser && (
                            <span className="mt-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                              Incomplete for you
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => joinGame(game)}
                          className="w-full sm:w-auto px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                        >
                          {incompleteForUser ? "Resume" : "Join"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {gameId && selectedCourse && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center">
                Enter Scores
              </h3>
              <div className="text-center text-green-600 mb-4 sm:mb-6">
                Game:{" "}
                <span className="font-semibold">
                  {gameName || "Untitled Game"}
                </span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {holeInputs.map((v, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 p-3 sm:p-4 w-full ${trackStats ? 'min-h-[280px]' : 'min-h-[160px]'}`}
                  >
                    <div className="text-center mb-2 sm:mb-3">
                      <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                        Hole {startIndex + idx + 1}
                      </div>

                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Par {displayedHoles[idx].par} • S.I.{" "}
                        {displayedHoles[idx].strokeIndex}
                      </div>
                      {isWolfFormat && wolfOrder && wolfOrder.length === 3 && (
                        <div className="mt-1 text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">
                          Wolf: {getPlayerById(getWolfForHole(startIndex + idx))?.name || "-"}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = parseInt(v) || 0;
                          if (currentValue > 1)
                            handleInputChange(
                              {
                                target: {
                                  value: (currentValue - 1).toString(),
                                },
                              },
                              idx + startIndex
                            );
                        }}
                        className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-xl sm:text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        −
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={v}
                        onChange={(e) => handleInputChange(e, idx + startIndex)}
                        className="w-20 h-10 sm:w-16 sm:h-8 text-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-bold text-lg sm:text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="-"
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = parseInt(v) || 0;
                          if (currentValue < 15)
                            handleInputChange(
                              {
                                target: {
                                  value: (currentValue + 1).toString(),
                                },
                              },
                              idx + startIndex
                            );
                        }}
                        className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-xl sm:text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {!isWolfFormat && (
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center leading-tight">
                        <div>With Handicap: {displayedScores[idx].netScore ?? "-"}</div>
                        <div>Points: {displayedScores[idx].net ?? "-"}</div>
                      </div>
                    )}

                    {/* Wolf decision controls */}
                    {isWolfFormat && wolfOrder && wolfOrder.length === 3 && (gamePlayers || []).length === 3 && (
                      <div className="mt-2 w-full">
                        {getWolfForHole(startIndex + idx) === userId ? (
                          <div className="space-y-2">
                            {(() => {
                              const others = getNonWolfPlayers(userId);
                              const absIndex = startIndex + idx;
                              // Check wolfHoles first (preferred), then fallback to wolfDecisions
                              const holeInfo = wolfHoles?.[absIndex];
                              const current = holeInfo && "decision" in holeInfo
                                ? holeInfo.decision
                                : wolfDecisions?.[absIndex] ?? null;
                              // Check if all 3 players have scores for this hole
                              const wolfPlayer = getPlayerById(userId);
                              const wolfGross = wolfPlayer?.scores?.[absIndex]?.gross ?? null;
                              const aGross = getGrossFor(others[0], absIndex);
                              const bGross = getGrossFor(others[1], absIndex);
                              const allScoresEntered = wolfGross != null && aGross != null && bGross != null;
                              const isLocked = allScoresEntered;
                              // Blind Lone Wolf can only be chosen when NO scores are entered (truly blind)
                              const anyScoreEntered = wolfGross != null || aGross != null || bGross != null;
                              const canChooseBlind = !anyScoreEntered;
                              return (
                                <>
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 text-center">
                                    Choose before you tee off
                                  </div>
                                  <label className={`flex items-center gap-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                      type="radio"
                                      name={`wolf-${absIndex}`}
                                      checked={current === (others[0]?.userId || "")}
                                      onChange={() => !isLocked && handleWolfDecisionChange(absIndex, others[0]?.userId || null)}
                                      disabled={isLocked}
                                      className="w-4 h-4 text-purple-600"
                                      title={isLocked ? "Decision locked - all scores entered" : "Team with " + (others[0]?.name || "Player A")}
                                    />
                                    <span className="text-gray-700 dark:text-gray-200">
                                      Team with {others[0]?.name || "Player A"} (2v1)
                                    </span>
                                  </label>
                                  <label className={`flex items-center gap-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                      type="radio"
                                      name={`wolf-${absIndex}`}
                                      checked={current === (others[1]?.userId || "")}
                                      onChange={() => !isLocked && handleWolfDecisionChange(absIndex, others[1]?.userId || null)}
                                      disabled={isLocked}
                                      className="w-4 h-4 text-purple-600"
                                      title={isLocked ? "Decision locked - all scores entered" : "Team with " + (others[1]?.name || "Player B")}
                                    />
                                    <span className="text-gray-700 dark:text-gray-200">
                                      Team with {others[1]?.name || "Player B"} (2v1)
                                    </span>
                                  </label>
                                  <label className={`flex items-center gap-2 text-sm ${isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                      type="radio"
                                      name={`wolf-${absIndex}`}
                                      checked={current === "lone"}
                                      onChange={() => !isLocked && handleWolfDecisionChange(absIndex, "lone")}
                                      disabled={isLocked}
                                      className="w-4 h-4 text-purple-600"
                                      title={isLocked ? "Decision locked - all scores entered" : "Lone Wolf"}
                                    />
                                    <span className="text-gray-700 dark:text-gray-200">Lone Wolf (1v2)</span>
                                  </label>
                                  <label className={`flex items-center gap-2 text-sm ${!canChooseBlind || isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input
                                      type="radio"
                                      name={`wolf-${absIndex}`}
                                      checked={current === "blind"}
                                      onChange={() => canChooseBlind && !isLocked && handleWolfDecisionChange(absIndex, "blind")}
                                      disabled={!canChooseBlind || isLocked}
                                      className="w-4 h-4 text-purple-600"
                                      title={!canChooseBlind ? "Blind Lone Wolf must be chosen before any scores are entered" : isLocked ? "Decision locked - all scores entered" : "Blind Lone Wolf (higher risk, higher reward)"}
                                    />
                                    <span className="text-gray-700 dark:text-gray-200 font-bold">
                                      Blind Lone Wolf (1v2) +6pts
                                    </span>
                                  </label>
                                  {isLocked && current && (
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1">
                                      Decision locked
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          (() => {
                            const absIndex = startIndex + idx;
                            // Check wolfHoles first (preferred), then fallback to wolfDecisions
                            const holeInfo = wolfHoles?.[absIndex];
                            const choice = holeInfo && "decision" in holeInfo
                              ? holeInfo.decision
                              : wolfDecisions?.[absIndex] ?? null;
                            const wolfId = holeInfo?.wolfId ?? getWolfForHole(absIndex);
                            const wolfName = getPlayerById(wolfId)?.name || "-";
                            let choiceText = "No choice yet";
                            if (choice === "blind") {
                              choiceText = "Blind Lone Wolf (+6pts)";
                            } else if (choice === "lone") {
                              choiceText = "Lone Wolf";
                            } else if (typeof choice === "string" && choice) {
                              const partnerName = getPlayerById(choice)?.name || "Partner";
                              choiceText = `Partner: ${partnerName}`;
                            }
                            return (
                              <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 text-center">
                                {wolfName} choice: {choiceText}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {trackStats && (
                      <div className="mt-3 space-y-3 w-full">
                        {displayedHoles[idx].par !== 3 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">FIR:</span>
                            <input
                              type="checkbox"
                              checked={displayedScores[idx].fir === true}
                              onChange={(e) => handleStatsChange(idx + startIndex, 'fir', e.target.checked)}
                              className="w-7 h-7 text-green-600 dark:text-green-500 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">GIR:</span>
                          <input
                            type="checkbox"
                            checked={displayedScores[idx].gir === true}
                            onChange={(e) => handleStatsChange(idx + startIndex, 'gir', e.target.checked)}
                            className="w-7 h-7 text-green-600 dark:text-green-500 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                          />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Putts:</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const currentPutts = displayedScores[idx].putts || 0;
                                if (currentPutts > 0) {
                                  handleStatsChange(idx + startIndex, 'putts', (currentPutts - 1).toString());
                                }
                              }}
                              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                            >
                              −
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={displayedScores[idx].putts ?? ""}
                              onChange={(e) => handleStatsChange(idx + startIndex, 'putts', e.target.value)}
                              className="w-16 h-10 text-center border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentPutts = displayedScores[idx].putts || 0;
                                if (currentPutts < 10) {
                                  handleStatsChange(idx + startIndex, 'putts', (currentPutts + 1).toString());
                                }
                              }}
                              className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

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
                  onClick={() => navigate("/dashboard")}
                  className="w-full sm:w-auto px-6 py-3 bg-gray-400 text-white rounded-xl shadow-md hover:bg-gray-500 transition"
                >
                  Back to Dashboard
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
