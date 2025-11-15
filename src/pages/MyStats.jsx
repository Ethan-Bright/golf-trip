import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import { db } from "../firebase";
import { courses } from "../data/courses";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import SearchableCourseDropdown from "../components/SearchableCourseDropdown";

export default function MyStats() {
  const { user } = useAuth();
  const { currentTournament } = useTournament();
  const navigate = useNavigate();
  const [viewType, setViewType] = useState(null); // null, 'all-time', or 'course'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalRounds: 0,
    totalHoles: 0,
    totalPutts: 0,
    totalFIR: 0,
    totalGIR: 0,
    avgPuttsPerHole: 0,
    firPercentage: 0,
    girPercentage: 0,
  });
  const [courseStats, setCourseStats] = useState(null);
  const [holeStats, setHoleStats] = useState([]);
  const [selectedHole, setSelectedHole] = useState(null);
  const [holeHistoryModalOpen, setHoleHistoryModalOpen] = useState(false);
  const [holeHistory, setHoleHistory] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch all completed games with trackStats enabled across all tournaments
        const q = query(
          collection(db, "games"),
          where("status", "==", "complete")
        );

        const snapshot = await getDocs(q);
        let gamesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort by createdAt in descending order (most recent first)
        gamesData.sort((a, b) => {
          const aTime = a.createdAt?.seconds || a.createdAt || 0;
          const bTime = b.createdAt?.seconds || b.createdAt || 0;
          return bTime - aTime;
        });

        // Limit to 100 most recent games
        gamesData = gamesData.slice(0, 100);

        // Filter games where user participated and trackStats is enabled
        const userRounds = gamesData
          .filter((game) => {
            if (!game.trackStats) return false;
            return game.players?.some((p) => p.userId === user.uid);
          })
          .map((game) => {
            const player = game.players.find((p) => p.userId === user.uid);
            if (!player) return null;

            const startIndex = game.nineType === "back" ? 9 : 0;
            const endIndex =
              game.holeCount === 9
                ? startIndex + 9
                : game.course?.holes?.length || 18;
            const playerScores = (player.scores || []).slice(startIndex, endIndex);

            // Calculate round stats
            const holesPlayed = playerScores.filter(
              (score) => score.gross !== null && score.gross !== undefined
            ).length;

            if (holesPlayed === 0) return null;

            const totalPutts = playerScores.reduce(
              (sum, score) => sum + (score.putts || 0),
              0
            );
            const firCount = playerScores.filter(
              (score) => score.fir === true
            ).length;
            const girCount = playerScores.filter(
              (score) => score.gir === true
            ).length;

            const avgPutts = holesPlayed > 0 ? totalPutts / holesPlayed : 0;
            const firPercentage =
              holesPlayed > 0 ? (firCount / holesPlayed) * 100 : 0;
            const girPercentage =
              holesPlayed > 0 ? (girCount / holesPlayed) * 100 : 0;

            return {
              gameId: game.id,
              gameName: game.name,
              courseName: game.course?.name || "Unknown Course",
              courseId: game.course?.id || game.courseId || null,
              date: game.createdAt?.seconds
                ? new Date(game.createdAt.seconds * 1000).toLocaleDateString()
                : "Unknown",
              dateTimestamp: game.createdAt?.seconds || 0,
              holesPlayed,
              totalPutts,
              avgPutts: avgPutts.toFixed(2),
              firCount,
              firPercentage: firPercentage.toFixed(1),
              girCount,
              girPercentage: girPercentage.toFixed(1),
              scores: playerScores,
              course: game.course,
              startIndex,
              endIndex,
            };
          })
          .filter(Boolean);

        setRounds(userRounds);

        // Calculate overall stats
        const totalRounds = userRounds.length;
        const totalHoles = userRounds.reduce(
          (sum, round) => sum + round.holesPlayed,
          0
        );
        const totalPutts = userRounds.reduce(
          (sum, round) => sum + round.totalPutts,
          0
        );
        const totalFIR = userRounds.reduce(
          (sum, round) => sum + round.firCount,
          0
        );
        const totalGIR = userRounds.reduce(
          (sum, round) => sum + round.girCount,
          0
        );

        const avgPuttsPerHole =
          totalHoles > 0 ? (totalPutts / totalHoles).toFixed(2) : 0;
        const firPercentage =
          totalHoles > 0 ? ((totalFIR / totalHoles) * 100).toFixed(1) : 0;
        const girPercentage =
          totalHoles > 0 ? ((totalGIR / totalHoles) * 100).toFixed(1) : 0;

        setOverallStats({
          totalRounds,
          totalHoles,
          totalPutts,
          totalFIR,
          totalGIR,
          avgPuttsPerHole,
          firPercentage,
          girPercentage,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user?.uid]);

  // Calculate course-specific stats when course is selected
  useEffect(() => {
    if (viewType === "course" && selectedCourseId && rounds.length > 0) {
      const courseRounds = rounds.filter(
        (round) => round.courseId === selectedCourseId
      );

      if (courseRounds.length === 0) {
        setCourseStats(null);
        setHoleStats([]);
        return;
      }

      // Calculate course overall stats
      const totalRounds = courseRounds.length;
      const totalHoles = courseRounds.reduce(
        (sum, round) => sum + round.holesPlayed,
        0
      );
      const totalPutts = courseRounds.reduce(
        (sum, round) => sum + round.totalPutts,
        0
      );
      const totalFIR = courseRounds.reduce(
        (sum, round) => sum + round.firCount,
        0
      );
      const totalGIR = courseRounds.reduce(
        (sum, round) => sum + round.girCount,
        0
      );

      const avgPuttsPerHole =
        totalHoles > 0 ? (totalPutts / totalHoles).toFixed(2) : 0;
      const firPercentage =
        totalHoles > 0 ? ((totalFIR / totalHoles) * 100).toFixed(1) : 0;
      const girPercentage =
        totalHoles > 0 ? ((totalGIR / totalHoles) * 100).toFixed(1) : 0;

      setCourseStats({
        totalRounds,
        totalHoles,
        totalPutts,
        totalFIR,
        totalGIR,
        avgPuttsPerHole,
        firPercentage,
        girPercentage,
      });

      // Calculate hole-by-hole stats
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      if (!selectedCourse) {
        setHoleStats([]);
        return;
      }

      const holeStatsArray = selectedCourse.holes.map((hole) => {
        const holeNumber = hole.holeNumber;
        const holeIndex = holeNumber - 1; // Convert to 0-based index

        // Collect all scores for this hole across all rounds
        const holeScores = [];
        courseRounds.forEach((round) => {
          // Check if this hole was played in this round
          if (
            round.scores &&
            round.scores[holeIndex] &&
            round.scores[holeIndex].gross !== null &&
            round.scores[holeIndex].gross !== undefined
          ) {
            holeScores.push({
              gameId: round.gameId,
              gameName: round.gameName,
              date: round.date,
              dateTimestamp: round.dateTimestamp,
              score: round.scores[holeIndex],
            });
          }
        });

        if (holeScores.length === 0) {
          return {
            holeNumber,
            par: hole.par,
            strokeIndex: hole.strokeIndex,
            timesPlayed: 0,
            avgScore: 0,
            avgPutts: 0,
            firPercentage: 0,
            girPercentage: 0,
            history: [],
          };
        }

        // Calculate averages
        const totalScore = holeScores.reduce(
          (sum, h) => sum + (h.score.gross || 0),
          0
        );
        const totalPutts = holeScores.reduce(
          (sum, h) => sum + (h.score.putts || 0),
          0
        );
        const firCount = holeScores.filter((h) => h.score.fir === true).length;
        const girCount = holeScores.filter((h) => h.score.gir === true).length;

        const avgScore = (totalScore / holeScores.length).toFixed(2);
        const avgPutts = (totalPutts / holeScores.length).toFixed(2);
        const firPercentage = ((firCount / holeScores.length) * 100).toFixed(1);
        const girPercentage = ((girCount / holeScores.length) * 100).toFixed(1);

        // Sort history by date (most recent first)
        const sortedHistory = [...holeScores].sort(
          (a, b) => b.dateTimestamp - a.dateTimestamp
        );

        return {
          holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          timesPlayed: holeScores.length,
          avgScore,
          avgPutts,
          firPercentage,
          girPercentage,
          history: sortedHistory,
        };
      });

      setHoleStats(holeStatsArray);
    } else if (viewType !== "course") {
      setCourseStats(null);
      setHoleStats([]);
    }
  }, [viewType, selectedCourseId, rounds]);

  // Get unique courses from rounds
  const availableCourses = Array.from(
    new Set(rounds.map((round) => round.courseId).filter(Boolean))
  )
    .map((courseId) => {
      const course = courses.find((c) => c.id === courseId);
      const round = rounds.find((r) => r.courseId === courseId);
      return {
        id: courseId,
        name: course?.name || round?.courseName || "Unknown Course",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleViewHoleHistory = (hole) => {
    setSelectedHole(hole);
    setHoleHistory(hole.history || []);
    setHoleHistoryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Loading stats...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show view selection screen if no view is selected
  if (viewType === null) {
    return (
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-6 sm:mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl text-sm sm:text-base"
          >
            ← Back to Dashboard
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
              My Stats
            </h1>

            {overallStats.totalRounds === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
                  No stats available yet
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Complete rounds with stats tracking enabled to see your statistics here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => setViewType("all-time")}
                  className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-2xl p-8 shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-4xl mb-4">📊</div>
                  <h2 className="text-2xl font-bold mb-2">View All Time Stats</h2>
                  <p className="text-green-100 text-sm">
                    See your overall statistics across all courses
                  </p>
                </button>

                <button
                  onClick={() => setViewType("course")}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl p-8 shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  <div className="text-4xl mb-4">🏌️</div>
                  <h2 className="text-2xl font-bold mb-2">View Course Stats</h2>
                  <p className="text-blue-100 text-sm">
                    See detailed statistics for a specific course
                  </p>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={() => {
              setViewType(null);
              setSelectedCourseId(null);
            }}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl text-sm sm:text-base"
          >
            ← Back to Options
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl text-sm sm:text-base"
          >
            Dashboard
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {viewType === "all-time" ? "All Time Stats" : "Course Stats"}
          </h1>

          {viewType === "course" && (
            <div className="mb-6">
              <SearchableCourseDropdown
                courses={availableCourses}
                selectedCourseId={selectedCourseId}
                onCourseSelect={setSelectedCourseId}
                placeholder="Select a course..."
                label="Select Course"
                error={false}
              />
            </div>
          )}

          {viewType === "all-time" ? (
            // All-Time Stats View
            overallStats.totalRounds === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
                  No stats available yet
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Complete rounds with stats tracking enabled to see your statistics here.
                </p>
              </div>
            ) : (
              <>
                {/* Overall Stats Summary */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl p-6 mb-6 border border-green-200 dark:border-green-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Overall Statistics
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {overallStats.totalRounds}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Rounds
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {overallStats.avgPuttsPerHole}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Avg Putts/Hole
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {overallStats.firPercentage}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        FIR%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        ({overallStats.totalFIR}/{overallStats.totalHoles})
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {overallStats.girPercentage}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        GIR%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        ({overallStats.totalGIR}/{overallStats.totalHoles})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Rounds */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Round History
                  </h2>
                  <div className="space-y-4">
                    {rounds.map((round) => (
                      <div
                        key={round.gameId}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {round.gameName}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {round.courseName} • {round.date} • {round.holesPlayed} holes
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">Avg Putts</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {round.avgPutts}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">FIR%</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {round.firPercentage}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              ({round.firCount}/{round.holesPlayed})
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">GIR%</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {round.girPercentage}%
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              ({round.girCount}/{round.holesPlayed})
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 dark:text-gray-400">Total Putts</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {round.totalPutts}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )
          ) : (
            // Course Stats View
            !selectedCourseId ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
                  Please select a course to view statistics
                </p>
              </div>
            ) : !courseStats ? (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-300 text-lg mb-2">
                  No stats available for this course yet
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Complete rounds on this course with stats tracking enabled to see statistics.
                </p>
              </div>
            ) : (
              <>
                {/* Course Overall Stats */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6 mb-6 border border-blue-200 dark:border-blue-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                    Course Statistics
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {courseStats.totalRounds}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Rounds
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {courseStats.avgPuttsPerHole}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Avg Putts/Hole
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {courseStats.firPercentage}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        FIR%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        ({courseStats.totalFIR}/{courseStats.totalHoles})
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {courseStats.girPercentage}%
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        GIR%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        ({courseStats.totalGIR}/{courseStats.totalHoles})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hole-by-Hole Stats */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Hole-by-Hole Statistics
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Hole
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Par
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Times Played
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Avg Score
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            Avg Putts
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            FIR%
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            GIR%
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            History
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {holeStats.map((hole) => (
                          <tr
                            key={hole.holeNumber}
                            className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          >
                            <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                              {hole.holeNumber}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                              {hole.par}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                              {hole.timesPlayed}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-900 dark:text-white font-semibold">
                              {hole.timesPlayed > 0 ? hole.avgScore : "-"}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                              {hole.timesPlayed > 0 ? hole.avgPutts : "-"}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                              {hole.timesPlayed > 0 ? `${hole.firPercentage}%` : "-"}
                            </td>
                            <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">
                              {hole.timesPlayed > 0 ? `${hole.girPercentage}%` : "-"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {hole.timesPlayed > 0 ? (
                                <button
                                  onClick={() => handleViewHoleHistory(hole)}
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
                                >
                                  View
                                </button>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          )}
        </div>
      </div>

      {/* Hole History Modal */}
      {holeHistoryModalOpen && selectedHole && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Hole {selectedHole.holeNumber} History
                </h3>
                <button
                  onClick={() => setHoleHistoryModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Par {selectedHole.par} • {selectedHole.timesPlayed} rounds played
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {holeHistory.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No history available for this hole
                </p>
              ) : (
                <div className="space-y-3">
                  {holeHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {entry.gameName}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {entry.score.gross}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {entry.score.gross - selectedHole.par > 0
                              ? `+${entry.score.gross - selectedHole.par}`
                              : entry.score.gross - selectedHole.par === 0
                              ? "Par"
                              : entry.score.gross - selectedHole.par}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Putts</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {entry.score.putts || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">FIR</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {entry.score.fir ? "✓" : "✗"}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">GIR</div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {entry.score.gir ? "✓" : "✗"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setHoleHistoryModalOpen(false)}
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
