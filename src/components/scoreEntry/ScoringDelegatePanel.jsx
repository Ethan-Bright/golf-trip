import React from "react";
import {
  getApprovedTargetsForScorer,
  getDelegateForPair,
  getIncomingPendingRequests,
  getOutgoingPendingRequests,
} from "../../lib/scoringDelegates";

export default function ScoringDelegatePanel({
  gamePlayers,
  currentUserId,
  scoringDelegates,
  activeScoringTargetUserId,
  onSwitchTarget,
  onRequestScoring,
  onRespondToRequest,
  onRevokeDelegate,
  onCancelRequest,
}) {
  const otherPlayers = (gamePlayers || []).filter(
    (p) => p.userId !== currentUserId
  );

  if (otherPlayers.length === 0) return null;

  const incomingPending = getIncomingPendingRequests(
    scoringDelegates,
    currentUserId
  );
  const outgoingPending = getOutgoingPendingRequests(
    scoringDelegates,
    currentUserId
  );
  const approvedTargets = getApprovedTargetsForScorer(
    scoringDelegates,
    currentUserId
  );

  const scoringAsSelf = !activeScoringTargetUserId;
  const activePlayer = activeScoringTargetUserId
    ? gamePlayers.find((p) => p.userId === activeScoringTargetUserId)
    : null;

  return (
    <div className="mb-4 sm:mb-6 space-y-4">
      {incomingPending.length > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-3">
            Scoring requests for you
          </p>
          <div className="space-y-2">
            {incomingPending.map((req) => (
              <div
                key={req.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-xl bg-white/60 dark:bg-black/20"
              >
                <span className="text-sm text-[var(--text-strong)]">
                  <span className="font-medium">{req.scorerName}</span> wants
                  to enter scores for you
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onRespondToRequest(req.id, true)}
                    className="btn btn-primary btn-sm flex-1 sm:flex-none"
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => onRespondToRequest(req.id, false)}
                    className="btn btn-secondary btn-sm flex-1 sm:flex-none"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)]">
        <p className="text-sm font-semibold text-[var(--text-strong)] mb-1">
          Score for a friend
        </p>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Ask a player in this round to let you enter their scores. They must
          approve before you can switch to their scorecard.
        </p>

        {(approvedTargets.length > 0 || !scoringAsSelf) && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => onSwitchTarget(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                scoringAsSelf
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-[var(--surface-card)] text-[var(--text-strong)] border-[var(--surface-card-border)] hover:border-brand-500/50"
              }`}
            >
              My scorecard
            </button>
            {approvedTargets.map((delegate) => {
              const player = gamePlayers.find(
                (p) => p.userId === delegate.playerUserId
              );
              const isActive =
                activeScoringTargetUserId === delegate.playerUserId;
              return (
                <button
                  key={delegate.id}
                  type="button"
                  onClick={() => onSwitchTarget(delegate.playerUserId)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-[var(--surface-card)] text-[var(--text-strong)] border-[var(--surface-card-border)] hover:border-brand-500/50"
                  }`}
                >
                  {player?.name || delegate.playerName}
                </button>
              );
            })}
          </div>
        )}

        {!scoringAsSelf && activePlayer && (
          <p className="text-sm text-brand-600 dark:text-brand-300 font-medium mb-3">
            Entering scores for {activePlayer.name}
          </p>
        )}

        <div className="space-y-2">
          {otherPlayers.map((player) => {
            const delegate = getDelegateForPair(
              scoringDelegates,
              currentUserId,
              player.userId
            );
            const approvedForMe = scoringDelegates.find(
              (d) =>
                d.scorerUserId === player.userId &&
                d.playerUserId === currentUserId &&
                d.status === "approved"
            );

            return (
              <div
                key={player.userId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 border-t border-[var(--surface-card-border)] first:border-t-0 first:pt-0"
              >
                <span className="text-sm text-[var(--text-strong)]">
                  {player.name}
                </span>
                <div className="flex flex-wrap gap-2">
                  {approvedForMe && (
                    <>
                      <span className="text-xs text-brand-600 dark:text-brand-300 self-center">
                        Can score for you
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onRevokeDelegate(player.userId, currentUserId)
                        }
                        className="btn btn-secondary btn-sm"
                      >
                        Revoke access
                      </button>
                    </>
                  )}
                  {!delegate && (
                    <button
                      type="button"
                      onClick={() => onRequestScoring(player.userId)}
                      className="btn btn-secondary btn-sm"
                    >
                      Ask to score for them
                    </button>
                  )}
                  {delegate?.status === "pending" &&
                    delegate.scorerUserId === currentUserId && (
                      <>
                        <span className="text-xs text-[var(--text-muted)] self-center">
                          Request pending…
                        </span>
                        <button
                          type="button"
                          onClick={() => onCancelRequest(player.userId)}
                          className="btn btn-ghost btn-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  {delegate?.status === "pending" &&
                    delegate.playerUserId === currentUserId && (
                      <span className="text-xs text-[var(--text-muted)] self-center">
                        Awaiting your response above
                      </span>
                    )}
                  {delegate?.status === "approved" &&
                    delegate.scorerUserId === currentUserId && (
                      <span className="text-xs text-brand-600 dark:text-brand-300 self-center">
                        Approved — use scorecard tabs above
                      </span>
                    )}
                  {delegate?.status === "declined" &&
                    delegate.scorerUserId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => onRequestScoring(player.userId)}
                        className="btn btn-secondary btn-sm"
                      >
                        Ask again
                      </button>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {outgoingPending.length > 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-3">
            {outgoingPending.length} request
            {outgoingPending.length === 1 ? "" : "s"} waiting for approval.
          </p>
        )}
      </div>
    </div>
  );
}
