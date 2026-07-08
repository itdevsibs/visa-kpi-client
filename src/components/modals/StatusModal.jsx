import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle } from "lucide-react";

export default function StatusModal({
  open,
  type = "success",
  title,
  message,
  onClose,
  variant = "center", // center | compact
  lockScroll = false,
}) {
  const [mounted, setMounted] = useState(false);

  const previousOverflowRef = useRef({
    body: "",
    html: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);

    if (lockScroll) {
      previousOverflowRef.current = {
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
      };

      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);

      if (lockScroll) {
        document.body.style.overflow = previousOverflowRef.current.body || "";
        document.documentElement.style.overflow =
          previousOverflowRef.current.html || "";
      }
    };
  }, [open, onClose, lockScroll]);

  if (!mounted || !open || typeof document === "undefined") return null;

  const isSuccess = type === "success";

  const finalTitle =
    title || (isSuccess ? "Success" : "Something went wrong");

  const finalMessage = message || "Operation completed.";

  const handleClose = () => {
    onClose?.();

    if (!lockScroll && typeof document !== "undefined") {
      window.setTimeout(() => {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }, 0);
    }
  };

  return createPortal(
    <div
      className="fixed left-0 top-0 z-[999999] flex h-[100dvh] w-[100dvw] items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
    >
      {variant === "compact" ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-sibs-tertiary-9 bg-white p-6 shadow-2xl"
        >
          <div className="mb-4 flex items-start gap-4">
            <div className="flex min-w-0 flex-row items-center gap-2">
              <div
                className={`shrink-0 rounded-2xl p-3 ${
                  isSuccess ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 size={24} className="text-green-600" />
                ) : (
                  <XCircle size={24} className="text-red-600" />
                )}
              </div>

              <h3 className="break-words text-xl font-semibold text-sibs-primary-1">
                {finalTitle}
              </h3>
            </div>
          </div>

          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-sibs-tertiary-5">
            {finalMessage}
          </p>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl bg-[var(--sibs-primary-1)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.98]"
            >
              OK
            </button>
          </div>
        </div>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-sibs-tertiary-9 bg-white shadow-2xl"
        >
          <div className="px-6 py-6">
            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                  isSuccess ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 size={34} className="text-green-600" />
                ) : (
                  <XCircle size={34} className="text-red-600" />
                )}
              </div>

              <h2 className="text-2xl font-bold text-sibs-primary-1">
                {finalTitle}
              </h2>

              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-sibs-tertiary-5">
                {finalMessage}
              </p>

              <button
                type="button"
                onClick={handleClose}
                className="mt-6 w-full rounded-xl bg-[var(--sibs-primary-1)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}