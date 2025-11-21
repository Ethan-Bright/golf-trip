import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { fetchTeamsForTournament } from "../utils/teamService";

const MIN_PERCENTAGE_SAMPLES = 6;
const MIN_PUTTS_SAMPLES = 9;

const isValidNumber = (value) =>
  typeof value === "number" && Number.isFinite(value);

const formatRelativeScore = (value) => {
  if (!isValidNumber(value)) {
    return "—";
  }
  const rounded = Number(value.toFixed(1));
  if (rounded === 0) return "E";
  const formatted = Number.isInteger(rounded)
    ? `${rounded}`
    : rounded.toFixed(1);
  return rounded > 0 ? `+${formatted}` : formatted;
};

const formatPercentage = (value) => {
  if (!isValidNumber(value)) return "—";
  return `${value.toFixed(1)}%`;
};

const formatAverage = (value, decimals = 2) => {
  if (!isValidNumber(value)) return "—";
  return value.toFixed(decimals);
};

const formatHoleSummary = (holes, games) => {
  if (!holes) return "";
  const holeLabel = `${holes} hole${holes === 1 ? "" : "s"}`;
  const gameLabel = games
    ? `${games} game${games === 1 ? "" : "s"}`
    : null;
  return [holeLabel, gameLabel].filter(Boolean).join(" • ");
};

const compareAsc = (a, b) => {
  const aValid = isValidNumber(a);
  const bValid = isValidNumber(b);
  if (aValid && bValid) {
    if (a !== b) return a - b;
    return 0;
  }
  if (aValid) return -1;
  if (bValid) return 1;
  return 0;
};

const compareDesc = (a, b) => compareAsc(b, a);

const rankPlayers = (players, comparator, predicate = () => true) =>
  players.filter(predicate).sort(comparator);

const enhanceName = (player) =>
  player?.name ||
  player?.displayName ||
  player?.fullName ||
  player?.nickname ||
  "Unknown Player";

const computePlayerStats = (games = []) => {
  const statsMap = new Map();

  games.forEach((game) => {
    const courseHoles = Array.isArray(game?.course?.holes)
      ? game.course.holes
      : [];
    const players = Array.isArray(game?.players) ? game.players : [];

    players.forEach((player) => {
      if (!player?.userId) return;
      if (!statsMap.has(player.userId)) {
        statsMap.set(player.userId, {
          userId: player.userId,
          name: enhanceName(player),
          grossStrokes: 0,
          grossHoles: 0,
          grossToPar: 0,
          netStrokes: 0,
          netHoles: 0,
          netToPar: 0,
          birdies: 0,
          pars: 0,
          firHits: 0,
          firOpportunities: 0,
          girHits: 0,
          girOpportunities: 0,
          totalPutts: 0,
          puttsHoles: 0,
          totalGames: new Set(),
        });
      }
      const playerStats = statsMap.get(player.userId);
      if (game.id) {
        playerStats.totalGames.add(game.id);
      }

      (player.scores || []).forEach((score, index) => {
        if (!score) return;
        const hole = courseHoles[index];
        const par = typeof hole?.par === "number" ? hole.par : null;

        if (typeof score.gross === "number") {
          playerStats.grossStrokes += score.gross;
          playerStats.grossHoles += 1;
          if (par != null) {
            playerStats.grossToPar += score.gross - par;
            if (score.gross === par - 1) {
              playerStats.birdies += 1;
            }
            if (score.gross === par) {
              playerStats.pars += 1;
            }
          }
        }

        if (typeof score.netScore === "number") {
          playerStats.netStrokes += score.netScore;
          playerStats.netHoles += 1;
          if (par != null) {
            playerStats.netToPar += score.netScore - par;
          }
        }

        if (score.fir === true || score.fir === false) {
          playerStats.firOpportunities += 1;
          if (score.fir) {
            playerStats.firHits += 1;
          }
        }

        if (score.gir === true || score.gir === false) {
          playerStats.girOpportunities += 1;
          if (score.gir) {
            playerStats.girHits += 1;
          }
        }

        if (typeof score.putts === "number") {
          playerStats.totalPutts += score.putts;
          playerStats.puttsHoles += 1;
        }
      });
    });
  });

  return Array.from(statsMap.values()).map((stats) => {
    const gamesPlayed = stats.totalGames.size;
    return {
      ...stats,
      name: stats.name,
      gamesPlayed,
      firPercentage:
        stats.firOpportunities > 0
          ? (stats.firHits / stats.firOpportunities) * 100
          : null,
      girPercentage:
        stats.girOpportunities > 0
          ? (stats.girHits / stats.girOpportunities) * 100
          : null,
      avgPutts:
        stats.puttsHoles > 0
          ? stats.totalPutts / stats.puttsHoles
          : null,
    };
  });
};

