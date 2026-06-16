import React from "react";

export default function WolfDecisionControls({
  absIndex,
  userId,
  gamePlayers,
  getWolfForHole,
  getPlayerById,
  getNonWolfPlayers,
  getGrossFor,
  wolfOrder,
  wolfHoles,
  wolfDecisions,
  onChange,
}) {
  if (
    !wolfOrder ||
    wolfOrder.length !== 3 ||
    !Array.isArray(gamePlayers) ||
    gamePlayers.length !== 3
  ) {
    return null;
  }

  if (getWolfForHole(absIndex) !== userId) {
    const holeInfo = wolfHoles?.[absIndex];
    const choice =
      holeInfo && "decision" in holeInfo
        ? holeInfo.decision
        : wolfDecisions?.[absIndex] ?? null;
    const wolfId = holeInfo?.wolfId ?? getWolfForHole(absIndex);
    const wolfName = getPlayerById(wolfId)?.name || "-";
    let choiceText = "No choice yet";

    if (choice === "blind") {
      choiceText = "Blind Lone Wolf (+6pts)";
    } else if (choice === "lone") {
      choiceText = "Lone Wolf";
    } else if (typeof choice === "string" && choice) {
      const partnerName = getPlayerById(choice)?.name || "Partner";
      choiceText = `Partner: ${partnerName}`;
    }

    return (
      <div className="text-xs sm:text-sm text-[var(--text-muted)] text-center">
        {wolfName} choice: {choiceText}
      </div>
    );
  }

  const others = getNonWolfPlayers(userId);
  const wolfPlayer = getPlayerById(userId);

  const wolfGross = wolfPlayer?.scores?.[absIndex]?.gross ?? null;
  const aGross = getGrossFor(others[0], absIndex);
  const bGross = getGrossFor(others[1], absIndex);
  const allScoresEntered = wolfGross != null && aGross != null && bGross != null;
  const anyScoreEntered = wolfGross != null || aGross != null || bGross != null;
  const canChooseBlind = !anyScoreEntered;

  const holeInfo = wolfHoles?.[absIndex];
  const current =
    holeInfo && "decision" in holeInfo
      ? holeInfo.decision
      : wolfDecisions?.[absIndex] ?? null;

  const renderOption = (label, value, opts = {}) => {
    const { disabled, highlight } = opts;
    return (
      <label
        key={value || label}
        className={`btn btn-sm btn-block justify-start ${
          current === value ? "btn-primary" : "btn-secondary"
        } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"} ${
          highlight ? "font-bold" : ""
        }`}
      >
        <input
          type="radio"
          name={`wolf-${absIndex}`}
          checked={current === value}
          onChange={() => {
            if (!disabled) {
              onChange(absIndex, value);
            }
          }}
          disabled={disabled}
          className="sr-only"
        />
        <span>{label}</span>
      </label>
    );
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="text-[10px] text-[var(--text-muted)] mb-1 text-center">
        Choose before you tee off
      </div>
      {renderOption(
        `Team with ${others[0]?.name || "Player A"} (2v1)`,
        others[0]?.userId || null,
        { disabled: allScoresEntered }
      )}
      {renderOption(
        `Team with ${others[1]?.name || "Player B"} (2v1)`,
        others[1]?.userId || null,
        { disabled: allScoresEntered }
      )}
      {renderOption("Lone Wolf (1v2)", "lone", { disabled: allScoresEntered })}
      {renderOption("Blind Lone Wolf (1v2) +6pts", "blind", {
        disabled: allScoresEntered || !canChooseBlind,
        highlight: true,
      })}
      {allScoresEntered && current && (
        <div className="text-[10px] text-[var(--text-muted)] text-center mt-1">
          Decision locked
        </div>
      )}
    </div>
  );
}

