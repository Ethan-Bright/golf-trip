import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, startAfter, onSnapshot } from "firebase/firestore";
import LeaderboardComponent from "../components/Leaderboard";
import AchievementsModal from "../components/AchievementsModal";
import RoundStatsModal from "../components/RoundStatsModal";
import OverallTournamentStatsModal from "../components/OverallTournamentStatsModal";
import { useTournament } from "../context/TournamentContext";
import PageShell from "../components/layout/PageShell";
import {
  getMatchFormatLabel,
  normalizeMatchFormat,
} from "../lib/matchFormats";

const PAGE_SIZE = 25;

export default function Leaderboard({ tournamentId }) {
  const { currentTournament } = useTournament();
  const [game, setGame] = useState(null);
  const [allGames, setAllGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isPlayerFilterDropdownOpen, setIsPlayerFilterDropdownOpen] = useState(false);
  const [isFormatFilterDropdownOpen, setIsFormatFilterDropdownOpen] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRoundStats, setShowRoundStats] = useState(false);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [hasMoreGames, setHasMoreGames] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [showOverallStats, setShowOverallStats] = useState(false);
  const lastGameDocRef = useRef(null);
  const dropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const playerFilterDropdownRef = useRef(null);
  const formatFilterDropdownRef = useRef(null);
  const navigate = useNavigate();
  const activeTournamentId = currentTournament || game?.tournamentId || null;
  const shellProps = {
    title: "Leaderboard",
    description:
      "Filter every game, format, and player to see how the trip is tracking.",
    backHref: "/dashboard",
    backText: "Dashboard",
    bodyClassName: "space-y-6",
  };

  const loadGames = useCallback(
    async (reset = false) => {
      if (!currentTournament) return;

      setIsLoadingGames(true);
      if (reset) {
        setLoadError(null);
      }
      try {
        const constraints = [
          where("tournamentId", "==", currentTournament),
          orderBy("createdAt", "desc"),
        ];

        if (!reset && lastGameDocRef.current) {
          constraints.push(startAfter(lastGameDocRef.current));
        }

        constraints.push(limit(PAGE_SIZE));

        const gamesQuery = query(collection(db, "games"), ...constraints);
        const snapshot = await getDocs(gamesQuery);
        const games = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        setAllGames((prev) => (reset ? games : [...prev, ...games]));
        lastGameDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
        setHasMoreGames(snapshot.size === PAGE_SIZE);

        if (reset) {
          if (games.length > 0) {
            const defaultGame = games[0];
            setSelectedGameId(defaultGame.id);
            setGame(defaultGame);
          } else {
            setSelectedGameId(null);
            setGame(null);
          }
        }
      } catch (error) {
        console.error("Error loading games:", error);
        setLoadError(error);
      } finally {
        setIsLoadingGames(false);
      }
    },
    [currentTournament]
  );

  useEffect(() => {
    if (tournamentId) {
      const loadSpecificGame = async () => {
        setIsLoadingGames(true);
        try {
          const gdoc = await getDoc(doc(db, "games", tournamentId));
          if (gdoc.exists()) {
            setGame({ id: tournamentId, ...gdoc.data() });
            setSelectedGameId(tournamentId);
          }
        } finally {
          setIsLoadingGames(false);
        }
      };
      loadSpecificGame();
      return;
    }

    setAllGames([]);
    setFilteredGames([]);
    setSelectedGameId(null);
    setGame(null);
    lastGameDocRef.current = null;
    setHasMoreGames(false);
    setLoadError(null);

    if (currentTournament) {
      loadGames(true);
    }
  }, [tournamentId, currentTournament, loadGames]);

  // Filter games based on search term, users, and format
  useEffect(() => {
    let filtered = allGames;

    // Filter by current tournament (extra safety check)
    if (currentTournament) {
      filtered = filtered.filter(game => game.tournamentId === currentTournament);
    }

    // Filter by search term (game name)
    if (searchTerm) {
      filtered = filtered.filter(game => 
        game.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by users (check if any selected user is in players)
    if (selectedUsers.length > 0) {
      filtered = filtered.filter(game => 
        selectedUsers.some(userId => 
          game.players?.some(player => player.userId === userId)
        )
      );
    }

    // Filter by format
    if (selectedFormat) {
      filtered = filtered.filter(
        (game) => normalizeMatchFormat(game.matchFormat) === selectedFormat
      );
    }

    setFilteredGames(filtered);
  }, [allGames, searchTerm, selectedUsers, selectedFormat, currentTournament]);

  // Update game when filters change
  useEffect(() => {
    if (filteredGames.length === 0) {
      setGame(null);
      return;
    }

    const selectedGame = filteredGames.find((g) => g.id === selectedGameId);
    if (selectedGame) {
      setGame(selectedGame);
    } else {
      const defaultGame = filteredGames[0];
      setSelectedGameId(defaultGame.id);
      setGame(defaultGame);
    }
  }, [filteredGames, selectedGameId]);

  // Live-update the currently selected game so scores entered by other players
  // appear in real time without a manual refresh.
  useEffect(() => {
    if (!selectedGameId) return undefined;
    const unsub = onSnapshot(
      doc(db, "games", selectedGameId),
      (snap) => {
        if (!snap.exists()) return;
        const fresh = { id: snap.id, ...snap.data() };
        setGame((prev) => (prev?.id === fresh.id ? fresh : prev));
        setAllGames((prev) =>
          prev.map((g) => (g.id === fresh.id ? fresh : g))
        );
      },
      (error) => console.error("Error syncing selected game:", error)
    );
    return () => unsub();
  }, [selectedGameId]);

  // Get unique users from all games
  const getUniqueUsers = () => {
    const users = new Map();
    allGames.forEach(game => {
      game.players?.forEach(player => {
        if (!users.has(player.userId)) {
          users.set(player.userId, player.name);
        }
      });
    });
    return Array.from(users.entries()).map(([userId, name]) => ({ userId, name }));
  };

  // Get unique formats from all games
  const getUniqueFormats = () => {
    const formats = new Set();
    allGames.forEach((game) => {
      const normalized = normalizeMatchFormat(game.matchFormat);
      if (normalized) {
        formats.add(normalized);
      }
    });
    return Array.from(formats).sort((a, b) =>
      getMatchFormatLabel(a).localeCompare(getMatchFormatLabel(b))
    );
  };

  // Get games filtered by selected users only
  const getGamesByPlayers = () => {
    if (selectedUsers.length === 0) return [];
    
    return allGames.filter(game => {
      if (currentTournament && game.tournamentId !== currentTournament) return false;
      return selectedUsers.some(userId => 
        game.players?.some(player => player.userId === userId)
      );
    });
  };

  // Get games filtered by selected format only
  const getGamesByFormat = () => {
    if (!selectedFormat) return [];
    
    return allGames.filter((game) => {
      if (currentTournament && game.tournamentId !== currentTournament)
        return false;
      return normalizeMatchFormat(game.matchFormat) === selectedFormat;
    });
  };

  const handleGameSelect = (gameId) => {
    setSelectedGameId(gameId);
    setIsDropdownOpen(false);
    setIsPlayerFilterDropdownOpen(false);
    setIsFormatFilterDropdownOpen(false);
  };

  const toggleUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedUsers([]);
    setSelectedFormat("");
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
      if (playerFilterDropdownRef.current && !playerFilterDropdownRef.current.contains(event.target)) {
        setIsPlayerFilterDropdownOpen(false);
      }
      if (formatFilterDropdownRef.current && !formatFilterDropdownRef.current.contains(event.target)) {
        setIsFormatFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!tournamentId && !currentTournament) {
    return (
      <PageShell {...shellProps}>
        <div className="mobile-card p-8 text-center border border-dashed border-brand-500/40">
            <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-strong)] mb-2">
              Select a Tournament
            </h3>
            <p className="text-[var(--text-muted)] text-sm sm:text-base">
              Choose a tournament from the dashboard to view its games.
            </p>
          </div>
      </PageShell>
    );
  }

  if (!game && isLoadingGames)
    return (
      <PageShell {...shellProps}>
        <div className="mobile-card p-8 text-center">
          <div className="inline-flex h-10 w-10 items-center justify-center mx-auto">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500/30 border-t-brand-500"></div>
          </div>
          <p className="mt-4 text-[var(--text-muted)]">Loading games...</p>
        </div>
      </PageShell>
    );

  if (!game) {
    if (loadError) {
      const needsIndex =
        loadError.code === "failed-precondition" &&
        /query requires an index/i.test(loadError.message || "");

      return (
        <PageShell {...shellProps}>
          <div className="mobile-card p-6 border border-red-500/40">
              <h3 className="text-lg sm:text-xl font-semibold text-red-500 mb-2">
                Unable to load games
              </h3>
              <p className="text-[var(--text-muted)] text-sm sm:text-base mb-4 break-words">
                {needsIndex
                ? "Firestore needs a composite index for the games query (tournamentId + createdAt). Create it using the suggestion below, then refresh."
                  : loadError.message}
              </p>
              {needsIndex && (
                <div className="text-xs sm:text-sm bg-red-500/10 text-red-500 rounded-xl p-4 space-y-2">
                  <p className="font-semibold">Steps to create the index:</p>
                  <ol className="list-decimal ml-5 space-y-1">
                    <li>Open Firebase Console → Firestore Database → Indexes.</li>
                    <li>
                      Create a composite index for the `games` collection with:
                      <span className="block font-mono mt-1">tournamentId (Ascending)</span>
                      <span className="block font-mono">createdAt (Descending)</span>
                    </li>
                    <li>Wait for the index to finish building (takes ~1–2 minutes).</li>
                    <li>Reload this page; games will appear automatically.</li>
                  </ol>
                </div>
              )}
            </div>
        </PageShell>
      );
    }

    return (
      <PageShell {...shellProps}>
        <div className="mobile-card p-8 text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-500/15 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-brand-600 dark:text-brand-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
          <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-strong)] mb-2">
            No Active Games
          </h3>
          <p className="text-[var(--text-muted)] text-sm sm:text-base">
            Create a game first to view the leaderboard.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell {...shellProps} showBackButton={false}>
      <div className="max-w-4xl mx-auto w-full">
        <button
          onClick={() => navigate("/dashboard")}
          className="btn btn-ghost btn-sm mb-6 sm:mb-8"
        >
          ← Back to Dashboard
        </button>

        {allGames.length > 1 && (
          <div className="card p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-[var(--text-strong)]">
                Filter Games
              </h3>
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-brand-600 dark:text-brand-300 hover:text-brand-700 font-medium"
              >
                Clear Filters
              </button>
            </div>

            <div className="relative mb-3 sm:mb-4" ref={dropdownRef}>
              <label className="field-label">
                Select Game ({filteredGames.length} games)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(!isDropdownOpen);
                    setSearchTerm("");
                  }}
                  className="input text-left flex items-center justify-between"
                >
                  <span>
                    {game
                      ? `${game.name} - ${game.course?.name || "Unknown Course"}`
                      : "Select a game"}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 card border border-[var(--surface-card-border)] overflow-hidden">
                    <div className="p-2 border-b border-[var(--surface-card-border)]">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Type to search game names..."
                        className="input text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {filteredGames.length === 0 ? (
                        <div className="p-3 text-[var(--text-muted)] text-center">
                          No games found matching your filters
                        </div>
                      ) : (
                        filteredGames.map((gameItem) => (
                          <button
                            key={gameItem.id}
                            onClick={() => handleGameSelect(gameItem.id)}
                            className={`w-full p-3 text-left hover:bg-brand-500/5 transition-colors ${
                              selectedGameId === gameItem.id
                                ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                                : "text-[var(--text-strong)]"
                            }`}
                          >
                            <div className="font-medium">{gameItem.name}</div>
                            <div className="text-sm text-[var(--text-muted)]">
                              {gameItem.course?.name || "Unknown Course"} • {getMatchFormatLabel(gameItem.matchFormat)}
                              {gameItem.createdAt && (
                                <span>
                                  {" "}
                                  • {new Date(gameItem.createdAt.seconds * 1000).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div>
                <label className="field-label">
                  Filter by Players ({selectedUsers.length} selected)
                </label>
                <div className="relative" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="input text-left flex items-center justify-between"
                  >
                    <span>
                      {selectedUsers.length === 0
                        ? "All Players"
                        : selectedUsers.length === 1
                        ? getUniqueUsers().find((u) => u.userId === selectedUsers[0])?.name || "Selected Player"
                        : `${selectedUsers.length} players selected`}
                    </span>
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        isUserDropdownOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 card border border-[var(--surface-card-border)] max-h-60 overflow-y-auto">
                      {getUniqueUsers().map((user) => (
                        <button
                          key={user.userId}
                          onClick={() => toggleUser(user.userId)}
                          className={`w-full p-3 text-left hover:bg-brand-500/5 transition-colors flex items-center ${
                            selectedUsers.includes(user.userId)
                              ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                              : "text-[var(--text-strong)]"
                          }`}
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                                selectedUsers.includes(user.userId)
                                  ? "border-brand-500 bg-brand-500"
                                  : "border-[var(--surface-card-border)]"
                              }`}
                            >
                              {selectedUsers.includes(user.userId) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                            <span>{user.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUsers.map((userId) => {
                      const user = getUniqueUsers().find((u) => u.userId === userId);
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-500/15 text-brand-600 dark:text-brand-300"
                        >
                          {user?.name || "Unknown"}
                          <button
                            onClick={() => toggleUser(userId)}
                            className="ml-1 hover:text-brand-700 dark:hover:text-brand-300"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {selectedUsers.length > 0 && (
                  <div className="mt-3 relative" ref={playerFilterDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsPlayerFilterDropdownOpen(!isPlayerFilterDropdownOpen)}
                      className="input text-left flex items-center justify-between text-sm"
                    >
                      <span>
                        {getGamesByPlayers().length} game{getGamesByPlayers().length !== 1 ? "s" : ""} with selected
                        players
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isPlayerFilterDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isPlayerFilterDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 card border border-[var(--surface-card-border)] max-h-60 overflow-y-auto">
                        {getGamesByPlayers().length === 0 ? (
                          <div className="p-3 text-[var(--text-muted)] text-center text-sm">No games found</div>
                        ) : (
                          getGamesByPlayers().map((gameItem) => (
                            <button
                              key={gameItem.id}
                              onClick={() => handleGameSelect(gameItem.id)}
                              className={`w-full p-3 text-left hover:bg-brand-500/5 transition-colors ${
                                selectedGameId === gameItem.id
                                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                                  : "text-[var(--text-strong)]"
                              }`}
                            >
                              <div className="font-medium text-sm">{gameItem.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {gameItem.course?.name || "Unknown Course"} • {getMatchFormatLabel(gameItem.matchFormat)}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="field-label">
                  Filter by Format
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="select"
                >
                  <option value="">All Formats</option>
                  {getUniqueFormats().map((format) => (
                    <option key={format} value={format}>
                      {getMatchFormatLabel(format)}
                    </option>
                  ))}
                </select>

                {selectedFormat && (
                  <div className="mt-3 relative" ref={formatFilterDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsFormatFilterDropdownOpen(!isFormatFilterDropdownOpen)}
                      className="input text-left flex items-center justify-between text-sm"
                    >
                      <span>
                        {getGamesByFormat().length} game{getGamesByFormat().length !== 1 ? "s" : ""} with this format
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isFormatFilterDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isFormatFilterDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 card border border-[var(--surface-card-border)] max-h-60 overflow-y-auto">
                        {getGamesByFormat().length === 0 ? (
                          <div className="p-3 text-[var(--text-muted)] text-center text-sm">No games found</div>
                        ) : (
                          getGamesByFormat().map((gameItem) => (
                            <button
                              key={gameItem.id}
                              onClick={() => handleGameSelect(gameItem.id)}
                              className={`w-full p-3 text-left hover:bg-brand-500/5 transition-colors ${
                                selectedGameId === gameItem.id
                                  ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                                  : "text-[var(--text-strong)]"
                              }`}
                            >
                              <div className="font-medium text-sm">{gameItem.name}</div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {gameItem.course?.name || "Unknown Course"} • {getMatchFormatLabel(gameItem.matchFormat)}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {hasMoreGames && !tournamentId && (
          <div className="mb-6 text-center">
            <button
              onClick={() => loadGames(false)}
              disabled={isLoadingGames}
              className="btn btn-primary"
            >
              {isLoadingGames ? "Loading..." : "Load More Games"}
            </button>
          </div>
        )}

        <div className="card p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-[var(--text-strong)] mb-2">{game.name}</h2>
          <p className="text-lg font-medium text-brand-600 dark:text-brand-300 mb-1">
            {game.course?.name || "Unknown Course"}
          </p>
          <p className="text-sm font-medium text-[var(--text-muted)] mb-2">
            Match Format: {getMatchFormatLabel(game.matchFormat)}
          </p>
          {game.createdAt && (
            <p className="text-sm text-[var(--text-muted)] mb-3">
              {new Date(game.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <button
              onClick={() => setShowOverallStats(true)}
              disabled={!activeTournamentId}
              className={`btn ${
                activeTournamentId
                  ? "bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white"
                  : "btn-secondary cursor-not-allowed"
              }`}
            >
              🏁 View Overall Leaderboard
            </button>
            <button
              onClick={() => setShowAchievements(true)}
              className="btn bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white"
            >
              🏆 View Achievements
            </button>
            {!game.isFunGame && game.players?.some((p) => p.trackStats ?? game.trackStats) && (
              <button
                onClick={() => setShowRoundStats(true)}
                className="btn bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
              >
                📊 View Round Stats
              </button>
            )}
          </div>
        </div>

        <div className="card p-6 mb-8">
          <LeaderboardComponent game={game} />
        </div>

        {showOverallStats && (
          <OverallTournamentStatsModal
            tournamentId={activeTournamentId}
            initialGames={allGames}
            onClose={() => setShowOverallStats(false)}
          />
        )}

        {showAchievements && (
          <AchievementsModal game={game} onClose={() => setShowAchievements(false)} />
        )}

        {showRoundStats && <RoundStatsModal game={game} onClose={() => setShowRoundStats(false)} />}

        <div className="text-center text-[var(--text-muted)] text-sm">
          Golf Tournament Tracker
        </div>
      </div>
    </PageShell>
  );
}
