import React, { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";

/**
 * AnimatedDropdown — grid-based CSS animated dropdown container.
 * Zero JS animation overhead. Uses CSS grid-rows transition.
 */
export function AnimatedDropdown({ open, children, className = "" }) {
  return (
    <div
      className={`absolute left-0 right-0 top-full mt-2 grid transition-all duration-300 ease-out ${
        open
          ? "grid-rows-[1fr] opacity-100"
          : "pointer-events-none grid-rows-[0fr] opacity-0"
      } ${className}`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-out ${
            open ? "translate-y-0 scale-100" : "-translate-y-2 scale-[0.98]"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * CustomSelect — a fully custom select dropdown with animated open/close.
 *
 * @param {string}   label       — field label
 * @param {string}   value       — current selected value
 * @param {string[]} options     — list of options
 * @param {function} onChange    — callback when option is selected
 * @param {string}   [placeholder] — placeholder text
 * @param {string}   [zIndex]    — z-index class for stacking
 * @param {function} [formatOption] — optional formatter for display text
 */
export function CustomSelect({
  label,
  value,
  options = [],
  onChange,
  placeholder = "Select",
  zIndex = "z-30",
  formatOption,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayValue = value || placeholder;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div ref={dropdownRef} className={`relative ${zIndex}`}>
      {label && (
        <label className="mb-1 block text-sm font-bold text-slate-900">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-left text-sm font-bold text-slate-700 outline-none transition-all duration-200 hover:border-sibs-primary-1/40 hover:bg-slate-50 focus:border-sibs-primary-1 focus:ring-4 focus:ring-sibs-primary-1/10"
      >
        <span className="truncate">
          {formatOption ? formatOption(displayValue) : displayValue}
        </span>

        <ChevronDown
          size={18}
          className={`shrink-0 text-sibs-tertiary-5 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatedDropdown open={open}>
        <div className="max-h-64 overflow-y-auto py-2 thin-scroll">
          {options.map((option) => {
            const selected = value === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`block w-full px-4 py-3 text-left text-sm transition ${
                  selected
                    ? "bg-blue-50 font-bold text-sibs-primary-1"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="block truncate">
                  {formatOption ? formatOption(option) : option}
                </span>
              </button>
            );
          })}
        </div>
      </AnimatedDropdown>
    </div>
  );
}
