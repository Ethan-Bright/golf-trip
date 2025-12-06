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
import {
  fetchTeamsForTournament,
  getTournamentTeamRef,
  MAX_TEAM_SIZE,
  normalizeTeamPlayers,
  getTeamIdForTournament,
} from "../utils/teamService";
import PageShell from "../components/layout/PageShell";

export default function JoinTeam() {
  const { user } = useAuth();
  const { currentTournament } = useTournament();
  const navigate = useNavigate();
  const { modal, showConfirm, showInput, hideModal } = useModal();
  const [availableUsers, setAvailableUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  const getUserTournamentTeam = useCallback(
    (u) => getTeamIdForTournament(u, currentTournament),
    [currentTournament]
  );

  const fetchRoster = useCallback(async () => {
    if (!user?.uid || !currentTournament) {
      setAvailableUsers([]);
      setTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
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

      const usersWithoutTeam = allUsers.filter(
        (u) => !getUserTournamentTeam(u) && u.uid !== user.uid
      );

      setAvailableUsers(usersWithoutTeam);

      const teamsData = await fetchTeamsForTournament(currentTournament);
      setTeams(
        teamsData
          .map((team) => ({
            ...team,
            players: Array.isArray(team.players) ? team.players : [],
          }))
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            })
          )
      );
    } catch (error) {
      console.error("Error fetching roster:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, currentTournament, getUserTournamentTeam]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const buildPlayerPayload = (player) => ({
    uid: player?.uid || player?.id,
    displayName: player?.displayName || player?.name || "",
    handicap: player?.handicap ?? null,
    profilePictureUrl: player?.profilePictureUrl || null,
  });

  const removeTeam = async (teamId) => {
    if (!teamId || !currentTournament) return;
    const tournamentUsersQuery = query(
      collection(db, "users"),
      where("tournaments", "array-contains", currentTournament)
    );
    const snapshot = await getDocs(tournamentUsersQuery);
    const teammates = snapshot.docs.filter(
      (memberDoc) =>
        getTeamIdForTournament(memberDoc.data(), currentTournament) === teamId
    );
    await Promise.all(
      teammates.map((memberDoc) =>
        updateDoc(memberDoc.ref, {
          teamId: null,
          [`teamMemberships.${currentTournament}`]: null,
        })
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
      if (getUserTournamentTeam(currentUserData)) {
        showConfirm(
          "You are already in a team. Joining another team will remove you and your teammates from your current team. Continue?",
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
      const existingTeamForCurrent = getUserTournamentTeam(currentUserData);

      if (existingTeamForCurrent) {
        await removeTeam(existingTeamForCurrent);
      }

      const selectedUserTeamId = getUserTournamentTeam(selectedUser);
      const teamId =
        selectedUserTeamId ||
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

      if (!selectedUserTeamId) {
        await updateDoc(selectedUserRef, {
          teamId,
          [`teamMemberships.${currentTournament}`]: teamId,
        });
      }
      await updateDoc(currentUserRef, {
        teamId,
        [`teamMemberships.${currentTournament}`]: teamId,
      });

      const initialPlayers = [
        buildPlayerPayload(selectedUser),
        buildPlayerPayload(currentUserData),
      ];

      if (!teamSnapshot?.exists()) {
        await setDoc(teamRef, {
          name: teamName,
          tournamentId: currentTournament,
          players: initialPlayers,
          player1: initialPlayers[0] || null,
          player2: initialPlayers[1] || null,
          player3: null,
          createdAt: new Date(),
        });
      }

      setMessage(`You have successfully joined the team "${teamName}"!`);
      setCurrentUserData((prev) => ({ ...prev, teamId }));
      hideModal();
      await fetchRoster();
    } catch (error) {
      console.error("Error joining team:", error);
    }
  };

  const joinExistingTeam = (team) => {
    if (!currentUserData || !currentTournament) return;
    const alreadyOnTeam = getUserTournamentTeam(currentUserData) === team.id;
    if (alreadyOnTeam) {
      setMessage("You are already on this team.");
      return;
    }

    const currentSize = team.players?.length || 0;
    if (currentSize >= MAX_TEAM_SIZE) {
      setMessage("That team is already full.");
      return;
    }

    try {
      if (getUserTournamentTeam(currentUserData)) {
        showConfirm(
          "You are already in a team. Joining another team will remove you and your teammates from your current team. Continue?",
          "Confirm Team Change",
          () => proceedJoinExistingTeam(team),
          "Yes, Continue",
          "Cancel"
        );
      } else {
        proceedJoinExistingTeam(team);
      }
    } catch (error) {
      console.error("Error preparing to join existing team:", error);
    }
  };

  const proceedJoinExistingTeam = async (team) => {
    try {
      const teamRef = getTournamentTeamRef(currentTournament, team.id);
      if (!teamRef) return;

      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) {
        setMessage("That team no longer exists.");
        await fetchRoster();
        return;
      }

      const teamData = teamSnap.data();
      const normalizedPlayers = normalizeTeamPlayers(teamData);

      if (
        normalizedPlayers.some((player) => player.uid === currentUserData.uid)
      ) {
        setMessage("You are already on this team.");
        await fetchRoster();
        return;
      }

      if (normalizedPlayers.length >= MAX_TEAM_SIZE) {
        setMessage("That team is already full.");
        await fetchRoster();
        return;
      }

      const updatedPlayers = [
        ...normalizedPlayers,
        buildPlayerPayload(currentUserData),
      ].slice(0, MAX_TEAM_SIZE);

      await updateDoc(teamRef, {
        players: updatedPlayers,
        player1: updatedPlayers[0] || null,
        player2: updatedPlayers[1] || null,
        player3: updatedPlayers[2] || null,
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, "users", currentUserData.id), {
        teamId: team.id,
        [`teamMemberships.${currentTournament}`]: team.id,
      });

      setMessage(`You have joined "${teamData.name || "your new team"}"!`);
      setCurrentUserData((prev) => ({ ...prev, teamId: team.id }));
      hideModal();
      await fetchRoster();
    } catch (error) {
      console.error("Error joining existing team:", error);
    }
  };

  const leaveTeam = async () => {
    if (!currentUserData || !getUserTournamentTeam(currentUserData)) return;
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
      const currentTeamId = getUserTournamentTeam(currentUserData);
      if (currentTeamId) {
        await removeTeam(currentTeamId);
      }
      setMessage("You have left your team, and the team has been deleted.");
      await fetchRoster();
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

  const currentTeamId = getUserTournamentTeam(currentUserData);

  return (
    <PageShell
      title="Join a Team"
      description="Invite another golfer in your tournament to team up and start scoring together."
      backHref="/dashboard"
    >
      <div className="max-w-md mx-auto w-full">
        <div className="mobile-card p-6 space-y-6 border border-gray-200/70 dark:border-gray-700">
          {currentTeamId && (
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

          <div className="space-y-8">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                  Existing teams
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Up to {MAX_TEAM_SIZE} players per team
                </span>
              </div>
              {teams.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  No teams have been created yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => {
                    const teamPlayers = Array.isArray(team.players)
                      ? team.players
                      : [];
                    const openSlots = Math.max(
                      MAX_TEAM_SIZE - teamPlayers.length,
                      0
                    );
                    const isUsersTeam = currentTeamId === team.id;
                    const teamFull = teamPlayers.length >= MAX_TEAM_SIZE;

                    return (
                      <div
                        key={team.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600 space-y-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {team.name || "Unnamed Team"}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {teamPlayers.length} / {MAX_TEAM_SIZE} players
                            </p>
                          </div>
                          <button
                            onClick={() => joinExistingTeam(team)}
                            disabled={teamFull || isUsersTeam}
                            className={`px-4 py-2 rounded-xl font-semibold shadow focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                              teamFull || isUsersTeam
                                ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed focus:ring-transparent focus:ring-offset-0"
                                : "bg-green-600 dark:bg-green-500 text-white focus:ring-green-500 dark:focus:ring-green-400"
                            }`}
                          >
                            {isUsersTeam
                              ? "Your Team"
                              : teamFull
                              ? "Team Full"
                              : "Join Team"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {teamPlayers.map((player) => (
                            <div
                              key={player.uid || player.userId || player.id}
                              className="flex items-center gap-3 bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl shadow"
                            >
                              {player.profilePictureUrl ? (
                                <img
                                  src={player.profilePictureUrl}
                                  alt={player.displayName}
                                  className="w-10 h-10 rounded-xl object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                                  {player.displayName?.charAt(0) || "?"}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {player.displayName || "Unknown"}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                  HCP: {player.handicap ?? "—"}
                                </p>
                              </div>
                            </div>
                          ))}
                          {openSlots > 0 &&
                            Array.from({ length: openSlots }).map((_, idx) => (
                              <div
                                key={`open-${team.id}-${idx}`}
                                className="px-4 py-2 rounded-2xl border border-dashed border-gray-300 dark:border-gray-500 text-sm text-gray-500 dark:text-gray-300 flex items-center justify-center"
                              >
                                Open slot
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Invite a player to create a new team
              </h4>
              {availableUsers.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300 text-center">
                  Everyone in this tournament is already on a team.
                </p>
              ) : (
                <div className="space-y-3">
                  {availableUsers.map((u) => (
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
                            {u.displayName?.charAt(0) || "?"}
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
            </section>
          </div>
        </div>
      </div>
      <Modal {...modal} onClose={hideModal} />
    </PageShell>
  );
}
