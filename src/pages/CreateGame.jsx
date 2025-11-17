import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Modal, useModal } from "../components/Modal";
import { useTournament } from "../context/TournamentContext";
import { db } from "../firebase";
import { MATCH_FORMAT_SELECT_OPTIONS } from "../lib/matchFormats";
import SearchableCourseDropdown from "../components/SearchableCourseDropdown";

function useIncompleteGameChecker(userId, currentTournament) {
  const [isChecking, setIsChecking] = useState(true);
  const [incompleteGame, setIncompleteGame] = useState(null);

  useEffect(() => {
    const fetchIncompleteGame = async () => {
      if (!userId || !currentTournament) {
        setIncompleteGame(null);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      try {
        const q = query(
          collection(db, "games"),
          where("status", "==", "inProgress"),
          where("tournamentId", "==", currentTournament)
        );

        const snapshot = await getDocs(q);

        const games = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const findIncompleteGame = (game) => {
          const player = game.players?.find((p) => p.userId === userId);
          if (!player) return false;

          const holeCount = game.holeCount || 18;
          const startIndex = game.nineType === "back" ? 9 : 0;
          const endIndex =
            holeCount === 9
              ? startIndex + 9
              : game.course?.holes?.length || player.scores?.length || 18;

          const relevantScores = (player.scores || []).slice(startIndex, endIndex);

          return !relevantScores.every((score) => score?.gross !== null);
        };

        const userIncompleteGame = games.find(findIncompleteGame) || null;

        setIncompleteGame(userIncompleteGame);
      } catch (error) {
        console.error("Error checking incomplete games:", error);
        setIncompleteGame(null);
      } finally {
        setIsChecking(false);
      }
    };

    fetchIncompleteGame();
  }, [userId, currentTournament]);

  return { incompleteGame, isChecking };
}

export default function CreateGame({ userId, user, courses = [] }) {
  const navigate = useNavigate();
  const { modal, hideModal, showError, showSuccess } = useModal();
  const { currentTournament } = useTournament();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gameName, setGameName] = useState("");
  const [matchFormat, setMatchFormat] = useState("");
  const [holeCount, setHoleCount] = useState("");
  const [nineType, setNineType] = useState("");
  const [trackStats, setTrackStats] = useState(false);
  const [errors, setErrors] = useState({});
  const [showFormatHelp, setShowFormatHelp] = useState(false);
  const [showStatsHelp, setShowStatsHelp] = useState(false);
  const { incompleteGame, isChecking } = useIncompleteGameChecker(
    userId,
    currentTournament
  );

  const initialScores = useMemo(() => {
    if (!selectedCourse) return [];
    return selectedCourse.holes.map(() => ({
      gross: null,
      net: null,
      fir: null,
      gir: null,
      putts: null,
    }));
  }, [selectedCourse]);

  const handleCourseSelect = (courseId) => {
    const course = courses.find((c) => c.id === courseId) || null;
    setSelectedCourse(course);
    setErrors((prev) => ({ ...prev, selectedCourse: false }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedCourse) newErrors.selectedCourse = true;
    if (!gameName.trim()) newErrors.gameName = true;
    if (!matchFormat) newErrors.matchFormat = true;
    if (!holeCount) newErrors.holeCount = true;
    if (holeCount === 9 && !nineType) newErrors.nineType = true;
    if (!currentTournament) newErrors.tournament = true;

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const createGame = async () => {
    if (incompleteGame) {
      showError(
        "Please finish or leave your in-progress game before creating a new one.",
        "Game In Progress"
      );
      return;
    }

    if (!validateForm()) return;

    try {
      const gamePayload = {
        name: gameName.trim(),
        courseId: selectedCourse?.id,
        course: selectedCourse,
        status: "inProgress",
        matchFormat,
        holeCount,
        nineType,
        trackStats,
        tournamentId: currentTournament,
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

      await addDoc(collection(db, "games"), gamePayload);

      showSuccess("Game created! Redirecting you to enter scores.", "Success");

      navigate("/scores", { replace: true });
    } catch (error) {
      console.error("Error creating game:", error);
      showError("Failed to create game. Please try again.", "Error");
    }
  };

  const renderIncompleteBanner = () => {
    if (isChecking) {
      return (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-gray-700 dark:text-gray-300">
          Checking for in-progress games...
        </div>
      );
    }

    if (!incompleteGame) return null;

    return (
      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
        <div className="text-sm sm:text-base text-yellow-700 dark:text-yellow-200">
          <strong>You have an unfinished game:</strong>{" "}
          <span className="font-semibold">{incompleteGame.name || "Untitled Game"}</span>.
          Finish entering scores from the{" "}
          <button
            className="underline font-semibold hover:text-yellow-800 dark:hover:text-yellow-100"
            onClick={() => navigate("/scores")}
          >
            Enter Scores page
          </button>{" "}
          before creating a new one.
        </div>
      </div>
    );
  };

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
            Create Game
          </h1>

          {!currentTournament && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm sm:text-base text-red-700 dark:text-red-300">
              You must select a tournament before creating a game. Visit the dashboard to choose a tournament.
            </div>
          )}

          {renderIncompleteBanner()}

          <div className="mb-4 sm:mb-6">
            <SearchableCourseDropdown
              courses={courses}
              selectedCourseId={selectedCourse?.id || null}
              onCourseSelect={handleCourseSelect}
              placeholder="Select a course"
              label=""
              disabled={!!incompleteGame}
              error={errors.selectedCourse}
              className="mb-3 sm:mb-4"
            />

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
              disabled={!!incompleteGame}
            />

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-gray-900 dark:text-white font-medium">
                  Match Format
                </label>
                <button
                  type="button"
                  onClick={() => setShowFormatHelp(true)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  title="Learn about match formats"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
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
                disabled={!!incompleteGame}
              >
                <option value="" disabled>
                  Select Match Format
                </option>
                {MATCH_FORMAT_SELECT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-gray-900 dark:text-white font-medium mb-2">
                Number of Holes
              </label>
              <select
                value={holeCount || ""}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setHoleCount(value);
                  setErrors((prev) => ({ ...prev, holeCount: false }));
                  if (value === 18) {
                    setNineType("front");
                  }
                }}
                className={`w-full p-3 sm:p-4 rounded-2xl border ${
                  errors.holeCount
                    ? "border-red-500"
                    : "border-gray-200 dark:border-gray-600"
                } bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white mb-3 sm:mb-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800`}
                disabled={!!incompleteGame}
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
                  disabled={!!incompleteGame}
                >
                  <option value="" disabled>
                    Select 9 Holes
                  </option>
                  <option value="front">Out (Front 9)</option>
                  <option value="back">In (Back 9)</option>
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackStats}
                  onChange={(e) => setTrackStats(e.target.checked)}
                  className="w-5 h-5 text-green-600 dark:text-green-500 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                  disabled={!!incompleteGame}
                />
                <span className="text-gray-900 dark:text-white font-medium">
                  Track stats for round
                </span>
                <button
                  type="button"
                  onClick={() => setShowStatsHelp(true)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded-full"
                  title="Learn about stats tracking"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </label>
            </div>
          </div>

          <button
            onClick={createGame}
            className="w-full px-6 py-3 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-60"
            disabled={!!incompleteGame || !userId}
          >
            Create Game
          </button>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 text-center">
            Ready to play?{" "}
            <button
              className="text-green-600 dark:text-green-400 font-semibold hover:underline"
              onClick={() => navigate("/scores")}
            >
              Enter scores for an existing game
            </button>
          </p>
        </div>
      </div>

      <Modal {...modal} onClose={hideModal} />

      {/* Stats Help Modal */}
      {showStatsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Track Stats for Round
              </h2>
              <button
                onClick={() => setShowStatsHelp(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl leading-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-1"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                When enabled, players will be required to enter additional statistics for each hole during score entry:
              </p>

              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    FIR (Fairway In Regulation)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Check this box if the player's tee shot lands on the fairway. For par 3 holes, this is typically not applicable.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    GIR (Green In Regulation)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Check this box if the player reaches the green in the regulation number of strokes (par minus 2). For example, on a par 4, the player must reach the green in 2 strokes or fewer.
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Putts
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Enter the number of putts taken on each hole. This includes all strokes made on the putting surface.
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Note:</span> These statistics will be available for viewing in the Round Stats modal on the Leaderboard page, and you can track your personal statistics over time in the My Stats page.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowStatsHelp(false)}
                className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

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

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Wolf (3 Players)
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Exactly 3 players. A rotating <span className="font-semibold">Wolf</span> is assigned each hole in a fixed order (randomized at game start). The Wolf must choose to <span className="font-semibold">team up</span> or go <span className="font-semibold">Lone Wolf</span> <span className="italic">(before the wolf tees off)</span>. Uses <span className="font-semibold">gross scores</span> (no handicaps).
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  <li>
                    <span className="font-semibold">Partnered (2v1)</span>: Wolf + partner best ball vs solo player’s gross.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Team best &lt; Solo: Wolf + partner <span className="font-semibold">+1</span> each</li>
                      <li>Solo &lt; Team best: Solo <span className="font-semibold">+3</span></li>
                      <li>Tie: Solo <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Lone Wolf (1v2)</span>: Wolf vs opponents' best ball.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf wins: Wolf <span className="font-semibold">+3</span></li>
                      <li>Opponents win: Each opponent <span className="font-semibold">+1</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Blind Lone Wolf (1v2)</span>: High-risk, high-reward option. Must choose <span className="font-semibold">before any player tees off</span>.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf wins: Wolf <span className="font-semibold">+6</span></li>
                      <li>Opponents win: Each opponent <span className="font-semibold">+2</span></li>
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
                      <li>Wolf wins: Wolf <span className="font-semibold">+3</span></li>
                      <li>Opponents win: Each opponent <span className="font-semibold">+1</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                  <li className="mt-1">
                    <span className="font-semibold">Blind Lone Wolf (1v2)</span>: High-risk, high-reward option. Must choose <span className="font-semibold">before any player tees off</span>.
                    <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
                      <li>Wolf wins: Wolf <span className="font-semibold">+6</span></li>
                      <li>Opponents win: Each opponent <span className="font-semibold">+2</span></li>
                      <li>Tie: Wolf <span className="font-semibold">+1</span></li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Stroke Play
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Two players compete in a 1v1 format to get the lowest gross score (no handicaps). Simple stroke scoring where the player with the lowest total strokes wins.
                </p>
              </div>

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


