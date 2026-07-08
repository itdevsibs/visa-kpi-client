import React from "react";

/**
 * DetailRow — a label/value pair for detail panels and modals.
 *
 * @param {string} label — left-side uppercase label
 * @param {any}    value — right-side value (string, node, etc.)
 */
export default function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-sibs-tertiary-5">
        {label}
      </p>

      <div className="max-w-[60%] break-words text-right text-sm font-bold text-slate-700">
        {value || "—"}
      </div>
    </div>
  );
}
