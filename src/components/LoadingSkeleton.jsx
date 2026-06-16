import React from "react";

export default function LoadingSkeleton({
  items = 3,
  lines = 3,
  showAvatar = false,
  className = "",
  cardClassName = "",
}) {
  const widthOptions = ["w-3/4", "w-2/3", "w-1/2", "w-full"];

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, itemIndex) => (
        <div
          key={itemIndex}
          className={`card flex items-center gap-4 p-4 animate-pulse ${cardClassName}`}
        >
          {showAvatar && (
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-muted)] flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            {Array.from({ length: lines }).map((_, lineIndex) => (
              <div
                key={lineIndex}
                className={`h-3 rounded-full bg-[var(--surface-muted)] ${
                  widthOptions[(lineIndex + itemIndex) % widthOptions.length]
                }`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

