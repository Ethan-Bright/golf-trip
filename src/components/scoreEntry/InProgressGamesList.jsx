import React from "react";
import { getMatchFormatLabel } from "../../lib/matchFormats";

export default function InProgressGamesList({
  games,
  onJoinGame,
  isGameIncompleteForUser,
}) {
  if (!games || games.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-gray-700 dark:text-gray-300">
        No games are currently in progress. Create a new game to get started.
      </div>
    );
  }

  return (
    <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-2">
      {games.map((game) => {
        const incompleteForUser = isGameIncompleteForUser(game);
        return (
          <div
            key={game.id}
            className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
          >
            <div className="flex flex-col text-center sm:text-left">
              <span className="text-gray-900 dark:text-white font-medium">
                {game.name || "Untitled Game"}
              </span>
              {game.course?.name && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Course: {game.course.name}
                </span>
              )}
              {game.matchFormat && (
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Format: {getMatchFormatLabel(game.matchFormat)}
                </span>
              )}
              {incompleteForUser && (
                <span className="mt-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                  Incomplete for you
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onJoinGame(game)}
              className="w-full sm:w-auto px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl font-semibold shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {incompleteForUser ? "Resume" : "Join"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

