import React from "react";

/**
 * BarRow — horizontal progress bar with label and value.
 *
 * Uses CSS-first `sibs-page-card-in` for entrance animation with stagger delay.
 *
 * @param {string} label — bar label
 * @param {number} value — current value
 * @param {number} max   — maximum value for percentage calculation
 * @param {number} [delay=0] — stagger delay in ms
 * @param {string} [barColor] — custom tailwind bg class for the bar fill
 */
export default function BarRow({
  label,
  value,
  max,
  delay = 0,
  barColor = "bg-sibs-primary-1",
}) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className="sibs-page-card-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-bold text-slate-700">
          {label}
        </p>

        <p className="shrink-0 text-sm font-bold text-sibs-primary-1">
          {value}
        </p>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
