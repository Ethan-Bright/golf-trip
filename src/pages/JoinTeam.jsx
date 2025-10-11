import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function JoinTeam() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const allUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const currentUser = allUsers.find((u) => u.uid === user.uid);
    setCurrentUserData(currentUser);

    const usersWithoutTeam = allUsers.filter(
      (u) => !u.teamId && u.uid !== user.uid
    );
    setUsers(usersWithoutTeam);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [user.uid]);
  // Helper function to remove a team
  const removeTeam = async (teamId) => {
    if (!teamId) return;

    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const allUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Find all members in the team
    const teammates = allUsers.filter((u) => u.teamId === teamId);

    // Set their teamId to null
    for (const member of teammates) {
      const memberRef = doc(db, "users", member.id);
      await updateDoc(memberRef, { teamId: null });
    }

    // Delete the team document
    const teamRef = doc(db, "teams", teamId);
    const teamSnapshot = await getDoc(teamRef);
    if (teamSnapshot.exists()) {
      await deleteDoc(teamRef);
    }
  };

  const joinTeam = async (selectedUser) => {
    if (!currentUserData) return;

    try {
      const currentUserRef = doc(db, "users", currentUserData.id);
      const selectedUserRef = doc(db, "users", selectedUser.id);

      // If the current user is already in a team, remove the old team
      if (currentUserData.teamId) {
        const proceed = window.confirm(
          "You are already in a team. Joining another team will remove you and your teammate from your current team. Continue?"
        );
        if (!proceed) {
          navigate("/dashboard");
          return;
        }

        // Remove old team and reset all members' teamId
        await removeTeam(currentUserData.teamId);
      }

      // Determine teamId for the new team
      const teamId = selectedUser.teamId || selectedUser.id;

      // Prompt for a team name if creating a new team
      let teamName = "";
      const teamRef = doc(db, "teams", teamId);
      const teamSnapshot = await getDoc(teamRef);
      if (!teamSnapshot.exists()) {
        teamName = window.prompt("Enter a name for your new team:");
        if (!teamName || teamName.trim() === "") {
          alert("Team name is required!");
          return;
        }
      }

      // Update selected user if they don't have a team
      if (!selectedUser.teamId) {
        await updateDoc(selectedUserRef, { teamId });
      }

      // Update current user
      await updateDoc(currentUserRef, { teamId });

      // Create new team document if it doesn’t exist
      if (!teamSnapshot.exists()) {
        await setDoc(teamRef, {
          name: teamName,
          player1: {
            uid: selectedUser.uid,
            displayName: selectedUser.displayName,
            handicap: selectedUser.handicap,
            profilePictureUrl: selectedUser.profilePictureUrl || null,
          },
          player2: {
            uid: currentUserData.uid,
            displayName: currentUserData.displayName,
            handicap: currentUserData.handicap,
            profilePictureUrl: currentUserData.profilePictureUrl || null,
          },
          createdAt: new Date(),
        });
      }

      setMessage(
        `You have successfully joined ${
          teamName || selectedUser.displayName
        }'s team!`
      );
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setCurrentUserData((prev) => ({ ...prev, teamId }));
    } catch (error) {
      console.error("Error joining team:", error);
    }
  };

  const leaveTeam = async () => {
    if (!currentUserData || !currentUserData.teamId) return;

    const confirmLeave = window.confirm(
      "Are you sure you want to leave your current team? Your teammate will also be removed."
    );
    if (!confirmLeave) return;

    try {
      await removeTeam(currentUserData.teamId);

      setMessage("You have left your team, and the team has been deleted.");
      await fetchUsers();
      setCurrentUserData((prev) => ({ ...prev, teamId: null }));
    } catch (error) {
      console.error("Error leaving team:", error);
    }
  };

  if (loading)
    return <p className="text-green-800 text-center mt-10">Loading users...</p>;

  return (
    <div className="flex flex-col items-center min-h-screen bg-green-100 p-6">
      <h2 className="text-3xl sm:text-4xl font-extrabold text-green-900 mb-6">
        Join a Team
      </h2>

      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full mb-4 py-3 bg-gray-300 text-green-900 rounded-xl font-semibold shadow hover:bg-gray-400 transition"
        >
          Back to Dashboard
        </button>

        {currentUserData && currentUserData.teamId && (
          <button
            onClick={leaveTeam}
            className="w-full mb-4 py-3 bg-red-500 text-white rounded-xl font-semibold shadow hover:bg-red-600 transition"
          >
            Leave Current Team
          </button>
        )}

        {message && (
          <div className="mb-4 p-4 bg-green-200 text-green-900 rounded-xl shadow text-center font-medium">
            {message}
          </div>
        )}

        {users.length === 0 ? (
          <p className="text-green-900 text-center mt-4">
            No users available to join.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row items-center justify-between bg-green-50 p-4 rounded-xl shadow hover:shadow-md transition gap-4"
              >
                <div className="flex items-center gap-3">
                  {u.profilePictureUrl ? (
                    <img
                      src={u.profilePictureUrl}
                      alt={u.displayName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-xl">
                      {u.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-green-900 text-lg">
                      {u.displayName}
                    </p>
                    <p className="text-green-800 text-sm">HCP: {u.handicap}</p>
                  </div>
                </div>
                <button
                  onClick={() => joinTeam(u)}
                  className="mt-3 sm:mt-0 px-5 py-2 bg-green-700 text-white rounded-xl font-semibold shadow hover:bg-green-800 transition"
                >
                  Join Team
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
