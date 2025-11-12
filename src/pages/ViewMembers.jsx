import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useTournament } from "../context/TournamentContext";
import { useAuth } from "../context/AuthContext";

export default function ViewMembers() {
  const navigate = useNavigate();
  const { currentTournament } = useTournament();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        
        // Fetch members from the tournament's members subcollection
        const membersRef = collection(
          db,
          "tournaments",
          currentTournament,
          "members"
        );
        const querySnapshot = await getDocs(membersRef);
        
        const membersData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id, // This is the user's uid
            uid: data.uid || doc.id, // Ensure uid is set
            displayName: data.displayName || "Unknown",
            handicap: data.handicap || null,
            profilePictureUrl: data.profilePictureUrl || null,
            joinedAt: data.joinedAt || data.createdAt || null,
            createdAt: data.createdAt || null,
          };
        });
        
        // Check if current user is in the members list
        if (user?.uid) {
          const currentUserInMembers = membersData.find(
            (m) => m.id === user.uid || m.uid === user.uid
          );
          
          // If current user is not in members subcollection, add them
          if (!currentUserInMembers) {
            try {
              // Get fresh user data from Firestore
              const userRef = doc(db, "users", user.uid);
              const userSnap = await getDoc(userRef);
              
              if (userSnap.exists()) {
                const userData = userSnap.data();
                const memberData = {
                  uid: user.uid,
                  displayName: userData.displayName || user.displayName || "Unknown",
                  handicap: userData.handicap || user.handicap || null,
                  profilePictureUrl: userData.profilePictureUrl || user.profilePictureUrl || null,
                  joinedAt: new Date(),
                };
                
                // Add to members subcollection
                await setDoc(
                  doc(db, "tournaments", currentTournament, "members", user.uid),
                  memberData
                );
                
                // Add to members list
                membersData.push({
                  id: user.uid,
                  uid: user.uid,
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
        
        // Sort by display name
        membersData.sort((a, b) => {
          const nameA = a.displayName || "";
          const nameB = b.displayName || "";
          return nameA.localeCompare(nameB);
        });
        
        setMembers(membersData);
      } catch (err) {
        console.error("Error fetching members:", err);
        setError("Failed to load members: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [currentTournament, user?.uid]);

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
    </div>
  );
}
