import { describe, expect, it } from "vitest";
import {
  canJoinGame,
  formatPlayerCapacityLabel,
  getGameFullMessage,
  getGamePlayerCapacity,
  getMatchFormatPlayerLimit,
} from "../matchFormats";

describe("match format player limits", () => {
  it("returns fixed limits for roster-based formats", () => {
    expect(getMatchFormatPlayerLimit("wolf")).toBe(3);
    expect(getMatchFormatPlayerLimit("2v2matchplayhandicaps")).toBe(4);
    expect(getMatchFormatPlayerLimit("1v1matchplaynohandicap")).toBe(2);
  });

  it("returns null for open formats", () => {
    expect(getMatchFormatPlayerLimit("stableford")).toBeNull();
    expect(getMatchFormatPlayerLimit("strokeplay")).toBeNull();
  });

  it("detects when a game is full", () => {
    const wolfGame = {
      status: "inProgress",
      matchFormat: "wolf",
      players: [{ userId: "a" }, { userId: "b" }, { userId: "c" }],
    };
    expect(getGamePlayerCapacity(wolfGame)).toEqual({
      current: 3,
      max: 3,
      isFull: true,
      spotsRemaining: 0,
    });
    expect(canJoinGame(wolfGame)).toBe(false);
    expect(getGameFullMessage(wolfGame)).toBe("This game is full (3 players max).");
  });

  it("allows joins below the cap", () => {
    const game = {
      status: "inProgress",
      matchFormat: "2v2matchplayhandicaps",
      players: [{ userId: "a" }, { userId: "b" }],
    };
    expect(canJoinGame(game)).toBe(true);
    expect(formatPlayerCapacityLabel(game)).toBe("2/4 players");
  });
});
