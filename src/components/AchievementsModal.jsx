import React from "react";
import { courses } from "../data/courses";

export default function AchievementsModal({ game, onClose }) {
  if (!game) return null;

  const course = courses.find(c => c.id === game.courseId);
  
  // Calculate achievements for each player
  const calculateAchievements = () => {
    const achievements = {};
    
    game.players?.forEach(player => {
      const stats = {
        pars: 0,
        birdies: 0,
        eagles: 0,
        albatrosses: 0,
        bogeys: 0,
        doubleBogeys: 0,
        worse: 0,
      };

      player.scores?.forEach((score, index) => {
        const gross = score?.gross;
        if (gross === null || gross === undefined || !course) return;
        
        const hole = course.holes[index];
        if (!hole) return;
        
        const par = hole.par;
        const diff = gross - par;
        
        if (diff === -3 || diff < -3) {
          stats.albatrosses++;
        } else if (diff === -2) {
          stats.eagles++;
        } else if (diff === -1) {
          stats.birdies++;
        } else if (diff === 0) {
          stats.pars++;
        } else if (diff === 1) {
          stats.bogeys++;
        } else if (diff === 2) {
          stats.doubleBogeys++;
        } else {
          stats.worse++;
        }
      });

      achievements[player.userId] = {
        playerName: player.name,
        stats,
      };
    });

    return achievements;
  };

  const achievements = calculateAchievements();

  // Find winners for each category
  const findWinner = (category, achievements) => {
    const categoryStats = Object.entries(achievements).map(([userId, data]) => ({
      userId,
      playerName: data.playerName,
      count: data.stats[category],
    }));
    
    const maxCount = Math.max(...categoryStats.map(s => s.count));
    if (maxCount === 0) return null;
    
    const winners = categoryStats.filter(s => s.count === maxCount);
    return winners;
  };

  const categories = [
    { key: 'albatrosses', label: 'Albatrosses', emoji: '🦅' },
    { key: 'eagles', label: 'Eagles', emoji: '🦅' },
    { key: 'birdies', label: 'Birdies', emoji: '🐦' },
    { key: 'pars', label: 'Pars', emoji: '⛳' },
    { key: 'bogeys', label: 'Bogeys', emoji: '😕' },
    { key: 'doubleBogeys', label: 'Double Bogeys', emoji: '😟' },
    { key: 'worse', label: 'Rings...', emoji: '😞' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
            🏆 Game Achievements
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl sm:text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {(() => {
          if (Object.keys(achievements).length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300">
                  No achievements yet. Scores need to be entered first.
                </p>
              </div>
            );
          }

          // Check if there are any winners in any category
          const categoriesWithWinners = categories.filter(category => {
            const winners = findWinner(category.key, achievements);
            return winners && winners.length > 0;
          });

          if (categoriesWithWinners.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-300">
                  No achievements yet. Scores need to be entered first.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {categories.map(category => {
                const winners = findWinner(category.key, achievements);
                
                if (!winners || winners.length === 0) return null;
                
                return (
                  <div
                    key={category.key}
                    className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{category.emoji}</span>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Most {category.label}
                      </h3>
                    </div>
                    {winners.map((winner, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300">
                          {winner.playerName}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          {winner.count} {category.label}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="mt-4 sm:mt-6 flex justify-center">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl sm:rounded-2xl font-semibold hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
