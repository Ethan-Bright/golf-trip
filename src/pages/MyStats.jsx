import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { courses } from "../data/courses";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import SearchableCourseDropdown from "../components/SearchableCourseDropdown";
import PageShell from "../components/layout/PageShell";
import TrendChart from "../components/stats/TrendChart";
import { computeHeadToHead } from "../lib/headToHead";

const STATS_PAGE_SIZE = 100;

function ChartCard({ title, subtitle, data, unit, formatValue }) {
  return (
    <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4">
      <div className="mb-2">
        <h3 className="font-semibold text-[var(--text-strong)]">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      <TrendChart data={data} unit={unit} formatValue={formatValue} />
    </div>
  );
}

export default function MyStats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const requestedUserId = queryParams.get("userId");
  const statsUserId = requestedUserId || user?.uid || null;
  const isViewingSelf = !requestedUserId || requestedUserId === user?.uid;
  const statsOriginPath = requestedUserId ? "/members" : "/dashboard";
  const statsOriginLabel = requestedUserId ? "Members" : "Dashboard";
  const [viewType, setViewType] = useState(null); // null, 'all-time', or 'course'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [courseRounds, setCourseRounds] = useState([]);
  const [rawGames, setRawGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalRounds: 0,
    totalHoles: 0,
    totalPutts: 0,
    totalFIR: 0,
    totalGIR: 0,
    totalFirOpportunities: 0,
    avgPuttsPerHole: 0,
    firPercentage: 0,
    girPercentage: 0,
  });
  const [courseStats, setCourseStats] = useState(null);
  const [holeStats, setHoleStats] = useState([]);
  const [selectedHole, setSelectedHole] = useState(null);
  const [holeHistoryModalOpen, setHoleHistoryModalOpen] = useState(false);
  const [holeHistory, setHoleHistory] = useState([]);
  const [viewedUserProfile, setViewedUserProfile] = useState(null);
  const statsOwnerNameBase =
    viewedUserProfile?.displayName ||
    (isViewingSelf ? user?.displayName : null);
  const statsOwnerName = String(
    statsOwnerNameBase || (isViewingSelf ? "You" : "Player")
  );
  const statsTitle = isViewingSelf
    ? "My Stats"
    : `${statsOwnerName}${statsOwnerName.endsWith("s") ? "'" : "'s"} Stats`;
  const statsPronoun = isViewingSelf ? "your" : "their";
  const statsPronounCap = isViewingSelf ? "Your" : "Their";
  const statsOwnerPossessive = isViewingSelf
    ? "your"
    : `${statsOwnerName}${statsOwnerName.endsWith("s") ? "'" : "'s"}`;

  useEffect(() => {
    if (!statsUserId) {
      setViewedUserProfile(null);
      return;
    }

    if (isViewingSelf && user) {
      setViewedUserProfile(user);
      return;
    }

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const userRef = doc(db, "users", statsUserId);
        const userSnap = await getDoc(userRef);
        if (!isMounted) return;
        if (userSnap.exists()) {
          setViewedUserProfile({
            uid: statsUserId,
            ...userSnap.data(),
          });
        } else {
          setViewedUserProfile(null);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        if (isMounted) {
          setViewedUserProfile(null);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [statsUserId, isViewingSelf, user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!statsUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let gamesData = [];
        let shouldUseLegacyFetch = false;

        try {
          const statsQuery = query(
            collection(db, "games"),
            where("status", "==", "complete"),
            where("playerIds", "array-contains", statsUserId),
            orderBy("createdAt", "desc"),
            limit(STATS_PAGE_SIZE)
          );

          const snapshot = await getDocs(statsQuery);
          gamesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (snapshot.empty) {
            shouldUseLegacyFetch = true;
          }
        } catch (err) {
          console.warn("Player-scoped stats query failed, falling back to legacy fetch:", err);
          shouldUseLegacyFetch = true;
        }

        if (shouldUseLegacyFetch) {
          const legacyQuery = query(
            collection(db, "games"),
            where("status", "==", "complete")
          );
          const snapshot = await getDocs(legacyQuery);
          gamesData = snapshot.docs
            .map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }))
            .filter((game) =>
              Array.isArray(game.players)
                ? game.players.some((p) => p.userId === statsUserId)
                : false
            )
            .sort((a, b) => {
              const aTime = a.createdAt?.seconds || a.createdAt || 0;
              const bTime = b.createdAt?.seconds || b.createdAt || 0;
              return bTime - aTime;
            })
            .slice(0, STATS_PAGE_SIZE);
        }

        gamesData = gamesData.filter((game) =>
          !game.isFunGame &&
          (Array.isArray(game.players)
            ? game.players.some((p) => p.userId === statsUserId)
            : false)
        );

        // Keep the raw completed games for head-to-head comparisons.
        setRawGames(gamesData);

        // Collect games where the user participated
        const allUserRounds = gamesData
          .map((game) => {
            if (game.isFunGame) return null;
            const player = game.players?.find((p) => p.userId === statsUserId);
            if (!player) return null;

            const totalHolesInCourse =
              game.course?.holes?.length ||
              player.scores?.length ||
              (game.holeCount === 9 ? 9 : 18);

            const playerScores = Array.from({ length: totalHolesInCourse }, (_, idx) => {
              const score = player.scores?.[idx] || {};
              const holePar = game.course?.holes?.[idx]?.par ?? null;
              return {
                gross: score?.gross ?? null,
                fir: score?.fir ?? null,
                gir: score?.gir ?? null,
                putts: score?.putts ?? null,
                par: holePar,
              };
            });

            const playedScores = playerScores.filter(
              (score) => score.gross !== null && score.gross !== undefined
            );

            if (playedScores.length === 0) return null;

            const statsTracked = player.trackStats ?? game.trackStats ?? false;

            const totalPuttsRaw = playedScores.reduce(
              (sum, score) => sum + (score.putts || 0),
              0
            );
            const firEligibleScores = playerScores.filter(
              (score) =>
                score.gross !== null &&
                score.gross !== undefined &&
                score.par !== 3
            );
            const firEligibleCount = firEligibleScores.length;
            const firCountRaw = statsTracked
              ? firEligibleScores.filter((score) => score.fir === true).length
              : 0;
            const firOpportunities = statsTracked ? firEligibleCount : 0;
            const girCountRaw = playedScores.filter(
              (score) => score.gir === true
            ).length;

            const avgPutts = playedScores.length
              ? totalPuttsRaw / playedScores.length
              : 0;
            const firPercentage = firOpportunities
              ? (firCountRaw / firOpportunities) * 100
              : 0;
            const girPercentage = playedScores.length
              ? (girCountRaw / playedScores.length) * 100
              : 0;

            return {
              gameId: game.id,
              gameName: game.name,
              courseName: game.course?.name || "Unknown Course",
              courseId: game.course?.id || game.courseId || null,
              date: game.createdAt?.seconds
                ? new Date(game.createdAt.seconds * 1000).toLocaleDateString()
                : "Unknown",
              dateTimestamp: game.createdAt?.seconds || 0,
              holesPlayed: playedScores.length,
              totalPutts: statsTracked ? totalPuttsRaw : 0,
              avgPutts: statsTracked ? avgPutts.toFixed(2) : "0.00",
              firCount: statsTracked ? firCountRaw : 0,
              firOpportunities: statsTracked ? firOpportunities : 0,
              firPercentage: statsTracked ? firPercentage.toFixed(1) : "0.0",
              girCount: statsTracked ? girCountRaw : 0,
              girPercentage: statsTracked ? girPercentage.toFixed(1) : "0.0",
              scores: playerScores,
              course: game.course,
              hasStats: statsTracked,
            };
          })
          .filter(Boolean);

        const trackedRounds = allUserRounds.filter((round) => round.hasStats);

        setCourseRounds(allUserRounds);
        setRounds(trackedRounds);

        // Calculate overall stats
        const totalRounds = trackedRounds.length;
        const totalHoles = trackedRounds.reduce(
          (sum, round) => sum + round.holesPlayed,
          0
        );
        const totalPutts = trackedRounds.reduce(
          (sum, round) => sum + round.totalPutts,
          0
        );
        const totalFIR = trackedRounds.reduce(
          (sum, round) => sum + round.firCount,
          0
        );
        const totalFirOpportunities = trackedRounds.reduce(
          (sum, round) => sum + (round.firOpportunities || 0),
          0
        );
        const totalGIR = trackedRounds.reduce(
          (sum, round) => sum + round.girCount,
          0
        );

        const avgPuttsPerHole =
          totalHoles > 0 ? (totalPutts / totalHoles).toFixed(2) : 0;
        const firPercentage =
          totalFirOpportunities > 0
            ? ((totalFIR / totalFirOpportunities) * 100).toFixed(1)
            : 0;
        const girPercentage =
          totalHoles > 0 ? ((totalGIR / totalHoles) * 100).toFixed(1) : 0;

        setOverallStats({
          totalRounds,
          totalHoles,
          totalPutts,
          totalFIR,
          totalGIR,
          totalFirOpportunities,
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
  }, [statsUserId]);

  // Calculate course-specific stats when course is selected
  useEffect(() => {
    if (viewType === "course" && selectedCourseId && courseRounds.length > 0) {
      const selectedRounds = courseRounds.filter(
        (round) => round.courseId === selectedCourseId
      );

      if (selectedRounds.length === 0) {
        setCourseStats(null);
        setHoleStats([]);
        return;
      }

      // Calculate course overall stats
      const totalRounds = selectedRounds.length;
      const totalHoles = selectedRounds.reduce(
        (sum, round) => sum + round.holesPlayed,
        0
      );
      const statsEnabledRounds = selectedRounds.filter((round) => round.hasStats);
      const statsHoles = statsEnabledRounds.reduce(
        (sum, round) => sum + round.holesPlayed,
        0
      );
      const totalPutts = statsEnabledRounds.reduce(
        (sum, round) => sum + round.totalPutts,
        0
      );
      const totalFIR = statsEnabledRounds.reduce(
        (sum, round) => sum + round.firCount,
        0
      );
      const totalFirOpportunities = statsEnabledRounds.reduce(
        (sum, round) => sum + (round.firOpportunities || 0),
        0
      );
      const totalGIR = statsEnabledRounds.reduce(
        (sum, round) => sum + round.girCount,
        0
      );

      const avgPuttsPerHole =
        statsHoles > 0 ? (totalPutts / statsHoles).toFixed(2) : "0.00";
      const firPercentage =
        totalFirOpportunities > 0
          ? ((totalFIR / totalFirOpportunities) * 100).toFixed(1)
          : "0.0";
      const girPercentage =
        statsHoles > 0 ? ((totalGIR / statsHoles) * 100).toFixed(1) : "0.0";

      setCourseStats({
        totalRounds,
        totalHoles,
        totalPutts,
        totalFIR,
        totalFirOpportunities,
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
        selectedRounds.forEach((round) => {
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
              hasStats: round.hasStats,
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
        const statsScores = holeScores.filter((h) => h.hasStats);
        const statsCount = statsScores.length;
        const totalPutts = statsScores.reduce(
          (sum, h) => sum + (h.score.putts || 0),
          0
        );
        const isPar3 = hole.par === 3;
        const firEligibleScores = isPar3 ? [] : statsScores;
        const firAttempts = firEligibleScores.length;
        const firCount = isPar3
          ? 0
          : firEligibleScores.filter((h) => h.score.fir === true).length;
        const girCount = statsScores.filter((h) => h.score.gir === true).length;

        const avgScore = (totalScore / holeScores.length).toFixed(2);
        const avgPutts =
          statsCount > 0 ? (totalPutts / statsCount).toFixed(2) : "0.00";
        const firPercentage = isPar3
          ? "-"
          : firAttempts > 0
          ? ((firCount / firAttempts) * 100).toFixed(1)
          : "0.0";
        const girPercentage =
          statsCount > 0 ? ((girCount / statsCount) * 100).toFixed(1) : "0.0";

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
  }, [viewType, selectedCourseId, courseRounds]);

  // Get unique courses from rounds
  const availableCourses = Array.from(
    new Set(courseRounds.map((round) => round.courseId).filter(Boolean))
  )
    .map((courseId) => {
      const course = courses.find((c) => c.id === courseId);
      const round = courseRounds.find((r) => r.courseId === courseId);
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

  const renderAllTimeStats = () => {
    if (overallStats.totalRounds === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-lg mb-2">
            No stats available yet
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Complete rounds with stats tracking enabled to see {statsPronoun} statistics here.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="panel-brand p-6">
          <h2 className="text-xl font-bold text-[var(--text-strong)] mb-4 text-center">
            Overall Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {overallStats.totalRounds}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                Rounds
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {overallStats.avgPuttsPerHole}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                Avg Putts/Hole
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {overallStats.firPercentage}%
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                FIR%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                ({overallStats.totalFIR}/{overallStats.totalFirOpportunities || 0})
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {overallStats.girPercentage}%
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                GIR%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                ({overallStats.totalGIR}/{overallStats.totalHoles})
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--text-strong)]">
            Round History
          </h2>
          {rounds.map((round) => (
            <div
              key={round.gameId}
              className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                    {round.gameName}
                  </h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    {round.courseName} • {round.date}
                  </p>
                </div>
                <div className="mt-2 sm:mt-0">
                  <p className="text-sm text-[var(--text-muted)]">
                    {round.holesPlayed} holes
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[var(--text-muted)] text-xs">Avg Putts</p>
                  <p className="text-lg font-semibold text-[var(--text-strong)]">
                    {round.avgPutts}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-xs">FIR%</p>
                  <p className="text-lg font-semibold text-[var(--text-strong)]">
                    {round.firPercentage}%
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ({round.firCount}/{round.firOpportunities || 0})
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-xs">GIR%</p>
                  <p className="text-lg font-semibold text-[var(--text-strong)]">
                    {round.girPercentage}%
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    ({round.girCount}/{round.holesPlayed})
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] text-xs">Total Putts</p>
                  <p className="text-lg font-semibold text-[var(--text-strong)]">
                    {round.totalPutts}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderCourseStats = () => {
    if (!selectedCourseId) {
      return (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-lg mb-2">
            Select a course to view stats
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Choose a course from the dropdown above to see detailed stats.
          </p>
        </div>
      );
    }

    if (!courseStats) {
      return (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-lg mb-2">
            No stats available for this course yet
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Complete rounds on this course with stats tracking enabled to see statistics.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="panel-brand p-6">
          <h2 className="text-xl font-bold text-[var(--text-strong)] mb-4 text-center">
            Course Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {courseStats.totalRounds}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                Rounds
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {courseStats.avgPuttsPerHole}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                Avg Putts/Hole
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {courseStats.firPercentage}%
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                FIR%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                ({courseStats.totalFIR}/{courseStats.totalFirOpportunities || 0})
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600 dark:text-brand-300">
                {courseStats.girPercentage}%
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                GIR%
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">
                ({courseStats.totalGIR}/{courseStats.totalHoles})
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {holeStats.map((hole) => (
            <div
              key={hole.holeNumber}
              className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-strong)]">
                    Hole {hole.holeNumber} • Par {hole.par}
                  </h3>
                  {hole.strokeIndex && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Stroke Index {hole.strokeIndex}
                    </p>
                  )}
                </div>
                <div className="mt-2 sm:mt-0 text-sm text-[var(--text-muted)]">
                  <p>
                    Avg Score:{" "}
                    <span className="font-semibold text-[var(--text-strong)]">
                      {hole.avgScore}
                    </span>
                  </p>
                  <p>
                    FIR:{" "}
                    <span className="font-semibold text-[var(--text-strong)]">
                      {hole.firPercentage}% ({hole.firCount}/{hole.firOpportunities})
                    </span>
                  </p>
                  <p>
                    GIR:{" "}
                    <span className="font-semibold text-[var(--text-strong)]">
                      {hole.girPercentage}% ({hole.girCount}/{hole.girOpportunities})
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleViewHoleHistory(hole)}
                className="mt-3 text-sm text-brand-600 dark:text-brand-300 font-semibold hover:underline"
              >
                View Hole History
              </button>
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderTrends = () => {
    if (courseRounds.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-lg mb-2">No rounds yet</p>
          <p className="text-[var(--text-muted)] text-sm">
            Complete a round to start charting {statsPronoun} trends.
          </p>
        </div>
      );
    }

    // Oldest -> newest for left-to-right charts.
    const chronoAll = [...courseRounds].reverse();
    const chronoTracked = [...rounds].reverse();

    const scoringData = chronoAll.map((r) => {
      const played = (r.scores || []).filter((s) => s.gross != null);
      const total = played.reduce((a, s) => a + (s.gross || 0), 0);
      return { label: r.date, value: played.length ? total / played.length : null };
    });
    const puttsData = chronoTracked.map((r) => ({
      label: r.date,
      value: Number(r.avgPutts),
    }));
    const girData = chronoTracked.map((r) => ({
      label: r.date,
      value: Number(r.girPercentage),
    }));
    const firData = chronoTracked.map((r) => ({
      label: r.date,
      value: Number(r.firPercentage),
    }));

    return (
      <div className="space-y-6">
        <ChartCard
          title="Strokes per hole"
          subtitle={`Lower is better • ${chronoAll.length} rounds`}
          data={scoringData}
          formatValue={(v) => v.toFixed(2)}
        />
        {chronoTracked.length > 0 ? (
          <>
            <ChartCard
              title="Putts per hole"
              subtitle="Lower is better • tracked rounds"
              data={puttsData}
              formatValue={(v) => v.toFixed(2)}
            />
            <ChartCard
              title="Greens in regulation"
              subtitle="Higher is better • tracked rounds"
              data={girData}
              unit="%"
            />
            <ChartCard
              title="Fairways in regulation"
              subtitle="Higher is better • tracked rounds"
              data={firData}
              unit="%"
            />
          </>
        ) : (
          <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-muted)]">
            Enable “Track my stats” during a round to chart putts, GIR and FIR
            over time.
          </div>
        )}
      </div>
    );
  };

  const renderHeadToHead = () => {
    const records = computeHeadToHead(rawGames, statsUserId);
    if (records.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-[var(--text-muted)] text-lg mb-2">
            No head-to-head history yet
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Play completed rounds with others to build up a rivalry record.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-[var(--text-muted)]">
          Based on total score in completed rounds played together (net for
          handicap formats, gross otherwise).
        </p>
        {records.map((rec) => {
          const diff = rec.wins - rec.losses;
          return (
            <button
              key={rec.opponentId}
              onClick={() => navigate(`/my-stats?userId=${rec.opponentId}`)}
              className="w-full flex items-center gap-3 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4 text-left hover:bg-brand-500/10 transition"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden bg-[var(--surface-muted)] flex-none border border-[var(--surface-card-border)]">
                {rec.profilePictureUrl ? (
                  <img
                    src={rec.profilePictureUrl}
                    alt={rec.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] font-semibold">
                    {rec.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[var(--text-strong)] truncate">
                  {isViewingSelf ? "You vs " : ""}
                  {rec.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {rec.games} {rec.games === 1 ? "round" : "rounds"} together
                  {diff !== 0 && (
                    <span
                      className={
                        diff > 0
                          ? "text-brand-600 dark:text-brand-300 font-semibold"
                          : "text-red-500 font-semibold"
                      }
                    >
                      {" "}
                      • {diff > 0 ? `+${diff}` : diff}
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right flex-none">
                <div className="text-lg font-black text-[var(--text-strong)] tabular-nums">
                  {rec.wins}–{rec.losses}
                  {rec.ties > 0 ? `–${rec.ties}` : ""}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  W–L{rec.ties > 0 ? "–T" : ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <PageShell
        title={statsTitle}
        description="Crunching the latest rounds..."
        backHref={statsOriginPath}
      >
        <div className="mobile-card p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500/30 border-t-brand-500"></div>
          <p className="mt-2 text-[var(--text-muted)]">Loading stats...</p>
        </div>
      </PageShell>
    );
  }

  // Show view selection screen if no view is selected
  if (viewType === null) {
    return (
      <PageShell
        title={statsTitle}
        description="Choose which stats you want to dive into."
        backHref={statsOriginPath}
        bodyClassName="mobile-section"
      >
        <section className="mobile-card p-6 sm:p-8 space-y-8">
          {courseRounds.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)] text-lg mb-2">
                No stats available yet
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                Complete rounds to see {statsPronoun} statistics here. Enable
                stats tracking during a round for putts, GIR and FIR.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setViewType("all-time")}
                className="panel-brand text-left rounded-2xl p-8 transition-all duration-200 transform hover:scale-105"
              >
                <div className="text-4xl mb-4">📊</div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--text-strong)]">All Time Stats</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  See {statsPronoun} overall statistics across all courses
                </p>
              </button>

              <button
                onClick={() => setViewType("course")}
                className="card text-left rounded-2xl p-8 transition-all duration-200 transform hover:scale-105"
              >
                <div className="text-4xl mb-4">🏌️</div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--text-strong)]">Course Stats</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  See detailed statistics for a specific course
                </p>
              </button>

              <button
                onClick={() => setViewType("trends")}
                className="card text-left rounded-2xl p-8 transition-all duration-200 transform hover:scale-105"
              >
                <div className="text-4xl mb-4">📈</div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--text-strong)]">Trends</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  Track scoring, putts, GIR and FIR round over round
                </p>
              </button>

              <button
                onClick={() => setViewType("head-to-head")}
                className="card text-left rounded-2xl p-8 transition-all duration-200 transform hover:scale-105"
              >
                <div className="text-4xl mb-4">⚔️</div>
                <h2 className="text-2xl font-bold mb-2 text-[var(--text-strong)]">Head-to-Head</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  {isViewingSelf ? "Your" : `${statsOwnerName}'s`} lifetime record vs every player
                </p>
              </button>
            </div>
          )}
        </section>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title={
          viewType === "all-time"
            ? "All Time Stats"
            : viewType === "course"
            ? "Course Stats"
            : viewType === "trends"
            ? "Trends"
            : "Head-to-Head"
        }
        description={`Viewing ${statsOwnerPossessive} data`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setViewType(null);
                setSelectedCourseId(null);
              }}
              className="btn btn-secondary btn-sm"
            >
              Back to Options
            </button>
            <button
              onClick={() => navigate(statsOriginPath)}
              className="btn btn-secondary btn-sm"
            >
              {statsOriginLabel}
            </button>
          </div>
        }
        bodyClassName="mobile-section"
      >
        {viewType === "course" && (
          <section className="mobile-card p-6 space-y-4 relative z-20">
            <SearchableCourseDropdown
              courses={availableCourses}
              selectedCourseId={selectedCourseId}
              onCourseSelect={setSelectedCourseId}
              placeholder="Select a course..."
              label="Select Course"
              error={false}
            />
          </section>
        )}

        <section className="mobile-card p-6 space-y-6">
          {viewType === "all-time"
            ? renderAllTimeStats()
            : viewType === "course"
            ? renderCourseStats()
            : viewType === "trends"
            ? renderTrends()
            : renderHeadToHead()}
        </section>
      </PageShell>

      {/* Hole History Modal */}
      {holeHistoryModalOpen && selectedHole && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card card-elevated max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[var(--surface-card-border)]">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-[var(--text-strong)]">
                  Hole {selectedHole.holeNumber} History
                </h3>
                <button
                  onClick={() => setHoleHistoryModalOpen(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-strong)]"
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
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Par {selectedHole.par} • {selectedHole.history?.length || 0} entries
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {holeHistory.length === 0 ? (
                <p className="text-center text-[var(--text-muted)] py-8">
                  No history available for this hole
                </p>
              ) : (
                <div className="space-y-3">
                  {holeHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-[var(--text-strong)]">
                            {entry.gameName}
                          </h4>
                          <p className="text-sm text-[var(--text-muted)]">
                            {entry.date}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[var(--text-strong)]">
                            {entry.score.gross}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
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
                          <div className="text-[var(--text-muted)]">Putts</div>
                          <div className="font-semibold text-[var(--text-strong)]">
                            {entry.score.putts || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">FIR</div>
                          <div className="font-semibold text-[var(--text-strong)]">
                            {entry.score.fir ? "✓" : "✗"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)]">GIR</div>
                          <div className="font-semibold text-[var(--text-strong)]">
                            {entry.score.gir ? "✓" : "✗"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-[var(--surface-card-border)]">
              <button
                onClick={() => setHoleHistoryModalOpen(false)}
                className="btn btn-primary btn-block"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
