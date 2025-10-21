import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { courses } from "../data/courses";

export default function ViewMembers() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [showScoresModal, setShowScoresModal] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const membersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        membersData.sort((a, b) => a.displayName.localeCompare(b.displayName));
        setMembers(membersData);
      } catch (err) {
        setError("Failed to load members");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const handleViewScores = (member) => {
    setSelectedMember(member);
    setShowScoresModal(true);
  };

  const handleCloseScoresModal = () => {
    setSelectedMember(null);
    setShowScoresModal(false);
  };

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-4 relative overflow-hidden">
      {/* Swish Background Effect */}
      <div className="absolute inset-0 opacity-20 dark:opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-5 w-72 h-72 bg-gradient-to-br from-green-400 to-green-600 rounded-full blur-3xl transform -rotate-12"></div>
          <div className="absolute top-24 right-10 w-64 h-64 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full blur-3xl transform rotate-12"></div>
          <div className="absolute bottom-10 left-1/4 w-60 h-60 bg-gradient-to-br from-green-300 to-yellow-500 rounded-full blur-3xl transform rotate-45"></div>
          <div className="absolute bottom-5 right-1/3 w-56 h-56 bg-gradient-to-br from-yellow-300 to-green-500 rounded-full blur-3xl transform -rotate-30"></div>
        </div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl shadow-md border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 transition-all duration-200 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Tournament Members
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            All registered participants
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300 text-sm">
                Loading members...
              </span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-center text-sm">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-gray-600 dark:text-gray-300 mb-4">
                <span className="text-sm font-semibold">
                  {members.length} member{members.length !== 1 ? "s" : ""}{" "}
                  registered
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Profile Picture */}
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

                    {/* Member Info */}
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
                          {member.createdAt
                            ? new Date(
                                member.createdAt.seconds * 1000
                              ).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {/* View Scores Button */}
                    <button
                      onClick={() => handleViewScores(member)}
                      className="px-3 py-1 bg-green-600 dark:bg-green-500 text-white rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200"
                    >
                      View All Scores
                    </button>
                  </div>
                ))}
              </div>

              {members.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 4c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-2 14c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm6-8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm-6 0c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2zm0 8c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    No Members Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-xs">
                    Be the first to register for the tournament!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="text-center text-gray-500 dark:text-gray-400 text-xs mt-6">
          Golf Trip Leaderboard
        </footer>
      </div>

      {/* User Scores Modal */}
      {showScoresModal && selectedMember && (
        <UserScoresModal
          member={selectedMember}
          onClose={handleCloseScoresModal}
        />
      )}
    </div>
  );
}

// User Scores Modal Component (mobile-friendly)
function UserScoresModal({ member, onClose }) {
  const [games, setGames] = useState([]);
  const [selectedGameId, setSelectedGameId] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, "games"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const gamesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setGames(gamesData);
        if (gamesData.length > 0) setSelectedGameId(gamesData[0].id);
      } catch (err) {
        setError("Failed to load games");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, []);

  useEffect(() => {
    if (selectedGameId && games.length > 0) {
      const game = games.find((g) => g.id === selectedGameId);
      setSelectedGame(game);
    }
  }, [selectedGameId, games]);

  const course = selectedGame
    ? courses.find((c) => c.id === selectedGame.courseId)
    : null;
  const playerData = selectedGame?.players?.find((p) => p.userId === member.id);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {member.displayName} - Scores
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 text-2xl p-1 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 rounded-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300 text-sm">
                Loading games...
              </span>
            </div>
          ) : error ? (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm text-center">
              {error}
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7H3v2h16V4z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                No Games Found
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs">
                No games have been created yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Game Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Game
                </label>
                <select
                  value={selectedGameId}
                  onChange={(e) => setSelectedGameId(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                >
                  {games.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name} - {game.course?.name || "Unknown"} -{" "}
                      {game.createdAt
                        ? new Date(
                            game.createdAt.seconds * 1000
                          ).toLocaleDateString()
                        : "Unknown"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scorecard */}
              {selectedGame && playerData && course && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700 text-left">
                        <th className="p-2 text-gray-700 dark:text-gray-300">
                          Hole
                        </th>
                        <th className="p-2 text-gray-700 dark:text-gray-300">
                          Par
                        </th>
                        <th className="p-2 text-gray-700 dark:text-gray-300">
                          SI
                        </th>
                        <th className="p-2 text-gray-700 dark:text-gray-300">
                          Gross
                        </th>
                        <th className="p-2 text-gray-700 dark:text-gray-300">
                          Net
                        </th>
                        <th className="p-2 text-gray-700 dark:text-gray-300">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.holes.map((hole, index) => {
                        const score = playerData.scores?.[index];
                        const gross = score?.gross || 0;
                        const net = score?.net || 0;
                        const points =
                          net > 0 ? Math.max(0, hole.par + 2 - net) : 0;

                        return (
                          <tr
                            key={index}
                            className="border-b border-gray-200 dark:border-gray-700"
                          >
                            <td className="p-2 font-medium text-gray-900 dark:text-white">
                              {index + 1}
                            </td>
                            <td className="p-2 text-gray-600 dark:text-gray-300">
                              {hole.par}
                            </td>
                            <td className="p-2 text-gray-600 dark:text-gray-300">
                              {hole.strokeIndex}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-white">
                              {gross || "-"}
                            </td>
                            <td className="p-2">
                              {net > 0 ? (
                                <div className="inline-block px-2 py-0.5 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold border border-green-300 dark:border-green-700">
                                  {net}
                                </div>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center font-semibold text-green-600 dark:text-green-400">
                              {points > 0 ? points : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-center mt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
