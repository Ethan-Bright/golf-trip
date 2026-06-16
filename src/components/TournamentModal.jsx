import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, getDocs, query, where, collection, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs";
import SearchableTournamentDropdown from "./SearchableTournamentDropdown";

export default function TournamentModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { currentTournament, setTournament } = useTournament();
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [userTournamentIds, setUserTournamentIds] = useState([]); // Store user's tournament IDs from Firestore
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [mode, setMode] = useState("menu"); // 'menu', 'create', 'join', 'edit'
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [tournamentToLeave, setTournamentToLeave] = useState(null);
  const [tournamentToEdit, setTournamentToEdit] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTournaments();
      fetchAllTournaments();
    }
  }, [isOpen, currentTournament]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      
      // First, get fresh data from Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const userData = userSnapshot.data();
      const userTournaments = userData?.tournaments || [];
      
      // Store user's tournament IDs for filtering
      setUserTournamentIds(userTournaments);
      
      if (!userTournaments || userTournaments.length === 0) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      // Also check if we have a current tournament but it's not in the array
      if (currentTournament && !userTournaments.includes(currentTournament)) {
        await setDoc(userRef, {
          tournaments: [...userTournaments, currentTournament]
        }, { merge: true });
        userTournaments.push(currentTournament);
        setUserTournamentIds(userTournaments);
      }

      const tournamentData = await Promise.all(
        userTournaments.map(async (tournamentId) => {
          const tournamentRef = doc(db, "tournaments", tournamentId);
          const tournamentSnap = await getDoc(tournamentRef);
          if (tournamentSnap.exists()) {
            return {
              id: tournamentId,
              ...tournamentSnap.data(),
            };
          }
          return null;
        })
      );
      setTournaments(tournamentData.filter(Boolean));
      setLoading(false);
    } catch (err) {
      console.error("Error fetching tournaments:", err);
      setLoading(false);
    }
  };

  const fetchAllTournaments = async () => {
    try {
      const tournamentsRef = collection(db, "tournaments");
      const snapshot = await getDocs(tournamentsRef);
      setAllTournaments(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    } catch (err) {
      console.error("Error fetching all tournaments:", err);
    }
  };

  const handleCreateTournament = async () => {
    setMode("create");
  };

  const createTournament = async (tournamentName, password) => {
    if (!user?.uid) return;

    try {
      if (!tournamentName || !password) {
        setError("Please fill in all fields");
        return;
      }

      if (password.length < 4) {
        setError("Password must be at least 4 characters");
        return;
      }

      // Check if tournament name already exists
      const tournamentsRef = collection(db, "tournaments");
      const q = query(tournamentsRef, where("name", "==", tournamentName));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Tournament name already exists");
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create tournament
      const tournamentId = `${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const tournamentData = {
        name: tournamentName,
        password: hashedPassword,
        createdBy: user.uid,
        createdAt: new Date(),
        memberCount: 1,
      };

      await setDoc(doc(db, "tournaments", tournamentId), tournamentData);

      // Add user to tournament members
      await setDoc(
        doc(db, "tournaments", tournamentId, "members", user.uid),
        {
          uid: user.uid,
          displayName: user.displayName,
          handicap: user.handicap,
          profilePictureUrl: user.profilePictureUrl,
          joinedAt: new Date(),
        }
      );

      // Update user to have joined this tournament
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const currentTournaments = userSnapshot.data()?.tournaments || [];
      
      await setDoc(
        userRef,
        {
          tournaments: [...currentTournaments, tournamentId],
        },
        { merge: true }
      );

      // Set as current tournament
      setTournament(tournamentId);
      await refreshUser();
      onClose();
    } catch (err) {
      console.error("Error creating tournament:", err);
      setError(err.message || "Failed to create tournament");
    }
  };

  const handleJoinTournament = async () => {
    // Refresh user's tournament IDs to ensure we have latest data
    if (user?.uid) {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);
        const userData = userSnapshot.data();
        const userTournaments = userData?.tournaments || [];
        setUserTournamentIds(userTournaments);
      } catch (err) {
        console.error("Error refreshing user tournaments:", err);
      }
    }
    setMode("join");
  };

  const selectTournament = () => {
    setShowSelectionModal(true);
  };

  const handleJoinWithPassword = async (tournamentId, password) => {
    if (!user?.uid) return;

    try {
      const selectedTournament = allTournaments.find((t) => t.id === tournamentId);
      if (!selectedTournament) {
        setError("Tournament not found");
        return;
      }

      // Verify password
      const match = await bcrypt.compare(password, selectedTournament.password);
      if (!match) {
        setError("Incorrect password");
        return;
      }

      // Add user to tournament members
      await setDoc(
        doc(db, "tournaments", tournamentId, "members", user.uid),
        {
          uid: user.uid,
          displayName: user.displayName,
          handicap: user.handicap,
          profilePictureUrl: user.profilePictureUrl,
          joinedAt: new Date(),
        }
      );

      // Update tournament member count
      await setDoc(
        doc(db, "tournaments", tournamentId),
        {
          memberCount: (selectedTournament.memberCount || 0) + 1,
        },
        { merge: true }
      );

      // Update user to have joined this tournament
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const currentTournaments = userSnapshot.data()?.tournaments || [];
      
      if (!currentTournaments.includes(tournamentId)) {
        const updatedTournaments = [...currentTournaments, tournamentId];
        await setDoc(
          userRef,
          {
            tournaments: updatedTournaments,
          },
          { merge: true }
        );
        // Update local state with fresh tournament IDs
        setUserTournamentIds(updatedTournaments);
      }

      // Set as current tournament
      setTournament(tournamentId);
      await refreshUser();
      onClose();
    } catch (err) {
      console.error("Error joining tournament:", err);
      setError(err.message || "Failed to join tournament");
    }
  };

  const handleEditTournamentSubmit = async (updatedName, newPassword) => {
    if (!user?.uid || !tournamentToEdit) return;

    const trimmedName = updatedName?.trim();
    if (!trimmedName) {
      setError("Tournament name cannot be empty");
      return;
    }

    try {
      setIsSavingEdit(true);
      setError("");

      const tournamentRef = doc(db, "tournaments", tournamentToEdit.id);
      const tournamentSnap = await getDoc(tournamentRef);

      if (!tournamentSnap.exists()) {
        throw new Error("Tournament not found");
      }

      const tournamentData = tournamentSnap.data();
      if (tournamentData.createdBy !== user.uid) {
        throw new Error("Only the creator can edit this tournament");
      }

      if (trimmedName !== tournamentData.name) {
        const tournamentsRef = collection(db, "tournaments");
        const q = query(tournamentsRef, where("name", "==", trimmedName));
        const querySnapshot = await getDocs(q);
        const hasConflict = querySnapshot.docs.some(
          (docSnap) => docSnap.id !== tournamentToEdit.id
        );

        if (hasConflict) {
          throw new Error("Another tournament already uses that name");
        }
      }

      const updates = { name: trimmedName };

      if (newPassword) {
        if (newPassword.length < 4) {
          throw new Error("Password must be at least 4 characters");
        }
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      await setDoc(tournamentRef, updates, { merge: true });

      await fetchTournaments();
      await fetchAllTournaments();
      setTournamentToEdit(null);
      setMode("menu");
    } catch (err) {
      console.error("Error updating tournament:", err);
      setError(err.message || "Failed to update tournament");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!user?.uid || !tournamentToDelete) return;

    const tournamentId = tournamentToDelete.id;

    try {
      setIsDeletingTournament(true);
      setError("");

      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);

      if (!tournamentSnap.exists()) {
        throw new Error("Tournament not found");
      }

      const tournamentData = tournamentSnap.data();
      if (tournamentData.createdBy !== user.uid) {
        throw new Error("Only the creator can delete this tournament");
      }

      // Remove members and update each user's tournament list
      const membersRef = collection(db, "tournaments", tournamentId, "members");
      const membersSnap = await getDocs(membersRef);
      const memberIds = membersSnap.docs.map((docSnap) => docSnap.id);

      await Promise.all(membersSnap.docs.map((memberDoc) => deleteDoc(memberDoc.ref)));

      await Promise.all(
        memberIds.map(async (memberId) => {
          const userRef = doc(db, "users", memberId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const tournaments = userSnap.data()?.tournaments || [];
            const updated = tournaments.filter((tid) => tid !== tournamentId);
            await setDoc(
              userRef,
              {
                tournaments: updated,
              },
              { merge: true }
            );
          }
        })
      );

      // Remove any team documents inside the tournament
      const teamsRef = collection(db, "tournaments", tournamentId, "teams");
      const teamsSnap = await getDocs(teamsRef);
      await Promise.all(teamsSnap.docs.map((teamDoc) => deleteDoc(teamDoc.ref)));

      await deleteDoc(tournamentRef);

      const updatedUserTournamentIds = userTournamentIds.filter((id) => id !== tournamentId);
      setUserTournamentIds(updatedUserTournamentIds);

      setShowDeleteConfirm(false);
      setTournamentToDelete(null);

      await fetchTournaments();
      await fetchAllTournaments();

      if (currentTournament === tournamentId) {
        if (updatedUserTournamentIds.length > 0) {
          const nextTournamentId =
            updatedUserTournamentIds[updatedUserTournamentIds.length - 1];
          setTournament(nextTournamentId);
          await refreshUser();
          onClose();
        } else {
          setTournament(null);
          await refreshUser();
          onClose();
          navigate("/tournament-select");
        }
      }
    } catch (err) {
      console.error("Error deleting tournament:", err);
      setError(err.message || "Failed to delete tournament");
    } finally {
      setIsDeletingTournament(false);
    }
  };

  const handleLeaveTournament = async (tournamentId) => {
    if (!user?.uid) {
      setError("Not logged in");
      return;
    }

    try {
      // Remove user from tournament members
      const memberRef = doc(db, "tournaments", tournamentId, "members", user.uid);
      await deleteDoc(memberRef);
      
      // Get current member count
      const tournamentRef = doc(db, "tournaments", tournamentId);
      const tournamentSnap = await getDoc(tournamentRef);
      
      if (tournamentSnap.exists()) {
        const newCount = Math.max(0, (tournamentSnap.data().memberCount || 1) - 1);
        await setDoc(
          tournamentRef,
          { memberCount: newCount },
          { merge: true }
        );
      }

      // Update user's tournaments list
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const currentTournaments = userSnapshot.data()?.tournaments || [];
      const remaining = currentTournaments.filter(t => t !== tournamentId);
      
      await setDoc(
        userRef,
        {
          tournaments: remaining,
        },
        { merge: true }
      );

      // Update local state with fresh tournament IDs
      setUserTournamentIds(remaining);
      
      // If leaving current tournament, switch to another or redirect
      if (tournamentId === currentTournament) {
        if (remaining.length > 0) {
          setTournament(remaining[remaining.length - 1]);
          await refreshUser();
          onClose();
        } else {
          // This was the last tournament, redirect to tournament select page
          setTournament(null);
          await refreshUser();
          onClose();
          navigate("/tournament-select");
        }
      } else {
        await refreshUser();
        onClose();
      }
    } catch (err) {
      console.error("Error leaving tournament:", err);
      setError(err.message || "Failed to leave tournament");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card card-elevated max-w-md w-full max-h-[90vh] overflow-y-auto overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[var(--surface-card-border)]">
          <h3 className="text-xl font-bold text-[var(--text-strong)]">
            Tournament Manager
          </h3>
          <button
            onClick={() => {
              setMode("menu");
              setError("");
              setShowLeaveConfirm(false);
              setTournamentToLeave(null);
              setTournamentToEdit(null);
              setShowDeleteConfirm(false);
              setTournamentToDelete(null);
              onClose();
            }}
            aria-label="Close"
            className="btn btn-ghost btn-sm px-3 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          {mode === "menu" && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-brand-500/30 border-t-brand-500"></div>
                  <p className="text-sm text-[var(--text-muted)] mt-2">Loading tournaments...</p>
                </div>
              )}
              
              {!loading && tournaments.length > 0 && (
                <>
                  <div>
                    <h4 className="field-label">Your Tournaments</h4>
                    <div className="space-y-2">
                      {tournaments.map((tournament) => (
                        <div
                          key={tournament.id}
                          className={`p-4 rounded-2xl border ${
                            tournament.id === currentTournament
                              ? "border-brand-500/60 bg-brand-500/10"
                              : "border-[var(--surface-card-border)] bg-[var(--surface-muted)]"
                          }`}
                        >
                          <div className="flex justify-between items-center gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-[var(--text-strong)] truncate">
                                {tournament.name}
                                {tournament.id === currentTournament && (
                                  <span className="ml-2 text-xs text-brand-600 dark:text-brand-300">
                                    (Current)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--text-muted)]">
                                {tournament.memberCount || 0} members
                              </div>
                            </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                              {tournament.id !== currentTournament && (
                                <button
                                  onClick={async () => {
                                    setTournament(tournament.id);
                                    await refreshUser();
                                    onClose();
                                  }}
                                  className="btn btn-secondary btn-sm"
                                >
                                  Switch
                                </button>
                              )}
                          {tournament.createdBy === user?.uid && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setError("");
                                  setTournamentToEdit(tournament);
                                  setMode("edit");
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setError("");
                                  setTournamentToDelete(tournament);
                                  setShowDeleteConfirm(true);
                                }}
                                className="btn btn-danger btn-sm"
                              >
                                Delete
                              </button>
                            </>
                          )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setTournamentToLeave(tournament);
                                  setShowLeaveConfirm(true);
                                }}
                                className="btn btn-secondary btn-sm"
                              >
                                Leave
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {!loading && (
                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleCreateTournament}
                    className="btn btn-primary btn-block"
                  >
                    Create Tournament
                  </button>
                  <button
                    onClick={handleJoinTournament}
                    className="btn btn-secondary btn-block"
                  >
                    Join Tournament
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === "create" && (
            <CreateTournamentForm
              onSubmit={createTournament}
              onBack={() => setMode("menu")}
              error={error}
            />
          )}

          {mode === "join" && (
            <JoinTournamentForm
              tournaments={allTournaments.filter(
                (t) => !userTournamentIds.includes(t.id)
              )}
              onSubmit={handleJoinWithPassword}
              onBack={() => setMode("menu")}
              error={error}
            />
          )}

          {mode === "edit" && tournamentToEdit && (
            <EditTournamentForm
              tournament={tournamentToEdit}
              onSubmit={handleEditTournamentSubmit}
              onBack={() => {
                setTournamentToEdit(null);
                setMode("menu");
                setError("");
              }}
              loading={isSavingEdit}
            />
          )}
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && tournamentToLeave && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="card card-elevated max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">
              Leave Tournament?
            </h3>
            <p className="text-[var(--text-muted)] mb-6">
              Are you sure you want to leave <strong className="text-[var(--text-strong)]">{tournamentToLeave.name}</strong>? You can join or create a new tournament after leaving.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  setTournamentToLeave(null);
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleLeaveTournament(tournamentToLeave.id);
                  setShowLeaveConfirm(false);
                  setTournamentToLeave(null);
                }}
                className="btn btn-danger flex-1"
              >
                Leave Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && tournamentToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="card card-elevated max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">
              Delete Tournament?
            </h3>
            <p className="text-[var(--text-muted)] mb-6">
              This will permanently remove <strong className="text-[var(--text-strong)]">{tournamentToDelete.name}</strong>, including its teams, games, and scores. Everyone will lose access to it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (isDeletingTournament) return;
                  setShowDeleteConfirm(false);
                  setTournamentToDelete(null);
                }}
                className="btn btn-secondary flex-1"
                disabled={isDeletingTournament}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTournament}
                className="btn btn-danger flex-1"
                disabled={isDeletingTournament}
              >
                {isDeletingTournament ? "Deleting..." : "Delete Tournament"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateTournamentForm({ onSubmit, onBack, error }) {
  const [tournamentName, setTournamentName] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(tournamentName, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Tournament Name</label>
        <input
          type="text"
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder="Enter tournament name..."
          className="input"
          required
        />
      </div>
      <div>
        <label className="field-label">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter tournament password..."
          className="input"
          required
          minLength={4}
        />
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Must be at least 4 characters
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-secondary flex-1">
          Back
        </button>
        <button type="submit" className="btn btn-primary flex-1">
          Create
        </button>
      </div>
    </form>
  );
}

function EditTournamentForm({ tournament, onSubmit, onBack, loading }) {
  const [tournamentName, setTournamentName] = useState(tournament?.name || "");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    setTournamentName(tournament?.name || "");
  }, [tournament]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(tournamentName, newPassword);
  };

  if (!tournament) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="field-label">Tournament Name</label>
        <input
          type="text"
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder="Enter tournament name..."
          className="input"
          required
          disabled={loading}
        />
      </div>
      <div>
        <label className="field-label">New Password (optional)</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Leave blank to keep current password"
          className="input"
          disabled={loading}
        />
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Enter a new password if you want to reset it. Leave blank to keep the existing password.
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-secondary flex-1" disabled={loading}>
          Back
        </button>
        <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function JoinTournamentForm({ tournaments, onSubmit, onBack, error }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedTournamentId, password);
  };

  if (tournaments.length === 0) {
    return (
      <div>
        <p className="text-center text-[var(--text-muted)] mb-4">
          No tournaments available to join.
        </p>
        <button onClick={onBack} className="btn btn-secondary btn-block">
          Back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <SearchableTournamentDropdown
          tournaments={tournaments}
          selectedTournamentId={selectedTournamentId}
          onTournamentSelect={setSelectedTournamentId}
          placeholder="Choose a tournament..."
          label="Select Tournament:"
          error={false}
          showMemberCount={true}
        />
      </div>
      <div>
        <label className="field-label">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter tournament password..."
          className="input"
          required
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-secondary flex-1">
          Back
        </button>
        <button type="submit" className="btn btn-primary flex-1">
          Join
        </button>
      </div>
    </form>
  );
}

