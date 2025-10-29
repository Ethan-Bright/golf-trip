// src/components/Leaderboard.jsx
import React, { useState } from "react";
import MatchplayLeaderboard from "./MatchplayLeaderboard";
import MatchplayGrossLeaderboard from "./MatchplayGrossLeaderboard";
import Matchplay2v2Leaderboard from "./Matchplay2v2Leaderboard";
import Matchplay2v2GrossLeaderboard from "./Matchplay2v2GrossLeaderboard";
import AmericanLeaderboard from "./AmericanLeaderboard";
import AmericanNetLeaderboard from "./AmericanNetLeaderboard";
import StablefordLeaderboard from "./StablefordLeaderboard";
import StrokeplayLeaderboard from "./StrokeplayLeaderboard";
import ScorecardLeaderboard from "./ScorecardLeaderboard";
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
      case "matchplay gross":
      case "match play gross":
      case "match gross":
        return <MatchplayGrossLeaderboard game={game} />;
      case "2v2 matchplay":
      case "2v2 match play":
      case "2v2":
        return <Matchplay2v2Leaderboard game={game} />;
      case "2v2 matchplay gross":
      case "2v2 match play gross":
      case "2v2 gross":
        return <Matchplay2v2GrossLeaderboard game={game} />;
      case "american":
      case "american scoring":
        return <AmericanLeaderboard game={game} />;
      case "american net":
      case "american scoring net":
      case "american net scoring":
        return <AmericanNetLeaderboard game={game} />;
      case "stableford":
      case "stableford points":
      case "stableford scoring":
        return <StablefordLeaderboard game={game} />;
      case "strokeplay":
      case "stroke play":
      case "stroke":
      case "medal":
        return <StrokeplayLeaderboard game={game} />;
      case "scorecard":
        return <ScorecardLeaderboard game={game} />;
      default:
        return (
          <div className="text-center text-gray-600 dark:text-gray-300 mt-4">
            <p>Unknown game format: "{game.matchFormat || 'empty'}"</p>
            <p className="text-sm mt-2">Available formats: matchplay, matchplay gross, 2v2 matchplay, 2v2 matchplay gross, american, american net, stableford, strokeplay, scorecard</p>
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
