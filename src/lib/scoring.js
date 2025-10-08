// src/lib/scoring.js

export function strokesReceivedForHole(handicap, holeStrokeIndex) {
    // handicap: integer (e.g., 10)
    const base = Math.floor(handicap / 18);
    const remainder = handicap % 18;
    const extra = holeStrokeIndex <= remainder ? 1 : 0;
    return base + extra;
  }
  
  export function netScore(grossScore, strokesReceived) {
    return grossScore - strokesReceived;
  }
  
  // points mapping based on net score and par
  export function netPointsForHole(netScoreVal, par) {
    const diff = netScoreVal - par; // negative = better than par
    if (diff <= -2) return 5; // eagle or better
    if (diff === -1) return 4; // birdie
    if (diff === 0) return 3;  // par
    if (diff === 1) return 2;  // bogey
    if (diff === 2) return 1;  // double bogey
    return 0;                  // worse
  }
  
  // team best-ball: take the max points between two players on that hole
  export function teamHolePoints(player1Points, player2Points) {
    return Math.max(player1Points, player2Points);
  }
  