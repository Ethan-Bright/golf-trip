import { describe, it, expect } from "vitest";
import {
  strokesReceivedForHole,
  netScore,
  netPointsForHole,
  teamHolePoints,
} from "../scoring";

describe("scoring helpers", () => {
  describe("strokesReceivedForHole", () => {
    it("awards base strokes for full rotations and remainder for toughest holes", () => {
      expect(strokesReceivedForHole(20, 1)).toBe(2); // 1 base + 1 extra
      expect(strokesReceivedForHole(20, 3)).toBe(1);
      expect(strokesReceivedForHole(20, 15)).toBe(1); // outside remainder
      expect(strokesReceivedForHole(4, 2)).toBe(1);
      expect(strokesReceivedForHole(4, 10)).toBe(0);
    });

    it("treats scratch and plus handicaps correctly", () => {
      expect(strokesReceivedForHole(0, 1)).toBe(0);
      expect(strokesReceivedForHole(-2, 1)).toBe(-1);
      expect(strokesReceivedForHole(-2, 2)).toBe(-1);
      expect(strokesReceivedForHole(-2, 3)).toBe(0);
      expect(strokesReceivedForHole(-20, 1)).toBe(-2); // base -1, extra -1
    });
  });

  describe("netScore", () => {
    it("subtracts strokes received from gross score", () => {
      expect(netScore(5, 2)).toBe(3);
      expect(netScore(4, 0)).toBe(4);
    });
  });

  describe("netPointsForHole", () => {
    it("converts net score vs par into points", () => {
      expect(netPointsForHole(2, 4)).toBe(5); // eagle
      expect(netPointsForHole(3, 4)).toBe(4); // birdie
      expect(netPointsForHole(4, 4)).toBe(3); // par
      expect(netPointsForHole(5, 4)).toBe(2); // bogey
      expect(netPointsForHole(6, 4)).toBe(1); // double bogey
      expect(netPointsForHole(7, 4)).toBe(0); // worse
    });
  });

  describe("teamHolePoints", () => {
    it("returns the best point total between teammates", () => {
      expect(teamHolePoints(3, 5)).toBe(5);
      expect(teamHolePoints(0, 2)).toBe(2);
    });
  });
});

