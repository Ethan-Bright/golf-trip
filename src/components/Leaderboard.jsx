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
import {
  getMatchFormatLabel,
  normalizeMatchFormat,
} from "../lib/matchFormats";

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
    const formatId = normalizeMatchFormat(game.matchFormat);

    switch (formatId) {
      case "1v1matchplayhandicaps":
        return <MatchplayLeaderboard game={game} />;
      case "1v1matchplaynohandicap":
        return <MatchplayGrossLeaderboard game={game} />;
      case "2v2matchplayhandicaps":
        return <Matchplay2v2Leaderboard game={game} />;
      case "2v2matchplaynohandicap":
        return <Matchplay2v2GrossLeaderboard game={game} />;
      case "american":
        return <AmericanLeaderboard game={game} />;
      case "american net":
        return <AmericanNetLeaderboard game={game} />;
      case "stableford":
        return <StablefordLeaderboard game={game} />;
      case "strokeplay":
        return <StrokeplayLeaderboard game={game} />;
      case "scorecard":
        return <ScorecardLeaderboard game={game} />;
      default:
        return (
          <div className="text-center text-gray-600 dark:text-gray-300 mt-4">
            <p>Unknown game format: "{game.matchFormat || "empty"}"</p>
            <p className="text-sm mt-2">
              Available formats: 1v1 Match Play (With Handicaps), 1v1 Match Play (No Handicaps), 2v2 Match Play (With Handicaps), 2v2 Match Play (No Handicaps), American, American With Handicaps, Stableford, Stroke Play, Scorecard
            </p>
          </div>
        );
    }
  };

  return (
    <div>
      {/* Leaderboard display */}
      {renderLeaderboard()}

      {/* Modals */}
      {modalOpen &&
        selectedTeam &&
        normalizeMatchFormat(game?.matchFormat) === "1v1matchplayhandicaps" && (
        <MatchplayScorecardModal game={game} onClose={closeModal} />
      )}
      {modalOpen &&
        selectedTeam &&
        normalizeMatchFormat(game?.matchFormat) !== "1v1matchplayhandicaps" && (
        <ScorecardModal
          team={selectedTeam}
          game={game}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
