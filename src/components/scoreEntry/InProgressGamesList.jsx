import React from "react";
import {
  canJoinGame,
  formatPlayerCapacityLabel,
  getMatchFormatLabel,
} from "../../lib/matchFormats";
import ShareGameButton from "../ShareGameButton";

export default function InProgressGamesList({
  games,
  onJoinGame,
  isGameIncompleteForUser,
  currentUserId,
}) {
  if (!games || games.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4 text-center text-[var(--text-muted)]">
        No games are currently in progress. Create a new game to get started.
      </div>
    );
  }

  return (
    <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2">
      {games.map((game) => {
        const incompleteForUser = isGameIncompleteForUser(game);
        const alreadyJoined = game.players?.some((p) => p.userId === currentUserId);
        const joinable = alreadyJoined || canJoinGame(game);
        return (
          <div
            key={game.id}
            className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)]"
          >
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-[var(--text-strong)] font-medium">
                {game.name || "Untitled Game"}
              </span>
              {game.course?.name && (
                <span className="text-sm text-[var(--text-muted)]">
                  Course: {game.course.name}
                </span>
              )}
              {game.matchFormat && (
                <span className="text-sm text-[var(--text-muted)]">
                  Format: {getMatchFormatLabel(game.matchFormat)}
                </span>
              )}
              <span className="text-sm text-[var(--text-muted)]">
                {formatPlayerCapacityLabel(game)}
              </span>
              {!joinable && (
                <span className="badge badge-muted mt-1 self-center sm:self-start">
                  Full
                </span>
              )}
              {incompleteForUser && (
                <span className="badge badge-muted mt-1 self-center sm:self-start">
                  Incomplete for you
                </span>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {(game.createdBy === currentUserId ||
                game.managerIds?.includes(currentUserId)) && (
                <ShareGameButton
                  game={game}
                  label="Invite"
                  showCopy={false}
                  className="w-full sm:w-auto"
                />
              )}
              <button
                type="button"
                onClick={() => onJoinGame(game)}
                disabled={!joinable}
                className="btn btn-primary btn-sm w-full sm:w-auto disabled:opacity-50"
              >
                {!joinable ? "Full" : incompleteForUser ? "Resume" : "Join"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

