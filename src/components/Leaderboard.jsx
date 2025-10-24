// src/components/Leaderboard.jsx
import React, { useState } from "react";
import MatchplayLeaderboard from "./MatchplayLeaderboard";
import StablefordLeaderboard from "./StablefordLeaderboard";
import StrokeplayLeaderboard from "./StrokeplayLeaderboard";
import MatchplayScorecardModal from "./MatchplayScorecardModal";

export default function Leaderboard({ game }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  const openModal = (team) => {
    setSelectedTeam(team);
    setModalOpen(true);
  };
  const closeModal = () => {
    setSelectedTeam(null);
    setModalOpen(false);
  };

  const renderLeaderboard = () => {
    if (
      !game ||
      !game.players ||
      game.players.length === 0
    ) {
      return (
        <p className="text-center text-gray-600 dark:text-gray-300 mt-4">
          Select a game to view the leaderboard
        </p>
      );
    }

    // Check matchFormat field (the actual field name in Firebase)
    const format = (game.matchFormat || "").toLowerCase();
    
    switch (format) {
      case "matchplay":
      case "match play":
      case "match":
        return <MatchplayLeaderboard game={game} />;
      case "stableford":
      case "stableford points":
      case "stableford scoring":
        return <StablefordLeaderboard game={game} />;
      case "strokeplay":
      case "stroke play":
      case "stroke":
      case "medal":
        return <StrokeplayLeaderboard game={game} />;
      default:
        return (
          <div className="text-center text-gray-600 dark:text-gray-300 mt-4">
            <p>Unknown game format: "{game.matchFormat || 'empty'}"</p>
            <p className="text-sm mt-2">Available formats: matchplay, stableford, strokeplay</p>
          </div>
        );
    }
  };

  return (
    <div>
      {/* Leaderboard display */}
      {renderLeaderboard()}

      {/* Modals */}
      {modalOpen && selectedTeam && game?.format === "matchplay" && (
        <MatchplayScorecardModal game={game} onClose={closeModal} />
      )}
      {modalOpen && selectedTeam && game?.format !== "matchplay" && (
        <ScorecardModal
          team={selectedTeam}
          game={game}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
