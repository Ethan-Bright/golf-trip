import React, { useState, useEffect, useCallback } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import useModal from "../hooks/useModal";
import { getTournamentTeamRef } from "../utils/teamService";
import PageShell from "../components/layout/PageShell";

export default function JoinTeam() {
  const { user } = useAuth();
  const { currentTournament } = useTournament();
  const navigate = useNavigate();
  const { modal, showConfirm, showInput, hideModal } = useModal();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const fetchUsers = useCallback(async () => {
    if (!user?.uid || !currentTournament) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      // Fetch users that belong to the current tournament
      const usersRef = collection(db, "users");
      const usersQuery = query(
        usersRef,
        where("tournaments", "array-contains", currentTournament)
      );
      const snapshot = await getDocs(usersQuery);
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const currentUser = allUsers.find((u) => u.uid === user.uid);
      setCurrentUserData(currentUser);

      // Filter users to only show those in the current tournament who don't have a team
      const usersWithoutTeam = allUsers.filter(
        (u) => !u.teamId && u.uid !== user.uid
      );
      
      setUsers(usersWithoutTeam);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, currentTournament]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const removeTeam = async (teamId) => {
    if (!teamId || !currentTournament) return;
    const teammatesQuery = query(
      collection(db, "users"),
      where("teamId", "==", teamId)
    );
    const snapshot = await getDocs(teammatesQuery);
    await Promise.all(
      snapshot.docs.map((memberDoc) =>
        updateDoc(memberDoc.ref, { teamId: null })
      )
    );

    const teamRef = getTournamentTeamRef(currentTournament, teamId);
    if (teamRef) {
      await deleteDoc(teamRef).catch(() => {});
    }
    await deleteDoc(doc(db, "teams", teamId)).catch(() => {});
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

      const teamId =
        selectedUser.teamId ||
        `team_${currentTournament}_${selectedUser.id}_${Date.now()}`;
      const teamRef = getTournamentTeamRef(currentTournament, teamId);
      const teamSnapshot = teamRef ? await getDoc(teamRef) : null;

      let teamName = "";
      if (!teamSnapshot?.exists()) {
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

      if (!teamSnapshot?.exists()) {
        await setDoc(teamRef, {
          name: teamName,
          tournamentId: currentTournament,
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
      <PageShell title="Join a Team" description="Pair up with another golfer in your tournament." backHref="/dashboard">
        <div className="mobile-card p-8 text-center">
          <div className="w-10 h-10 border-4 border-green-200 dark:border-green-700 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </PageShell>
    );

  return (
    <PageShell
      title="Join a Team"
      description="Invite another golfer in your tournament to team up and start scoring together."
      backHref="/dashboard"
    >
      <div className="max-w-md mx-auto w-full">
        <div className="mobile-card p-6 space-y-6 border border-gray-200/70 dark:border-gray-700">
          {currentUserData?.teamId && (
            <button
              onClick={leaveTeam}
              className="w-full mb-2 py-3 bg-red-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Leave Current Team
            </button>
          )}

          {message && (
            <div className="p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl text-center font-medium">
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
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl shadow gap-4"
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
                      <p className="font-semibold text-gray-900 dark:text-white">{u.displayName}</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">HCP: {u.handicap}</p>
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
    </PageShell>
  );
}
