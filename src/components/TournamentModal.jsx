import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, getDocs, query, where, collection, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useTournament } from "../context/TournamentContext";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs";
import SearchableTournamentDropdown from "./SearchableTournamentDropdown";

export default function TournamentModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentTournament, setTournament } = useTournament();
  const [tournaments, setTournaments] = useState([]);
  const [allTournaments, setAllTournaments] = useState([]);
  const [userTournamentIds, setUserTournamentIds] = useState([]); // Store user's tournament IDs from Firestore
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [mode, setMode] = useState("menu"); // 'menu', 'create', 'join'
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [tournamentToLeave, setTournamentToLeave] = useState(null);

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
      onClose();
      window.location.reload(); // Reload to update tournament context
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
      onClose();
      window.location.reload(); // Reload to update tournament context
    } catch (err) {
      console.error("Error joining tournament:", err);
      setError(err.message || "Failed to join tournament");
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
          onClose();
          window.location.reload();
        } else {
          // This was the last tournament, redirect to tournament select page
          setTournament(null);
          onClose();
          navigate("/tournament-select");
        }
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err) {
      console.error("Error leaving tournament:", err);
      setError(err.message || "Failed to leave tournament");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Tournament Manager
          </h3>
          <button
            onClick={() => {
              setMode("menu");
              setError("");
              onClose();
            }}
            className="text-gray-500 dark:text-gray-400 text-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 rounded-xl p-1"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm">
              {error}
            </div>
          )}

          {mode === "menu" && (
            <div className="space-y-4">
              {loading && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading tournaments...</p>
                </div>
              )}
              
              {!loading && tournaments.length > 0 && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Your Tournaments
                    </h4>
                    <div className="space-y-2">
                      {tournaments.map((tournament) => (
                        <div
                          key={tournament.id}
                          className={`p-4 rounded-xl border-2 ${
                            tournament.id === currentTournament
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 dark:border-gray-600"
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">
                                {tournament.name}
                                {tournament.id === currentTournament && (
                                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                    (Current)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {tournament.memberCount || 0} members
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {tournament.id !== currentTournament && (
                                <button
                                  onClick={() => {
                                    setTournament(tournament.id);
                                    onClose();
                                    window.location.reload();
                                  }}
                                  className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                                >
                                  Switch
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setTournamentToLeave(tournament);
                                  setShowLeaveConfirm(true);
                                }}
                                className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
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
                    className="w-full py-3 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-lg hover:bg-green-700 dark:hover:bg-green-600"
                  >
                    Create Tournament
                  </button>
                  <button
                    onClick={handleJoinTournament}
                    className="w-full py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-semibold shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600"
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
        </div>
      </div>

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && tournamentToLeave && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Leave Tournament?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to leave <strong>{tournamentToLeave.name}</strong>? You can join or create a new tournament after leaving.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  setTournamentToLeave(null);
                }}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleLeaveTournament(tournamentToLeave.id);
                  setShowLeaveConfirm(false);
                  setTournamentToLeave(null);
                }}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600"
              >
                Leave Tournament
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
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Tournament Name:
        </label>
        <input
          type="text"
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          placeholder="Enter tournament name..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Password:
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter tournament password..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          minLength={4}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Must be at least 4 characters
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold hover:bg-green-700 dark:hover:bg-green-600"
        >
          Create
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
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          No tournaments available to join.
        </p>
        <button
          onClick={onBack}
          className="w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
        >
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
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Password:
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter tournament password..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Back
        </button>
        <button
          type="submit"
          className="flex-1 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-700 dark:hover:bg-blue-600"
        >
          Join
        </button>
      </div>
    </form>
  );
}