const buildCategories = (players) => {
  const netLeaders = rankPlayers(
    players,
    (a, b) => {
      const rel = compareAsc(a.netToPar, b.netToPar);
      if (rel !== 0) return rel;
      return b.netHoles - a.netHoles;
    },
    (p) => isValidNumber(p.netToPar) && p.netHoles > 0
  );

  const grossLeaders = rankPlayers(
    players,
    (a, b) => {
      const rel = compareAsc(a.grossToPar, b.grossToPar);
      if (rel !== 0) return rel;
      return b.grossHoles - a.grossHoles;
    },
    (p) => isValidNumber(p.grossToPar) && p.grossHoles > 0
  );

  const birdieLeaders = rankPlayers(
    players,
    (a, b) => {
      if (b.birdies !== a.birdies) return b.birdies - a.birdies;
      return b.grossHoles - a.grossHoles;
    },
    (p) => p.birdies > 0
  );

  const parLeaders = rankPlayers(
    players,
    (a, b) => {
      if (b.pars !== a.pars) return b.pars - a.pars;
      return b.grossHoles - a.grossHoles;
    },
    (p) => p.pars > 0
  );

  const girLeaders = rankPlayers(
    players,
    (a, b) => {
      const rel = compareDesc(a.girPercentage, b.girPercentage);
      if (rel !== 0) return rel;
      return b.girOpportunities - a.girOpportunities;
    },
    (p) =>
      isValidNumber(p.girPercentage) &&
      p.girOpportunities >= MIN_PERCENTAGE_SAMPLES
  );

  const firLeaders = rankPlayers(
    players,
    (a, b) => {
      const rel = compareDesc(a.firPercentage, b.firPercentage);
      if (rel !== 0) return rel;
      return b.firOpportunities - a.firOpportunities;
    },
    (p) =>
      isValidNumber(p.firPercentage) &&
      p.firOpportunities >= MIN_PERCENTAGE_SAMPLES
  );

  const puttingLeaders = rankPlayers(
    players,
    (a, b) => {
      const rel = compareAsc(a.avgPutts, b.avgPutts);
      if (rel !== 0) return rel;
      return b.puttsHoles - a.puttsHoles;
    },
    (p) =>
      isValidNumber(p.avgPutts) && p.puttsHoles >= MIN_PUTTS_SAMPLES
  );

  const mapEntries = (leaders, formatValue, formatDetail) =>
    leaders.map((player) => ({
      player,
      value: formatValue(player),
      detail: formatDetail ? formatDetail(player) : "",
    }));

  const createCategory = (key, title, subtitle, leaders, formatValue, formatDetail) => ({
    key,
    title,
    subtitle,
    entries: mapEntries(
      leaders.slice(0, 3),
      formatValue,
      formatDetail
    ),
    fullEntries: mapEntries(leaders, formatValue, formatDetail),
  });

  return [
    createCategory(
      "net",
      "Lowest Net To Par",
      "All games in this tournament",
      netLeaders,
      (p) => formatRelativeScore(p.netToPar),
      (p) => formatHoleSummary(p.netHoles, p.gamesPlayed)
    ),
    createCategory(
      "gross",
      "Lowest Gross To Par",
      "Raw stroke play",
      grossLeaders,
      (p) => formatRelativeScore(p.grossToPar),
      (p) => formatHoleSummary(p.grossHoles, p.gamesPlayed)
    ),
    createCategory(
      "birdies",
      "Most Birdies",
      "Gross scoring",
      birdieLeaders,
      (p) => `${p.birdies}`,
      (p) => formatHoleSummary(p.grossHoles, p.gamesPlayed)
    ),
    createCategory(
      "pars",
      "Most Pars",
      "Consistency matters",
      parLeaders,
      (p) => `${p.pars}`,
      (p) => formatHoleSummary(p.grossHoles, p.gamesPlayed)
    ),
    createCategory(
      "gir",
      "Highest GIR%",
      `Min ${MIN_PERCENTAGE_SAMPLES} tracked holes`,
      girLeaders,
      (p) => formatPercentage(p.girPercentage),
      (p) => `${p.girHits}/${p.girOpportunities} greens`
    ),
    createCategory(
      "fir",
      "Highest FIR%",
      `Min ${MIN_PERCENTAGE_SAMPLES} tracked holes`,
      firLeaders,
      (p) => formatPercentage(p.firPercentage),
      (p) => `${p.firHits}/${p.firOpportunities} fairways`
    ),
    createCategory(
      "putts",
      "Lowest Avg Putts",
      `Min ${MIN_PUTTS_SAMPLES} holes tracked`,
      puttingLeaders,
      (p) => formatAverage(p.avgPutts, 2),
      (p) => `${p.totalPutts} putts • ${p.puttsHoles} holes`
    ),
  ];
};

