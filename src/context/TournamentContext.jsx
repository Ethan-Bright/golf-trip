import React, { useState, useEffect, createContext, useContext } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const TournamentContext = createContext();

export function TournamentProvider({ children }) {
  const { user } = useAuth();
  const [currentTournament, setCurrentTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      if (!user?.uid) {
        setCurrentTournament(null);
        setLoading(false);
        return;
      }

      try {
        // Get fresh data from Firestore
        const userRef = doc(db, "users", user.uid);
        const userSnapshot = await getDoc(userRef);
        const userData = userSnapshot.data();
        const userTournaments = userData?.tournaments || [];

        if (userTournaments && userTournaments.length > 0) {
          // Load the saved tournament if valid, otherwise use the most recently joined (last in array)
          const savedTournament = localStorage.getItem("currentTournament");
          if (savedTournament && userTournaments.includes(savedTournament)) {
            setCurrentTournament(savedTournament);
          } else {
            // Use the last tournament in the array (most recently joined)
            const lastTournament = userTournaments[userTournaments.length - 1];
            setCurrentTournament(lastTournament);
          }
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching tournaments:", err);
        setLoading(false);
      }
    };

    fetchTournaments();
  }, [user?.uid]);

  const setTournament = (tournamentId) => {
    setCurrentTournament(tournamentId);
    if (tournamentId) {
      localStorage.setItem("currentTournament", tournamentId);
    } else {
      localStorage.removeItem("currentTournament");
    }
  };

  return (
    <TournamentContext.Provider
      value={{
        currentTournament,
        setTournament,
        loading,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}

