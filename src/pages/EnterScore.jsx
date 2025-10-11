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

export default function EnterScore({ userId, user, courses }) {
  const navigate = useNavigate();

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
      alert("Please select a course and enter a game name");
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
      alert("Failed to create game");
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
      alert("Failed to join game");
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

      alert("Scores saved!");
    }
  };

  // --- Prepare hole inputs for UI ---
  const holeInputs = scores.map((s) => s.gross ?? "");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-6">
      <h1 className="text-3xl font-bold text-green-700 mb-6 text-center">
        Enter Scores
      </h1>

      {!gameId && (
        <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg border border-green-100 mb-6">
          <h2 className="text-2xl font-semibold text-green-700 mb-4 text-center">
            Select Course
          </h2>
          <select
            onChange={handleCourseSelect}
            defaultValue=""
            className="w-full p-3 rounded-lg border border-green-300 mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
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
            className="w-full p-3 mb-4 rounded-lg border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            onClick={createGame}
            className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Create Game
          </button>

          <h3 className="text-lg font-semibold text-green-700 mt-6 mb-2 text-center">
            Or Join Existing Game
          </h3>
          <div className="max-h-64 overflow-y-auto">
            {inProgressGames.map((game) => (
              <div
                key={game.id}
                className="flex justify-between items-center p-2 border-b border-green-200"
              >
                <span>{game.name}</span>
                <button
                  onClick={() => joinGame(game)}
                  className="px-4 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {gameId && selectedCourse && (
        <div className="bg-green-50 p-6 rounded-2xl shadow-lg border border-green-100">
          <h3 className="text-xl font-bold text-green-700 mb-2 text-center">
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
                className="flex flex-col items-center bg-white rounded-lg shadow-sm p-3 border border-green-100"
              >
                <label className="text-sm font-semibold text-green-700">
                  Hole {idx + 1} (Par {selectedCourse.holes[idx].par}) (S.I.{" "}
                  {selectedCourse.holes[idx].strokeIndex})
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={v}
                  onChange={(e) => handleInputChange(e, idx)}
                  className="mt-1 w-16 text-center border border-green-300 rounded-md py-1 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="-"
                />
                <div className="text-xs text-green-600 mt-1 text-center">
                  Net: {scores[idx].netScore ?? "-"} | Points:{" "}
                  {scores[idx].net ?? "-"}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center font-semibold text-lg text-green-700">
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
  );
}
