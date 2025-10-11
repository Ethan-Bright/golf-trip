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

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState(null);
  const [scores, setScores] = useState([]);
  const [inProgressGames, setInProgressGames] = useState([]);
  const [points, setPoints] = useState(0);

  // --- Fetch games in progress ---
  useEffect(() => {
    const fetchGames = async () => {
      const q = query(
        collection(db, "games"),
        where("status", "==", "inProgress")
      );
      const snapshot = await getDocs(q);
      setInProgressGames(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchGames();
  }, [gameId]);

  // --- Fetch scores for current game ---
  useEffect(() => {
    const fetchScores = async () => {
      if (!gameId) return;
      const gameRef = doc(db, "games", gameId);
      const gameSnap = await getDoc(gameRef);
      if (gameSnap.exists()) {
        const gameData = gameSnap.data();
        const player = gameData.players.find((p) => p.userId === userId);
        if (player) setScores(player.scores);
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
    if (!selectedCourse || !gameName.trim()) {
      showError("Please select a course and enter a game name", "Missing Information");
      return;
    }

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
      showError("Failed to create game", "Error");
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

        if (existingPlayer) {
          setGameId(game.id);
          setSelectedCourse(game.course);
          setGameName(game.name || "");
          setScores(existingPlayer.scores || initialScores);
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

  // --- Handle score input changes ---
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

      updated[holeIndex].netScore = netScore; // for display
      updated[holeIndex].net = points; // for Firestore
    } else {
      updated[holeIndex].netScore = null;
      updated[holeIndex].net = null;
    }

    const totalPoints = updated.reduce((sum, s) => sum + (s.net ?? 0), 0);
    setPoints(totalPoints);
    setScores(updated);
  };

  const handleInputChange = (e, idx) => {
    handleChange(idx, e.target.value);
  };

  // --- Save scores to Firestore ---
  const saveScores = async () => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const gameSnap = await getDoc(gameRef);

    if (gameSnap.exists()) {
      const gameData = gameSnap.data();

      const updatedPlayers = gameData.players.map((p) =>
        p.userId === userId ? { ...p, scores } : p
      );

      await updateDoc(gameRef, {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      });

      showSuccess("Scores saved successfully!", "Success");
    }
  };

  // --- Prepare hole inputs for UI ---
  const holeInputs = scores.map((s) => s.gross ?? "");

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Enter Scores
          </h1>

          {!gameId && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Select Course
              </h2>
              <select
                onChange={handleCourseSelect}
                defaultValue=""
                className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
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
                onChange={(e) => setGameName(e.target.value)}
                className="w-full p-4 mb-4 rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
              />

              <button
                onClick={createGame}
                className="w-full px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Create Game
              </button>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-4 text-center">
                Or Join Existing Game
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {inProgressGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <span className="text-gray-900 dark:text-white font-medium">{game.name}</span>
                    <button
                      onClick={() => joinGame(game)}
                      className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameId && selectedCourse && (
            <div className="mt-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                Enter Scores
              </h3>
          <div className="text-center text-green-600 mb-6">
            Game:{" "}
            <span className="font-semibold">{gameName || "Untitled Game"}</span>
            {selectedCourse?.name ? (
              <>
                {" "}
                • Course:{" "}
                <span className="font-semibold">{selectedCourse.name}</span>
              </>
            ) : null}
          </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                {holeInputs.map((v, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 p-4 min-h-[160px]"
                  >
                    <div className="text-center mb-3">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">Hole {idx + 1}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">Par {selectedCourse.holes[idx].par} • S.I. {selectedCourse.holes[idx].strokeIndex}</div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = parseInt(v) || 0;
                          if (currentValue > 1) {
                            handleInputChange({ target: { value: (currentValue - 1).toString() } }, idx);
                          }
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
                        onChange={(e) => handleInputChange(e, idx)}
                        className="w-16 h-8 text-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="-"
                      />
                      
                      <button
                        type="button"
                        onClick={() => {
                          const currentValue = parseInt(v) || 0;
                          if (currentValue < 15) {
                            handleInputChange({ target: { value: (currentValue + 1).toString() } }, idx);
                          }
                        }}
                        className="w-8 h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-xs text-gray-600 dark:text-gray-300 text-center leading-tight">
                      <div>Net: {scores[idx].netScore ?? "-"}</div>
                      <div>Points: {scores[idx].net ?? "-"}</div>
                    </div>
                  </div>
                ))}
              </div>

          <div className="mt-6 text-center font-semibold text-lg text-green-700 dark:text-green-400">
            Total Points: {points}
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={saveScores}
              className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl shadow-md hover:bg-green-800 transition"
            >
              Save Scores
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3 bg-gray-400 text-white rounded-xl shadow-md hover:bg-gray-500 transition"
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
