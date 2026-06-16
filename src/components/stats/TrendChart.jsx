import React, { useId } from "react";

/**
 * Lightweight dependency-free line chart for round-over-round trends.
 *
 * props:
 *  - data: [{ label, value }]  (chronological order, oldest -> newest)
 *  - unit: string appended to value labels (e.g. "%")
 *  - formatValue: optional (value) => string
 *  - height: px height of the plot area (default 140)
 */
export default function TrendChart({
  data = [],
  unit = "",
  formatValue,
  height = 140,
}) {
  const gradientId = useId();
  const points = data.filter((d) => typeof d.value === "number");

  if (points.length === 0) {
    return (
      <div className="text-sm text-[var(--text-muted)] text-center py-6">
        Not enough data yet.
      </div>
    );
  }

  const fmt =
    formatValue ||
    ((v) => `${Math.round(v * 10) / 10}${unit}`);

  // Single data point: just show the value, a line needs two.
  const width = 320;
  const padX = 10;
  const padY = 16;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2;

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    // Avoid a flat divide-by-zero; pad the range a touch.
    min -= 1;
    max += 1;
  }

  const xFor = (i) =>
    points.length === 1
      ? padX + plotW / 2
      : padX + (i / (points.length - 1)) * plotW;
  const yFor = (v) => padY + (1 - (v - min) / (max - min)) * plotH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`)
    .join(" ");
  const areaPath =
    points.length > 1
      ? `${linePath} L ${xFor(points.length - 1).toFixed(1)} ${(
          padY + plotH
        ).toFixed(1)} L ${xFor(0).toFixed(1)} ${(padY + plotH).toFixed(1)} Z`
      : "";

  const last = points[points.length - 1];
  const first = points[0];
  const trendUp = last.value > first.value;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(18 183 106 / 0.35)" />
            <stop offset="100%" stopColor="rgb(18 183 106 / 0)" />
          </linearGradient>
        </defs>

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        <path
          d={linePath}
          fill="none"
          stroke="rgb(18 183 106)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(p.value)}
            r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? "rgb(163 230 53)" : "rgb(18 183 106)"}
          />
        ))}
      </svg>

      <div className="flex items-center justify-between mt-1 text-xs text-[var(--text-muted)]">
        <span>{first.label}</span>
        <span className="font-semibold text-[var(--text-strong)]">
          Latest: {fmt(last.value)}{" "}
          <span className={trendUp ? "text-brand-500" : "text-red-500"}>
            {points.length > 1 ? (trendUp ? "▲" : "▼") : ""}
          </span>
        </span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
