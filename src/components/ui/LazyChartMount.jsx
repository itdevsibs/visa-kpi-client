import React, { useEffect, useRef, useState } from "react";

export default function LazyChartMount({
  children,
  heightClass = "h-72",
  className = "",
  placeholder = "Loading chart...",
}) {
  const containerRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let idleId;
    let timeoutId;

    const mount = () => setShouldRender(true);

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(mount, { timeout: 500 });
    } else {
      timeoutId = window.setTimeout(mount, 80);
    }

    return () => {
      if (idleId && typeof window !== "undefined") {
        window.cancelIdleCallback(idleId);
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={`${heightClass} w-full ${className}`}>
      {shouldRender ? (
        children
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-50 text-[11px] font-semibold text-slate-400">
          {placeholder}
        </div>
      )}
    </div>
  );
}
