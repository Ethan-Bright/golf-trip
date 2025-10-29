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
import { useTournament } from "../context/TournamentContext";
import { useNavigate } from "react-router-dom";
import { Modal, useModal } from "../components/Modal";

export default function JoinTeam() {
  const { user } = useAuth();
  const { currentTournament } = useTournament();
  const navigate = useNavigate();
  const { modal, showConfirm, showInput, hideModal } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const fetchUsers = async () => {
    if (!user?.uid || !currentTournament) return;

    setLoading(true);
    
    try {
      // Fetch all users from the main users collection
      const usersRef = collection(db, "users");
      const snapshot = await getDocs(usersRef);
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const currentUser = allUsers.find((u) => u.uid === user.uid);
      setCurrentUserData(currentUser);

      // Fetch tournament members from the tournament's members subcollection
      const membersRef = collection(
        db,
        "tournaments",
        currentTournament,
        "members"
      );
      const membersSnapshot = await getDocs(membersRef);
      const tournamentMemberUids = membersSnapshot.docs.map((doc) => doc.id);

      // Filter users to only show those in the current tournament who don't have a team
      const usersWithoutTeam = allUsers.filter(
        (u) => tournamentMemberUids.includes(u.uid) && !u.teamId && u.uid !== user.uid
      );
      
      setUsers(usersWithoutTeam);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid && currentTournament) fetchUsers();
  }, [user?.uid, currentTournament]);

  const removeTeam = async (teamId) => {
    if (!teamId) return;
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);
    const allUsers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const teammates = allUsers.filter((u) => u.teamId === teamId);
    for (const member of teammates) {
      const memberRef = doc(db, "users", member.id);
      await updateDoc(memberRef, { teamId: null });
    }
    const teamRef = doc(db, "teams", teamId);
    const teamSnapshot = await getDoc(teamRef);
    if (teamSnapshot.exists()) await deleteDoc(teamRef);
  };

  const joinTeam = async (selectedUser) => {
    if (!currentUserData) return;
    try {
      if (currentUserData.teamId) {
        showConfirm(
          "You are already in a team. Joining another team will remove you and your teammate from your current team. Continue?",
          "Confirm Team Change",
          () => proceedWithJoin(selectedUser),
          "Yes, Continue",
          "Cancel"
        );
      } else {
        proceedWithJoin(selectedUser);
      }
    } catch (error) {
      console.error("Error in joinTeam:", error);
    }
  };

  const proceedWithJoin = async (selectedUser) => {
    try {
      const currentUserRef = doc(db, "users", currentUserData.id);
      const selectedUserRef = doc(db, "users", selectedUser.id);

      if (currentUserData.teamId) {
        await removeTeam(currentUserData.teamId);
      }

      const teamId = selectedUser.teamId || selectedUser.id;
      const teamRef = doc(db, "teams", teamId);
      const teamSnapshot = await getDoc(teamRef);

      let teamName = "";
      if (!teamSnapshot.exists()) {
        try {
          teamName = await showInput("Enter Team Name");
        } catch {
          console.log("Team name input cancelled.");
          return;
        }
      } else {
        teamName = teamSnapshot.data().name;
      }

      if (!selectedUser.teamId) {
        await updateDoc(selectedUserRef, { teamId });
      }
      await updateDoc(currentUserRef, { teamId });

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

      setMessage(`You have successfully joined the team "${teamName}"!`);
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
      setCurrentUserData((prev) => ({ ...prev, teamId }));
      hideModal();
    } catch (error) {
      console.error("Error joining team:", error);
    }
  };

  const leaveTeam = async () => {
    if (!currentUserData || !currentUserData.teamId) return;
    showConfirm(
      "Are you sure you want to leave your current team? Your teammate will also be removed.",
      "Leave Team",
      () => proceedWithLeave(),
      "Yes, Leave",
      "Cancel"
    );
  };

  const proceedWithLeave = async () => {
    try {
      await removeTeam(currentUserData.teamId);
      setMessage("You have left your team, and the team has been deleted.");
      await fetchUsers();
      setCurrentUserData((prev) => ({ ...prev, teamId: null }));
      hideModal();
    } catch (error) {
      console.error("Error leaving team:", error);
    }
  };

  if (!user || loading)
    return (
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-200 dark:border-green-700 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 p-6">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-8 px-4 py-2 text-gray-600 dark:text-gray-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
            Join a Team
          </h2>

          {currentUserData?.teamId && (
            <button
              onClick={leaveTeam}
              className="w-full mb-4 py-3 bg-red-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Leave Current Team
            </button>
          )}

          {message && (
            <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-center font-medium">
              {message}
            </div>
          )}

          {users.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300 text-center mt-4">
              No users available to join.
            </p>
          ) : (
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl shadow-lg gap-4"
                >
                  <div className="flex items-center gap-3">
                    {u.profilePictureUrl ? (
                      <img
                        src={u.profilePictureUrl}
                        alt={u.displayName}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-lg">
                        {u.displayName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {u.displayName}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        HCP: {u.handicap}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => joinTeam(u)}
                    className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Join Team
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal {...modal} onClose={hideModal} />
    </div>
  );
}
