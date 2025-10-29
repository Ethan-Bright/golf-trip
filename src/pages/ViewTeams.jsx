import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function ViewTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTeams() {
      setLoading(true);
      const teamSnapshot = await getDocs(collection(db, "teams"));
      const teamsData = teamSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTeams(teamsData);
      setLoading(false);
    }

    fetchTeams();
  }, []);

  if (loading) return <p className="text-center mt-6">Loading teams...</p>;

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 sm:mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl text-sm sm:text-base"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-4 sm:mb-6">
            Current Teams
          </h2>

          {teams.length === 0 ? (
            <p className="text-center mt-4 sm:mt-6 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
              No teams have been created yet.
            </p>
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-2xl shadow-lg"
                >
                  {/* Team name */}
                  <h3 className="text-center text-gray-900 dark:text-white font-bold text-lg sm:text-xl mb-3 sm:mb-4">
                    {team.name}
                  </h3>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                    {/* Player 1 */}
                    <div className="flex flex-col items-center">
                      {team.player1.profilePictureUrl ? (
                        <img
                          src={team.player1.profilePictureUrl}
                          alt={team.player1.displayName}
                          className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                          {team.player1.displayName.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white mt-2 text-center text-sm sm:text-base">
                        {team.player1.displayName}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">HCP: {team.player1.handicap}</span>
                    </div>

                    {/* vs separator */}
                    <span className="text-gray-500 dark:text-gray-400 font-bold text-base sm:text-lg">and</span>

                    {/* Player 2 */}
                    {team.player2 ? (
                      <div className="flex flex-col items-center">
                        {team.player2.profilePictureUrl ? (
                          <img
                            src={team.player2.profilePictureUrl}
                            alt={team.player2.displayName}
                            className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                            {team.player2.displayName.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900 dark:text-white mt-2 text-center text-sm sm:text-base">
                          {team.player2.displayName}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm">HCP: {team.player2.handicap}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 font-semibold text-sm sm:text-base">
                        Waiting for a partner
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
