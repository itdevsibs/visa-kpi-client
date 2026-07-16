import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * BaseModal — universal modal component using createPortal to attach to document.body
 * and prevent overflow issues. 
 *
 * @param {boolean} open - Whether the modal is open
 * @param {function} onClose - Callback when modal should close
 * @param {ReactNode} children - Modal content
 * @param {boolean} [lockScroll=true] - Whether to lock body scroll when open
 * @param {string} [maxWidth="max-w-md"] - Tailwind max-width class
 * @param {string} [className=""] - Additional classes for the modal container
 */
export default function BaseModal({
  open,
  onClose,
  children,
  lockScroll = true,
  maxWidth = "max-w-md",
  className = "",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    
    document.addEventListener("keydown", handleEscape);

    if (lockScroll) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      if (lockScroll) {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    };
  }, [open, onClose, lockScroll]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/40 p-4 sm:p-6 backdrop-blur-sm sibs-modal-backdrop-in"
      onClick={() => onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col max-h-full sibs-modal-pop-in ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
