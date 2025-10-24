import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
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

export default function EnterScore({ userId, user, courses }) {
  const navigate = useNavigate();
  const { modal, showModal, hideModal, showSuccess, showError } = useModal();
  const [matchFormat, setMatchFormat] = useState(""); // start with placeholder
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState(null);
  const [scores, setScores] = useState([]);
  const [inProgressGames, setInProgressGames] = useState([]);
  const [points, setPoints] = useState(0);
  const [holeCount, setHoleCount] = useState(""); // start empty for "Select Number of Holes"
  const [nineType, setNineType] = useState(""); // start empty for "Select 9 Holes"
  const [errors, setErrors] = useState({});
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [resumedGame, setResumedGame] = useState(false);

  // --- Check for incomplete games and fetch games in progress ---
  useEffect(() => {
    const fetchGames = async () => {
      setIsLoadingGames(true);
      const q = query(
        collection(db, "games"),
        where("status", "==", "inProgress")
      );
      const snapshot = await getDocs(q);
      const games = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInProgressGames(games);
      
      // Check if user has any incomplete games
      const userIncompleteGame = games.find(game => {
        const player = game.players.find(p => p.userId === userId);
        if (!player) return false;
        
        // Determine expected hole count
        const expectedHoles = game.holeCount || 18;
        const startIndex = game.nineType === "back" ? 9 : 0;
        const endIndex = expectedHoles === 9 ? startIndex + 9 : game.course.holes.length;
        const relevantScores = player.scores.slice(startIndex, endIndex);
        
        // Check if all relevant holes have scores
        const hasAllScores = relevantScores.every(score => score.gross !== null);
        return !hasAllScores;
      });
      
      // If user has incomplete game, automatically load it
      if (userIncompleteGame && !gameId) {
        setResumedGame(true);
        await joinGame(userIncompleteGame);
      }
      setIsLoadingGames(false);
    };
    fetchGames();
  }, [gameId, userId]);

  // --- Fetch scores for current game ---
  useEffect(() => {
    const fetchScores = async () => {
      if (!gameId) return;
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        const player = gameData.players.find((p) => p.userId === userId);
        if (player) {
          setScores(player.scores);
          // Determine if front/back 9 based on holeCount stored in game or default
          const totalHoles = gameData.holeCount || 18;
          setHoleCount(totalHoles);
          setNineType(
            totalHoles === 9 && gameData.nineType ? gameData.nineType : "front"
          );
          const totalPoints = player.scores.reduce(
            (sum, s) => sum + (s.net ?? 0),
            0
          );
          setPoints(totalPoints);
        }
      }
    };
    fetchScores();
  }, [gameId, userId]);

  // --- Handle course selection ---
  const handleCourseSelect = (e) => {
    const courseId = e.target.value;
    const course = courses.find((c) => c.id === courseId);
    setSelectedCourse(course);

    if (course) {
      const initialScores = course.holes.map(() => ({
        gross: null,
        net: null,
      }));
      setScores(initialScores);
    }
  };

  // --- Create new game ---
  const createGame = async () => {
    let newErrors = {};

    if (!selectedCourse) newErrors.selectedCourse = true;
    if (!gameName.trim()) newErrors.gameName = true;
    if (!matchFormat) newErrors.matchFormat = true;
    if (!holeCount) newErrors.holeCount = true;
    if (holeCount === 9 && !nineType) newErrors.nineType = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return; // stop if there are errors

    // Proceed to create game...
    const initialScores = selectedCourse.holes.map(() => ({
      gross: null,
      net: null,
    }));

    try {
      const gameData = {
        name: gameName,
        courseId: selectedCourse.id,
        course: selectedCourse,
        status: "inProgress",
        matchFormat,
        holeCount,
        nineType,
        players: [
          {
            userId,
            name: user?.displayName || "Unknown Player",
            handicap: user?.handicap || 0,
            scores: initialScores,
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "games"), gameData);
      setGameId(docRef.id);
      setScores(initialScores);
    } catch (error) {
      console.error("Error creating game:", error);
    }
  };

  // --- Join existing game ---
  const joinGame = async (game) => {
    const initialScores = game.course.holes.map(() => ({
      gross: null,
      net: null,
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
        setMatchFormat(gameData.matchFormat || "");

        if (existingPlayer) {
          setGameId(game.id);
          setSelectedCourse(game.course);
          setGameName(game.name || "");
          const playerScores = existingPlayer.scores || initialScores;
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

          await updateDoc(gameRef, {
            players: updatedPlayers,
            updatedAt: serverTimestamp(),
          });
          setGameId(game.id);
          setSelectedCourse(game.course);
          setGameName(game.name || "");
          setScores(initialScores);
        }
      }
    } catch (error) {
      console.error("Error joining game:", error);
      showError("Failed to join game", "Error");
    }
  };

  // --- Handle score changes ---
  const handleChange = (holeIndex, value) => {
    const updated = [...scores];
    const gross = value === "" ? null : Number(value);
    updated[holeIndex].gross = gross;

    if (selectedCourse && user?.handicap != null && gross != null) {
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
        setErrors({});
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

      await updateDoc(gameRef, {
        players: updatedPlayers,
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

          {isLoadingGames && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-300">Loading games...</p>
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

          {!gameId && !isLoadingGames && (
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 text-center">
                Select Course
              </h2>

              <select
                value={selectedCourse?.id || ""}
                onChange={(e) => {
                  handleCourseSelect(e);
                  setErrors((prev) => ({ ...prev, selectedCourse: false })); // remove error on change
                }}
                className={`w-full p-3 sm:p-4 rounded-2xl border ${
                  errors.selectedCourse
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800`}
              >
                <option value="" disabled>
                  Select a course
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="Game Name"
                value={gameName}
                onChange={(e) => {
                  setGameName(e.target.value);
                  setErrors((prev) => ({ ...prev, gameName: false }));
                }}
                className={`w-full p-3 sm:p-4 mb-3 sm:mb-4 rounded-2xl border ${
                  errors.gameName
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800`}
              />

              <div className="mb-4">
                <label className="block text-gray-900 dark:text-white font-medium mb-2">
                  Match Format
                </label>
                <select
                  value={matchFormat || ""}
                  onChange={(e) => {
                    setMatchFormat(e.target.value);
                    setErrors((prev) => ({ ...prev, matchFormat: false }));
                  }}
                  className={`w-full p-3 sm:p-4 rounded-2xl border ${
                    errors.matchFormat
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-600"
                  } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800`}
                >
                  <option value="" disabled>
                    Select Match Format
                  </option>
                  <option value="stableford">Stableford Points</option>
                  <option value="matchplay">Match Play (1v1)</option>
                  <option value="strokeplay">Stroke Play (1v1)</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-900 dark:text-white font-medium mb-2">
                  Number of Holes
                </label>
                <select
                  value={holeCount || ""}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHoleCount(val);
                    if (val === 18) setNineType("front");
                    setErrors((prev) => ({ ...prev, holeCount: false }));
                  }}
                  className={`w-full p-3 sm:p-4 rounded-2xl border ${
                    errors.holeCount
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-600"
                  } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800`}
                >
                  <option value="" disabled>
                    Select Number of Holes
                  </option>
                  <option value={18}>18 Holes</option>
                  <option value={9}>9 Holes</option>
                </select>
              </div>

              {holeCount === 9 && (
                <div className="mb-4">
                  <label className="block text-gray-900 dark:text-white font-medium mb-2">
                    Select 9 Holes
                  </label>
                  <select
                    value={nineType || ""}
                    onChange={(e) => {
                      setNineType(e.target.value);
                      setErrors((prev) => ({ ...prev, nineType: false }));
                    }}
                    className={`w-full p-3 sm:p-4 rounded-2xl border ${
                      errors.nineType
                        ? "border-red-500"
                        : "border-gray-200 dark:border-gray-600"
                    } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800`}
                  >
                    <option value="" disabled>
                      Select 9 Holes
                    </option>
                    <option value="front">Out (Front 9)</option>
                    <option value="back">In (Back 9)</option>
                  </select>
                </div>
              )}

              <button
                onClick={createGame}
                className="w-full px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Create Game
              </button>

              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3 sm:mb-4 text-center">
                Or Join Existing Game
              </h3>
              <div className="max-h-60 sm:max-h-64 overflow-y-auto space-y-2">
                {inProgressGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex flex-col sm:flex-row justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div className="flex flex-col mb-2 sm:mb-0">
                      <span className="text-gray-900 dark:text-white font-medium">
                        {game.name}
                      </span>
                      {game.matchFormat && (
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          Format:{" "}
                          {game.matchFormat === "stableford"
                            ? "Stableford"
                            : game.matchFormat === "matchplay"
                            ? "Match Play"
                            : "Stroke Play"}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => joinGame(game)}
                      className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 w-full sm:w-auto"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
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
                      {matchFormat === "stableford"
                        ? "Stableford"
                        : matchFormat === "matchplay"
                        ? "Match Play"
                        : "Stroke Play"}
                    </span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {holeInputs.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 p-3 sm:p-4 min-h-[160px] w-full"
                  >
                    <div className="text-center mb-2 sm:mb-3">
                      <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                        Hole {startIndex + idx + 1}
                      </div>

                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Par {displayedHoles[idx].par} • S.I.{" "}
                        {displayedHoles[idx].strokeIndex}
                      </div>
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
                        className="w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        −
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={v}
                        onChange={(e) => handleInputChange(e, idx + startIndex)}
                        className="w-16 h-8 text-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                        className="w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center leading-tight">
                      <div>Net: {displayedScores[idx].netScore ?? "-"}</div>
                      <div>Points: {displayedScores[idx].net ?? "-"}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 sm:mt-6 text-center font-semibold text-lg sm:text-xl text-green-700 dark:text-green-400">
                Total Points: {points}
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
    </div>
  );
}
