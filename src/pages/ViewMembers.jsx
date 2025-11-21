import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTournament } from "../context/TournamentContext";
import { useAuth } from "../context/AuthContext";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PageShell from "../components/layout/PageShell";

export default function ViewMembers() {
  const navigate = useNavigate();
  const { currentTournament } = useTournament();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // mode: "tournament" | "search"
  const [mode, setMode] = useState("tournament");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [allUsers, setAllUsers] = useState(null);

  // Selected user scores modal
  const [selectedMember, setSelectedMember] = useState(null);
  const [scoresModalOpen, setScoresModalOpen] = useState(false);
  const [memberRounds, setMemberRounds] = useState([]);
  const [memberRoundsLoading, setMemberRoundsLoading] = useState(false);
  const [memberRoundsError, setMemberRoundsError] = useState("");

  // Round details (hole-by-hole) modal
  const [selectedRound, setSelectedRound] = useState(null);
  const [roundDetailsOpen, setRoundDetailsOpen] = useState(false);
  const userUid = user?.uid;
  const userDisplayName = user?.displayName;
  const userHandicap = user?.handicap;
  const userProfilePictureUrl = user?.profilePictureUrl;

  // Fetch current tournament members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!currentTournament) {
        setLoading(false);
        setError("No tournament selected");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const membersRef = collection(
          db,
          "tournaments",
          currentTournament,
          "members"
        );
        const querySnapshot = await getDocs(membersRef);

        const membersData = querySnapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: data.uid || docSnap.id,
            displayName: data.displayName || "Unknown",
            handicap: data.handicap || null,
            profilePictureUrl: data.profilePictureUrl || null,
            joinedAt: data.joinedAt || data.createdAt || null,
            createdAt: data.createdAt || null,
          };
        });

        // Ensure current user is present in members list
        if (userUid) {
          const currentUserInMembers = membersData.find(
            (m) => m.id === userUid || m.uid === userUid
          );

          if (!currentUserInMembers) {
            try {
              const userRef = doc(db, "users", userUid);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                const userData = userSnap.data();
                const memberData = {
                  uid: userUid,
                  displayName:
                    userData.displayName || userDisplayName || "Unknown",
                  handicap: userData.handicap || userHandicap || null,
                  profilePictureUrl:
                    userData.profilePictureUrl ||
                    userProfilePictureUrl ||
                    null,
                  joinedAt: new Date(),
                };

                await setDoc(
                  doc(
                    db,
                    "tournaments",
                    currentTournament,
                    "members",
                    userUid
                  ),
                  memberData
                );

                membersData.push({
                  id: userUid,
                  uid: userUid,
                  displayName: memberData.displayName,
                  handicap: memberData.handicap,
                  profilePictureUrl: memberData.profilePictureUrl,
                  joinedAt: memberData.joinedAt,
                  createdAt: null,
                });
              }
            } catch (err) {
              console.error("Error adding current user to members:", err);
            }
          }
        }

        membersData.sort((a, b) => {
          const nameA = a.displayName || "";
          const nameB = b.displayName || "";
          return nameA.localeCompare(nameB);
        });

        setMembers(membersData);
      } catch (err) {
        console.error("Error fetching members:", err);
        setError(
          "Failed to load members: " + (err.message || "Unknown error")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [
    currentTournament,
    userUid,
    userDisplayName,
    userHandicap,
    userProfilePictureUrl,
  ]);

  // Search all users collection by displayName (client-side filter with caching)
  const searchUsers = async (rawQuery) => {
    const queryText = rawQuery.trim().toLowerCase();

    if (!queryText) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchError("");

      let usersList = allUsers;

      // Fetch all users once and cache them
      if (!usersList) {
        const usersRef = collection(db, "users");
        const snapshot = await getDocs(usersRef);

        usersList = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            uid: docSnap.id,
            displayName: data.displayName || "Unknown",
            handicap: data.handicap || null,
            profilePictureUrl: data.profilePictureUrl || null,
          };
        });

        setAllUsers(usersList);
      }

      const filtered = usersList.filter((u) =>
        (u.displayName || "").toLowerCase().includes(queryText)
      );

      filtered.sort((a, b) => {
        const nameA = a.displayName || "";
        const nameB = b.displayName || "";
        return nameA.localeCompare(nameB);
      });

      setSearchResults(filtered);
    } catch (err) {
      console.error("Error searching users:", err);
      setSearchError(
        "Failed to search users: " + (err.message || "Unknown error")
      );
    } finally {
      setSearchLoading(false);
    }
  };

  // Fetch previous scores for a specific user (similar to MyStats but parameterized)
  const fetchMemberRounds = async (member) => {
    if (!member?.uid) return;

    setSelectedMember(member);
    setScoresModalOpen(true);
    setMemberRounds([]);
    setMemberRoundsError("");
    setMemberRoundsLoading(true);

    try {
      const gamesRef = collection(db, "games");
      const snapshot = await getDocs(gamesRef);

      let gamesData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Sort by createdAt desc
      gamesData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.createdAt || 0;
        const bTime = b.createdAt?.seconds || b.createdAt || 0;
        return bTime - aTime;
      });

      // Limit to 100 most recent
      gamesData = gamesData.slice(0, 100);

      const userRounds = gamesData
        .filter((game) => {
          const player = game.players?.find((p) => p.userId === member.uid);
          if (!player) return false;
          return player.trackStats ?? game.trackStats ?? false;
        })
        .map((game) => {
          const player = game.players.find((p) => p.userId === member.uid);
          if (!player) return null;

          const startIndex = game.nineType === "back" ? 9 : 0;
          const endIndex =
            game.holeCount === 9
              ? startIndex + 9
              : game.course?.holes?.length || 18;
          const playerScores = (player.scores || []).slice(
            startIndex,
            endIndex
          );

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
            course: game.course || null,
            date: game.createdAt?.seconds
              ? new Date(game.createdAt.seconds * 1000).toLocaleDateString()
              : "Unknown",
            holesPlayed,
            totalPutts,
            avgPutts: avgPutts.toFixed(2),
            firCount,
            firPercentage: firPercentage.toFixed(1),
            girCount,
            girPercentage: girPercentage.toFixed(1),
            scores: playerScores,
            startIndex,
            holeCount: game.holeCount,
          };
        })
        .filter(Boolean);

      setMemberRounds(userRounds);
    } catch (err) {
      console.error("Error fetching member rounds:", err);
      setMemberRoundsError(
        "Failed to load scores: " + (err.message || "Unknown error")
      );
    } finally {
      setMemberRoundsLoading(false);
    }
  };

  const handleViewStats = (member) => {
    const targetUid = member?.uid || member?.id;
    if (!targetUid) return;
    navigate(`/my-stats?userId=${encodeURIComponent(targetUid)}`);
  };

  return (
    <>
      <PageShell
        title="View Members"
        description="Switch between your current tournament roster or search all golfers."
        backHref="/dashboard"
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("tournament")}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl border ${
                mode === "tournament"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600"
              }`}
            >
              Current Tournament
            </button>
            <button
              onClick={() => setMode("search")}
              className={`flex-1 py-2 text-sm font-semibold rounded-xl border ${
                mode === "search"
                  ? "bg-green-600 text-white border-green-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600"
              }`}
            >
              Search Users
            </button>
          </div>

          <div className="mobile-card p-4 sm:p-6 border border-gray-200/70 dark:border-gray-700">
            {mode === "tournament" ? (
              <>
                {loading ? (
                  <LoadingSkeleton
                    items={4}
                    lines={3}
                    showAvatar
                    cardClassName="bg-gray-50 dark:bg-gray-700/60"
                  />
                ) : error ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-center text-sm">
                    {error}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center text-gray-600 dark:text-gray-300">
                      <span className="text-sm font-semibold">
                        {members.length} member{members.length !== 1 ? "s" : ""} registered
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-700 flex-shrink-0">
                            {member.profilePictureUrl ? (
                              <img
                                src={member.profilePictureUrl}
                                alt={member.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 flex items-center justify-center">
                                <span className="text-lg text-white font-bold">
                                  {member.displayName?.charAt(0) || "?"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {member.displayName}
                            </h3>
                            <div className="space-y-1 mt-1 text-xs text-gray-600 dark:text-gray-300">
                              <div>
                                <span className="font-medium">Handicap:</span>{" "}
                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                  {member.handicap || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium">Joined:</span>{" "}
                                {(() => {
                                  const date = member.joinedAt || member.createdAt;
                                  if (!date) return "—";
                                  try {
                                    if (date.seconds) {
                                      return new Date(date.seconds * 1000).toLocaleDateString();
                                    }
                                    if (date.toDate && typeof date.toDate === "function") {
                                      return date.toDate().toLocaleDateString();
                                    }
                                    return new Date(date).toLocaleDateString();
                                  } catch {
                                    return "—";
                                  }
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 flex flex-col gap-2">
                            <button
                              onClick={() => fetchMemberRounds(member)}
                              className="px-3 py-2 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              View Scores
                            </button>
                            <button
                              onClick={() => handleViewStats(member)}
                              className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              View Stats
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {members.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-2 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm6-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm0 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No Members Yet</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-xs">Be the first to register for the tournament!</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSearchQuery(value);
                      searchUsers(value);
                    }}
                    placeholder="Search users by name..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
                  />
                  <button
                    type="button"
                    className="px-4 py-2 text-sm font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                    disabled={searchLoading}
                    onClick={() => searchUsers(searchQuery)}
                  >
                    {searchLoading ? "Searching..." : "Search"}
                  </button>
                </div>

                {searchError && (
                  <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs">
                    {searchError}
                  </div>
                )}

                <div className="space-y-3">
                  {searchResults.length > 0 && (
                    <div className="text-center text-gray-600 dark:text-gray-300 text-xs">
                      Found {searchResults.length} user{searchResults.length !== 1 ? "s" : ""}
                    </div>
                  )}

                  {searchLoading && searchResults.length === 0 ? (
                    <LoadingSkeleton items={4} lines={2} showAvatar cardClassName="bg-gray-50 dark:bg-gray-700/60" />
                  ) : (
                    <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
                      {searchResults.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-green-200 dark:border-green-700 flex-shrink-0">
                            {member.profilePictureUrl ? (
                              <img
                                src={member.profilePictureUrl}
                                alt={member.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 dark:from-green-500 dark:to-green-700 flex items-center justify-center">
                                <span className="text-lg text-white font-bold">
                                  {member.displayName?.charAt(0) || "?"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {member.displayName}
                            </h3>
                            <div className="space-y-1 mt-1 text-xs text-gray-600 dark:text-gray-300">
                              <div>
                                <span className="font-medium">Handicap:</span>{" "}
                                <span className="text-green-600 dark:text-green-400 font-semibold">
                                  {member.handicap || "—"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex-shrink-0 flex flex-col gap-2">
                            <button
                              onClick={() => fetchMemberRounds(member)}
                              className="px-3 py-2 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                            >
                              View Scores
                            </button>
                            <button
                              onClick={() => handleViewStats(member)}
                              className="px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              View Stats
                            </button>
                          </div>
                        </div>
                      ))}

                      {!searchLoading && searchResults.length === 0 && searchQuery.trim().length > 0 && (
                        <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-300">
                          No users found matching "{searchQuery.trim()}".
                        </div>
                      )}

                      {!searchLoading && searchQuery.trim().length === 0 && (
                        <div className="text-center py-6 text-xs text-gray-500 dark:text-gray-300">
                          Enter a name above to search all users.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </PageShell>

      {/* Member Scores Modal */}
      {scoresModalOpen && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Previous Scores
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {selectedMember.displayName}
                </p>
              </div>
              <button
                onClick={() => {
                  setScoresModalOpen(false);
                  setSelectedMember(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {memberRoundsLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mb-2"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Loading scores...
                  </p>
                </div>
              ) : memberRoundsError ? (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm text-center">
                  {memberRoundsError}
                </div>
              ) : memberRounds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No previous scores found for this player.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {memberRounds.map((round) => (
                    <div
                      key={round.gameId}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div>
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                            {round.gameName}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                            {round.courseName} • {round.date} •{" "}
                            {round.holesPlayed} holes
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Avg Putts
                          </div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">
                            {round.avgPutts}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">
                            FIR%
                          </div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">
                            {round.firPercentage}%
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-500">
                            ({round.firCount}/{round.holesPlayed})
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">
                            GIR%
                          </div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">
                            {round.girPercentage}%
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-500">
                            ({round.girCount}/{round.holesPlayed})
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">
                            Total Putts
                          </div>
                          <div className="text-base font-semibold text-gray-900 dark:text-white">
                            {round.totalPutts}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedRound(round);
                            setRoundDetailsOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setScoresModalOpen(false);
                  setSelectedMember(null);
                }}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm sm:text-base transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Details Modal (hole-by-hole) */}
      {roundDetailsOpen && selectedRound && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-60">
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Round Details
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {selectedRound.gameName} • {selectedRound.courseName} •{" "}
                  {selectedRound.date}
                </p>
              </div>
              <button
                onClick={() => {
                  setRoundDetailsOpen(false);
                  setSelectedRound(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
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

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {(!selectedRound.scores || selectedRound.scores.length === 0) ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No hole-by-hole data available for this round.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRound.scores.map((score, index) => {
                    if (
                      !score ||
                      score.gross === null ||
                      score.gross === undefined
                    ) {
                      return null;
                    }

                    const holeNumber =
                      (selectedRound.startIndex || 0) + index + 1;
                    const courseHoles = selectedRound.course?.holes || [];
                    const holeInfo = courseHoles.find(
                      (h) => h.holeNumber === holeNumber
                    );

                    const par =
                      holeInfo?.par ?? score.par ?? score.expectedPar ?? null;
                    const relation =
                      par !== null ? score.gross - par : null;

                    const yardage =
                      holeInfo?.yards ||
                      holeInfo?.yardage ||
                      holeInfo?.distance ||
                      null;
                    const strokeIndex = holeInfo?.strokeIndex;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-xs font-semibold text-green-700 dark:text-green-300">
                            {holeNumber}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              Score: {score.gross}
                            </div>
                            <div className="text-[11px] text-gray-600 dark:text-gray-300">
                              Putts: {score.putts ?? 0} • FIR:{" "}
                              {score.fir ? "Yes" : "No"} • GIR:{" "}
                              {score.gir ? "Yes" : "No"}
                            </div>
                            {holeInfo && (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Par {holeInfo.par}
                                {yardage
                                  ? ` • ${yardage} yds`
                                  : ""}
                                {typeof strokeIndex === "number"
                                  ? ` • SI ${strokeIndex}`
                                  : ""}
                              </div>
                            )}
                          </div>
                        </div>
                        {par !== null && (
                          <div className="text-right">
                            <div className="text-xs font-semibold text-gray-900 dark:text-white">
                              {relation > 0
                                ? `+${relation}`
                                : relation === 0
                                ? "Par"
                                : relation}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setRoundDetailsOpen(false);
                  setSelectedRound(null);
                }}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm sm:text-base transition-colors"
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