const extractTeamMemberIds = (team) => {
  if (!team) return [];
  const ids = new Set();
  const addId = (playerSlot) => {
    if (!playerSlot) return;
    const id = playerSlot.uid || playerSlot.userId || playerSlot.id;
    if (typeof id === "string" && id.trim()) {
      ids.add(id);
    }
  };

  addId(team.player1);
  addId(team.player2);

  if (Array.isArray(team.members)) {
    team.members.forEach((member) => {
      if (typeof member === "string") {
        ids.add(member);
      } else {
        addId(member);
      }
    });
  }

  if (Array.isArray(team.playerIds)) {
    team.playerIds.forEach((id) => {
      if (typeof id === "string" && id.trim()) {
        ids.add(id);
      }
    });
  }

  return Array.from(ids);
};

const buildTeamStats = (teamsList = [], playerStatsMap = new Map()) => {
  if (!teamsList.length || playerStatsMap.size === 0) return [];

  return teamsList
    .map((team) => {
      const memberIds = extractTeamMemberIds(team);
      const memberStats = memberIds
        .map((id) => playerStatsMap.get(id))
        .filter(Boolean);

      if (memberStats.length === 0) return null;

      const aggregate = memberStats.reduce(
        (acc, member) => {
          acc.grossStrokes += member.grossStrokes || 0;
          acc.grossHoles += member.grossHoles || 0;
          acc.grossToPar += member.grossToPar || 0;
          acc.netStrokes += member.netStrokes || 0;
          acc.netHoles += member.netHoles || 0;
          acc.netToPar += member.netToPar || 0;
          acc.birdies += member.birdies || 0;
          acc.pars += member.pars || 0;
          acc.firHits += member.firHits || 0;
          acc.firOpportunities += member.firOpportunities || 0;
          acc.girHits += member.girHits || 0;
          acc.girOpportunities += member.girOpportunities || 0;
          acc.totalPutts += member.totalPutts || 0;
          acc.puttsHoles += member.puttsHoles || 0;

          const totalGames = member.totalGames;
          if (totalGames instanceof Set) {
            totalGames.forEach((gameId) => acc.totalGames.add(gameId));
          } else if (Array.isArray(totalGames)) {
            totalGames.forEach((gameId) => acc.totalGames.add(gameId));
          }
          return acc;
        },
        {
          name: team.name || "Unnamed Team",
          teamId: team.id,
          memberNames: memberStats.map((m) => m.name).filter(Boolean),
          grossStrokes: 0,
          grossHoles: 0,
          grossToPar: 0,
          netStrokes: 0,
          netHoles: 0,
          netToPar: 0,
          birdies: 0,
          pars: 0,
          firHits: 0,
          firOpportunities: 0,
          girHits: 0,
          girOpportunities: 0,
          totalPutts: 0,
          puttsHoles: 0,
          totalGames: new Set(),
        }
      );

      const gamesPlayed = aggregate.totalGames.size;

      return {
        ...aggregate,
        gamesPlayed,
        firPercentage:
          aggregate.firOpportunities > 0
            ? (aggregate.firHits / aggregate.firOpportunities) * 100
            : null,
        girPercentage:
          aggregate.girOpportunities > 0
            ? (aggregate.girHits / aggregate.girOpportunities) * 100
            : null,
        avgPutts:
          aggregate.puttsHoles > 0
            ? aggregate.totalPutts / aggregate.puttsHoles
            : null,
      };
    })
    .filter(Boolean);
};

