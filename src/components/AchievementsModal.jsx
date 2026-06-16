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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="card card-elevated max-w-2xl w-full p-4 sm:p-6 max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-[var(--text-strong)]">
            🏆 Game Achievements
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-strong)] text-2xl sm:text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {(() => {
          if (Object.keys(achievements).length === 0) {
            return (
              <div className="text-center py-8">
                <p className="text-[var(--text-muted)]">
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
                <p className="text-[var(--text-muted)]">
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
                    className="rounded-2xl p-4 border border-brand-500/40 bg-brand-500/15"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{category.emoji}</span>
                      <h3 className="font-semibold text-[var(--text-strong)]">
                        Most {category.label}
                      </h3>
                    </div>
                    {winners.map((winner, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-[var(--text-strong)]">
                          {winner.playerName}
                        </span>
                        <span className="badge badge-brand">
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
            className="btn btn-secondary w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
