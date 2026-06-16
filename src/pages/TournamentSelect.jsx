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
import { useTournament } from "../context/TournamentContext";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal";
import useModal from "../hooks/useModal";
import bcrypt from "bcryptjs";
import SearchableTournamentDropdown from "../components/SearchableTournamentDropdown";
import PageShell from "../components/layout/PageShell";

export default function TournamentSelect() {
  const { user } = useAuth();
  const { setTournament } = useTournament();
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

      // Set the tournament in context and navigate to dashboard
      setTournament(tournamentId);
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

      // Set the tournament in context and navigate to dashboard
      setTournament(selectedTournamentId);
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
      <PageShell
        title="Join a Tournament"
        description="Loading tournaments..."
        backHref="/"
        showBackButton={false}
      >
        <div className="mobile-card p-8 text-center">
          <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[var(--text-muted)]">Loading tournaments...</p>
        </div>
      </PageShell>
    );
  }

  return (
    <>
      <PageShell
        title="Join a Tournament"
        description="Create a new tournament or join an existing one."
        backHref="/"
        showBackButton={false}
        bodyClassName="mobile-section"
      >
        {error && (
          <div className="mobile-card p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <section className="mobile-card p-6 space-y-4">
          <div className="text-center">
            <div className="icon-tile w-16 h-16 mx-auto mb-4 bg-brand-500/15 text-brand-600 dark:text-brand-300">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <p className="text-[var(--text-muted)]">
              Create a new tournament or join an existing one
            </p>
          </div>

          <button
            onClick={createTournament}
            className="btn btn-primary btn-block"
          >
            Create Tournament
          </button>

          <button
            onClick={joinTournament}
            disabled={tournaments.length === 0}
            className="btn btn-secondary btn-block"
          >
            Join Tournament
          </button>

          {tournaments.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-sm">
              No tournaments available. Create one to get started!
            </p>
          )}
        </section>
      </PageShell>

      {showSelectionModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="card card-elevated max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-[var(--text-strong)] mb-4">
              Select Tournament
            </h3>

            <div className="mb-6">
              <SearchableTournamentDropdown
                tournaments={tournaments}
                selectedTournamentId={selectedTournamentId}
                onTournamentSelect={setSelectedTournamentId}
                placeholder="Choose a tournament..."
                label="Choose a tournament:"
                error={false}
                showMemberCount={true}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSelectionModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectTournament}
                className="btn btn-primary flex-1"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal {...modal} onClose={hideModal} />
    </>
  );
}
