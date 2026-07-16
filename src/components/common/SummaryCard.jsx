import React from "react";

/**
 * SummaryCard — a KPI metric card with icon, value, description, and stagger animation.
 *
 * Uses the CSS-first `sibs-page-card-in` class for entrance animation
 * with `animationDelay` for staggered cascade.
 *
 * @param {string}    title          — uppercase label
 * @param {any}       value          — the big number / metric
 * @param {Component} icon           — lucide-react icon component
 * @param {string}    [description]  — small helper text
 * @param {string}    [valueClassName] — custom color class for value
 * @param {string}    [iconClassName]  — custom bg/text color for icon box
 * @param {number}    [delay=0]      — stagger delay in ms
 */
export default function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  valueClassName = "text-sibs-primary-1",
  iconClassName = "bg-[#F2F6FA] text-sibs-primary-1",
  delay = 0,
}) {
  return (
    <div
      className="sibs-page-card-in group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sibs-primary-1/20 hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase tracking-wide text-sibs-tertiary-5">
            {title}
          </p>

          <p className={`mt-3 truncate text-3xl font-extrabold ${valueClassName}`}>
            {value}
          </p>

          {description && (
            <p className="mt-1 truncate text-xs font-semibold text-sibs-tertiary-5">
              {description}
            </p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105 ${iconClassName}`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
