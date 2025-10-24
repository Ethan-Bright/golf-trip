import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from "firebase/firestore";
import LeaderboardComponent from "../components/Leaderboard";

export default function Leaderboard({ tournamentId }) {
  const [game, setGame] = useState(null);
  const [allGames, setAllGames] = useState([]);
  const [filteredGames, setFilteredGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const userDropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadAllGames() {
      // Load all games for the dropdown (increased limit for better filtering)
      const q = query(
        collection(db, "games"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllGames(games);
      setFilteredGames(games);
      
      // Set default selected game
      if (games.length > 0) {
        const defaultGame = games[0]; // Most recent game
        setSelectedGameId(defaultGame.id);
        setGame(defaultGame);
      }
    }
    
    if (tournamentId) {
      // If tournamentId is provided via props, use it
      const loadSpecificGame = async () => {
        const gdoc = await getDoc(doc(db, "games", tournamentId));
        if (gdoc.exists()) {
          setGame({ id: tournamentId, ...gdoc.data() });
          setSelectedGameId(tournamentId);
        }
      };
      loadSpecificGame();
    } else {
      loadAllGames();
    }
  }, [tournamentId]);

  // Filter games based on search term, users, and format
  useEffect(() => {
    let filtered = allGames;

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
      filtered = filtered.filter(game => 
        game.matchFormat?.toLowerCase() === selectedFormat.toLowerCase()
      );
    }

    setFilteredGames(filtered);
  }, [allGames, searchTerm, selectedUsers, selectedFormat]);

  // Update game when selectedGameId changes
  useEffect(() => {
    if (selectedGameId && filteredGames.length > 0) {
      const selectedGame = filteredGames.find(g => g.id === selectedGameId);
      if (selectedGame) {
        setGame(selectedGame);
      }
    }
  }, [selectedGameId, filteredGames]);

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
    allGames.forEach(game => {
      if (game.matchFormat) {
        formats.add(game.matchFormat);
      }
    });
    return Array.from(formats);
  };

  const handleGameSelect = (gameId) => {
    setSelectedGameId(gameId);
    setIsDropdownOpen(false);
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
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!game)
    return (
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl"
          >
            ← Back to Dashboard
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Active Games</h3>
            <p className="text-gray-600 dark:text-gray-300">Create a game first to view the leaderboard</p>
          </div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl"
        >
          ← Back to Dashboard
        </button>

        {/* Filter Controls */}
        {allGames.length > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filter Games</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
              >
                Clear Filters
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Game Names
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search game names..."
                className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Multi-Select User Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Players ({selectedUsers.length} selected)
                </label>
                <div className="relative" ref={userDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 text-left flex items-center justify-between"
                  >
                    <span>
                      {selectedUsers.length === 0 
                        ? 'All Players' 
                        : selectedUsers.length === 1 
                          ? getUniqueUsers().find(u => u.userId === selectedUsers[0])?.name || 'Selected Player'
                          : `${selectedUsers.length} players selected`
                      }
                    </span>
                    <svg className={`w-5 h-5 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isUserDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {getUniqueUsers().map(user => (
                        <button
                          key={user.userId}
                          onClick={() => toggleUser(user.userId)}
                          className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center ${
                            selectedUsers.includes(user.userId) 
                              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 border-2 rounded mr-3 flex items-center justify-center ${
                              selectedUsers.includes(user.userId)
                                ? 'border-green-500 bg-green-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {selectedUsers.includes(user.userId) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
                
                {/* Selected Users Display */}
                {selectedUsers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedUsers.map(userId => {
                      const user = getUniqueUsers().find(u => u.userId === userId);
                      return (
                        <span
                          key={userId}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                        >
                          {user?.name || 'Unknown'}
                          <button
                            onClick={() => toggleUser(userId)}
                            className="ml-1 hover:text-green-600 dark:hover:text-green-400"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Format Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Format
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                >
                  <option value="">All Formats</option>
                  {getUniqueFormats().map(format => (
                    <option key={format} value={format}>
                      {format.charAt(0).toUpperCase() + format.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Searchable Game Selection Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Game ({filteredGames.length} games)
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 text-left flex items-center justify-between"
                >
                  <span>
                    {game ? `${game.name} - ${game.course?.name || 'Unknown Course'}` : 'Select a game'}
                  </span>
                  <svg className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {filteredGames.length === 0 ? (
                      <div className="p-3 text-gray-500 dark:text-gray-400 text-center">
                        No games found matching your filters
                      </div>
                    ) : (
                      filteredGames.map(game => (
                        <button
                          key={game.id}
                          onClick={() => handleGameSelect(game.id)}
                          className={`w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                            selectedGameId === game.id ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          <div className="font-medium">{game.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {game.course?.name || 'Unknown Course'} • {game.matchFormat || 'Unknown Format'}
                            {game.createdAt && (
                              <span> • {new Date(game.createdAt.seconds * 1000).toLocaleDateString()}</span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Game Header */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{game.name}</h2>
          <p className="text-lg font-medium text-green-600 dark:text-green-400 mb-1">
            {game.course?.name || 'Unknown Course'}
          </p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Match Format: {game.matchFormat || 'Unknown Format'}
          </p>
          {game.createdAt && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(game.createdAt.seconds * 1000).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Leaderboard Section */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-8">
          <LeaderboardComponent game={game} />
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm">
          Golf Tournament Tracker
        </div>
      </div>
    </div>
  );
}