const filterGamesByTournament = (games, tournamentId) =>
  (games || []).filter(
    (game) =>
      !!game &&
      (!tournamentId || game.tournamentId === tournamentId)
  );

export default function OverallTournamentStatsModal({
  tournamentId,
  initialGames = [],
  onClose,
}) {
  const [games, setGames] = useState(() =>
    filterGamesByTournament(initialGames, tournamentId)
  );
  const [hasFetchedAll, setHasFetchedAll] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(tournamentId));
  const [error, setError] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState(null);
  const [activeTab, setActiveTab] = useState("players");

  useEffect(() => {
    if (hasFetchedAll) return;
    setGames(filterGamesByTournament(initialGames, tournamentId));
  }, [initialGames, tournamentId, hasFetchedAll]);

  useEffect(() => {
    if (!tournamentId) {
      setGames([]);
      setHasFetchedAll(false);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setHasFetchedAll(false);
    setIsLoading(true);
    setError(null);

    const fetchGames = async () => {
      try {
        const allGamesQuery = query(
          collection(db, "games"),
          where("tournamentId", "==", tournamentId)
        );
        const snapshot = await getDocs(allGamesQuery);
        if (!isMounted) return;
        const fetchedGames = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setGames(fetchedGames);
        setHasFetchedAll(true);
      } catch (err) {
        console.error("Failed to load tournament games:", err);
        if (isMounted) {
          setError(err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchGames();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) {
      setActiveTab("players");
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) {
      setTeams([]);
      setTeamsLoading(false);
      setTeamsError(null);
      return;
    }

    let isMounted = true;
    setTeamsLoading(true);
    setTeamsError(null);

    fetchTeamsForTournament(tournamentId)
      .then((teamData) => {
        if (!isMounted) return;
        setTeams(Array.isArray(teamData) ? teamData : []);
      })
      .catch((err) => {
        console.error("Failed to load tournament teams:", err);
        if (isMounted) {
          setTeamsError(err);
        }
      })
      .finally(() => {
        if (isMounted) {
          setTeamsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  const playerStats = useMemo(() => computePlayerStats(games), [games]);
  const playerCategories = useMemo(
    () => buildCategories(playerStats),
    [playerStats]
  );
  const playerStatsMap = useMemo(() => {
    const map = new Map();
    playerStats.forEach((stat) => {
      if (stat?.userId) {
        map.set(stat.userId, stat);
      }
    });
    return map;
  }, [playerStats]);
  const teamStats = useMemo(
    () => buildTeamStats(teams, playerStatsMap),
    [teams, playerStatsMap]
  );
  const teamCategories = useMemo(
    () => buildCategories(teamStats),
    [teamStats]
  );
  const totalGames = games.length;

  const toggleCategory = (key) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const tabs = [
    { id: "players", label: "Players" },
    { id: "teams", label: "Teams" },
  ];
  const isPlayersTab = activeTab === "players";
  const categoriesToRender = isPlayersTab ? playerCategories : teamCategories;
  const hasCategoryEntries = categoriesToRender.some(
    (category) => category.fullEntries.length > 0
  );
  const isTabLoading =
    isLoading || (!isPlayersTab && teamsLoading && teamStats.length === 0);
  const noDataMessage = isPlayersTab
    ? "No player data yet for this tournament. Once players log scores, you'll see leaders here."
    : teams.length === 0
    ? "No teams have been created for this tournament yet."
    : "No team stats recorded yet. Have team members enter rounds with stats to populate this leaderboard.";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Overall Tournament Leaderboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tournamentId
                ? `${totalGames} game${
                    totalGames === 1 ? "" : "s"
                  } analyzed`
                : "Select a tournament to see overall stats"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl leading-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg px-2"
            aria-label="Close overall leaderboard modal"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!tournamentId && (
            <div className="text-center text-gray-600 dark:text-gray-300 py-12">
              Choose a tournament first to see the combined stats.
            </div>
          )}

          {tournamentId && (
            <>
              <div className="flex justify-center">
                <div className="inline-flex rounded-full bg-gray-100 dark:bg-gray-900/40 p-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                        activeTab === tab.id
                          ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
                  Failed to load some games for this tournament. Showing the games that are currently available.
                </div>
              )}

              {!isPlayersTab && teamsError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10 p-4 text-sm text-red-700 dark:text-red-300">
                  Failed to load teams for this tournament. Showing any existing data we have.
                </div>
              )}

              {isTabLoading && (
                <div className="py-12 flex flex-col items-center justify-center text-gray-600 dark:text-gray-300">
                  <div className="h-10 w-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
                  <p>
                    {isPlayersTab
                      ? "Crunching tournament-wide stats..."
                      : "Loading team stats..."}
                  </p>
                </div>
              )}

              {!isTabLoading && !hasCategoryEntries && (
                <div className="py-12 text-center text-gray-600 dark:text-gray-300">
                  {noDataMessage}
                </div>
              )}

              {!isTabLoading && hasCategoryEntries && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoriesToRender.map((category) => {
                      const isExpanded = !!expandedCategories[category.key];
                      const displayEntries = isExpanded
                        ? category.fullEntries
                        : category.entries;
                      const hasEntries = displayEntries.length > 0;
                      const secondaryEntries = displayEntries.slice(1);
                      const canExpand =
                        category.fullEntries.length > category.entries.length;

                      return (
                        <div
                          key={category.key}
                          className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                {category.title}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {category.subtitle}
                              </p>
                            </div>
                            {canExpand && (
                              <button
                                onClick={() => toggleCategory(category.key)}
                                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                              >
                                {isExpanded
                                  ? "Hide full list"
                                  : "View full leaderboard"}
                              </button>
                            )}
                          </div>

                          {!hasEntries ? (
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                              Not enough tracked data yet.
                            </p>
                          ) : (
                            <>
                              <div className="mt-4">
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                  {displayEntries[0].value}
                                </p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                  {displayEntries[0].player.name}
                                </p>
                                {displayEntries[0].player.memberNames &&
                                  displayEntries[0].player.memberNames.length >
                                    0 && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {displayEntries[0].player.memberNames.join(
                                        " • "
                                      )}
                                    </p>
                                  )}
                                {displayEntries[0].detail && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {displayEntries[0].detail}
                                  </p>
                                )}
                              </div>
                              {secondaryEntries.length > 0 && (
                                <div className="mt-4 border-t border-dashed border-gray-200 dark:border-gray-700 pt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {secondaryEntries.map((entry, idx) => (
                                    <div
                                      key={`${category.key}-${
                                        entry.player.userId ||
                                        entry.player.teamId ||
                                        entry.player.name
                                      }`}
                                      className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {idx + 2}. {entry.player.name}
                                        </span>
                                        {entry.player.memberNames &&
                                          entry.player.memberNames.length >
                                            0 && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              {entry.player.memberNames.join(
                                                " • "
                                              )}
                                            </span>
                                          )}
                                        {entry.detail && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {entry.detail}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {entry.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    *GIR/FIR percentages require at least{" "}
                    {MIN_PERCENTAGE_SAMPLES} tracked holes. Putting averages
                    require at least {MIN_PUTTS_SAMPLES} holes with recorded
                    putts.
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

