import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Modal, useModal } from "../components/Modal";
import bcrypt from "bcryptjs";

export default function TournamentSelect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { modal, showInput, hideModal } = useModal();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchTournaments();
  }, [user?.uid]);

  // If user already has tournaments, redirect to dashboard
  useEffect(() => {
    if (user?.tournaments && user.tournaments.length > 0) {
      navigate("/dashboard");
    }
  }, [user?.tournaments, navigate]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const tournamentsRef = collection(db, "tournaments");
      const snapshot = await getDocs(tournamentsRef);
      setTournaments(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
      setLoading(false);
    } catch (err) {
      console.error("Error fetching tournaments:", err);
      setLoading(false);
    }
  };

  const createTournament = async () => {
    if (!user?.uid) return;

    try {
      // Get tournament name
      const tournamentName = await showInput("Create Tournament", "Enter tournament name...", "Tournament Name:");
      if (!tournamentName) return;

      // Get tournament password
      const password = await showInput("Set Password", "Enter tournament password...", "Password:");
      if (!password) return;

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

      // Add user to tournament members with full user data
      await setDoc(
        doc(
          db,
          "tournaments",
          tournamentId,
          "members",
          user.uid
        ),
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

      navigate("/dashboard");
    } catch (err) {
      console.error("Error creating tournament:", err);
      if (err.message !== "Cancelled") {
        setError(err.message || "Failed to create tournament");
      }
    }
  };

  const joinTournament = () => {
    if (tournaments.length === 0) {
      setError("No tournaments available to join");
      return;
    }
    setShowSelectionModal(true);
    setSelectedTournamentId(tournaments[0]?.id || "");
  };

  const handleSelectTournament = async () => {
    if (!selectedTournamentId) {
      setError("Please select a tournament");
      return;
    }

    setShowSelectionModal(false);

    try {
      const selectedTournament = tournaments.find(
        (t) => t.id === selectedTournamentId
      );
      if (!selectedTournament) {
        setError("Tournament not found");
        return;
      }

      // Get password
      const password = await showInput("Join Tournament", "Enter tournament password...", "Password:");
      if (!password) return;

      // Verify password
      const match = await bcrypt.compare(password, selectedTournament.password);
      if (!match) {
        setError("Incorrect password");
        return;
      }

      // Add user to tournament members with full user data
      await setDoc(
        doc(
          db,
          "tournaments",
          selectedTournamentId,
          "members",
          user.uid
        ),
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
        doc(db, "tournaments", selectedTournamentId),
        {
          memberCount: (selectedTournament.memberCount || 0) + 1,
        },
        { merge: true }
      );

      // Update user to have joined this tournament
      const userRef = doc(db, "users", user.uid);
      const userSnapshot = await getDoc(userRef);
      const currentTournaments = userSnapshot.data()?.tournaments || [];
      
      if (!currentTournaments.includes(selectedTournamentId)) {
        await setDoc(
          userRef,
          {
            tournaments: [...currentTournaments, selectedTournamentId],
          },
          { merge: true }
        );
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Error joining tournament:", err);
      if (err.message !== "Cancelled") {
        setError(err.message || "Failed to join tournament");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-green-100 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-200 dark:border-green-700 border-t-green-600 dark:border-t-green-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-100 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Join a Tournament
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Create a new tournament or join an existing one
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={createTournament}
              className="w-full py-4 bg-green-600 dark:bg-green-500 text-white font-semibold rounded-2xl shadow-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 transition-all duration-200"
            >
              Create Tournament
            </button>

            <button
              onClick={joinTournament}
              disabled={tournaments.length === 0}
              className="w-full py-4 bg-blue-600 dark:bg-blue-500 text-white font-semibold rounded-2xl shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Tournament
            </button>
          </div>

          {tournaments.length === 0 && (
            <p className="mt-4 text-center text-gray-600 dark:text-gray-400 text-sm">
              No tournaments available. Create one to get started!
            </p>
          )}
        </div>
      </div>

      {/* Tournament Selection Modal */}
      {showSelectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Select Tournament
            </h3>
            
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">
                Choose a tournament:
              </label>
              <select
                value={selectedTournamentId}
                onChange={(e) => setSelectedTournamentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name} ({tournament.memberCount || 0} members)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSelectionModal(false)}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectTournament}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal {...modal} onClose={hideModal} />
    </div>
  );
}
