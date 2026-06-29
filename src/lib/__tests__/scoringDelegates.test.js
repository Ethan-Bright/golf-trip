import { describe, expect, it } from "vitest";
import {
  approveDelegateRequest,
  canScoreForPlayer,
  createDelegateRequest,
  getIncomingPendingRequests,
  normalizeScoringDelegates,
  revokeApprovedDelegate,
} from "../scoringDelegates";

describe("scoringDelegates", () => {
  const base = createDelegateRequest({
    scorerUserId: "a",
    scorerName: "Alice",
    playerUserId: "b",
    playerName: "Bob",
  });

  it("allows self-scoring", () => {
    expect(canScoreForPlayer([], "a", "a")).toBe(true);
  });

  it("requires approval to score for another player", () => {
    const delegates = [{ ...base, status: "pending" }];
    expect(canScoreForPlayer(delegates, "a", "b")).toBe(false);

    const approved = approveDelegateRequest(delegates, base.id);
    expect(canScoreForPlayer(approved, "a", "b")).toBe(true);
  });

  it("finds incoming pending requests", () => {
    const delegates = [{ ...base, status: "pending" }];
    expect(getIncomingPendingRequests(delegates, "b")).toHaveLength(1);
    expect(getIncomingPendingRequests(delegates, "a")).toHaveLength(0);
  });

  it("revokes approved access", () => {
    const approved = approveDelegateRequest([{ ...base, status: "pending" }], base.id);
    const revoked = revokeApprovedDelegate(approved, "a", "b");
    expect(canScoreForPlayer(revoked, "a", "b")).toBe(false);
  });

  it("normalizes invalid entries", () => {
    expect(
      normalizeScoringDelegates([
        base,
        null,
        { scorerUserId: "x" },
        { ...base, id: "2", status: "approved" },
      ])
    ).toHaveLength(2);
  });
});
