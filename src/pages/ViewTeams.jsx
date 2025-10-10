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
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-green-700 mb-6 text-center">
        Current Teams
      </h2>

      {teams.length === 0 ? (
        <p className="text-center mt-6 text-gray-500">
          No teams have been created yet.
        </p>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="p-4 bg-green-50 rounded-xl flex flex-wrap justify-center sm:justify-start items-center gap-6 shadow-sm"
            >
              {/* Player 1 */}
              <div className="flex flex-col items-center">
                {team.player1.profilePictureUrl ? (
                  <img
                    src={team.player1.profilePictureUrl}
                    alt={team.player1.displayName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-lg">
                    {team.player1.displayName.charAt(0)}
                  </div>
                )}
                <span className="font-medium text-green-800 mt-1 text-center">
                  {team.player1.displayName} (HCP: {team.player1.handicap})
                </span>
              </div>

              {/* vs separator */}
              <span className="text-gray-500 font-bold text-lg">and</span>

              {/* Player 2 */}
              {team.player2 ? (
                <div className="flex flex-col items-center">
                  {team.player2.profilePictureUrl ? (
                    <img
                      src={team.player2.profilePictureUrl}
                      alt={team.player2.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-lg">
                      {team.player2.displayName.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium text-green-800 mt-1 text-center">
                    {team.player2.displayName} (HCP: {team.player2.handicap})
                  </span>
                </div>
              ) : (
                <span className="text-gray-500 font-semibold">
                  Waiting for a partner
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center mt-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 bg-green-700 text-white font-semibold rounded-xl shadow hover:bg-green-800 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
