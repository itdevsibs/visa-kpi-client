import React, { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { KPI_HEADERS } from "../../../constants/kpiHeaders.js";
import { formatSeconds } from "../../../lib/utils/formatters.js";

function MobilePerformanceCard({ row, onClick }) {
  const styles = useMemo(() => {
    if (row.efficiency >= 95) {
      return {
        rowBg: "border-emerald-200 bg-emerald-50/30",
        indicatorColor: "bg-emerald-500",
        efficiencyColor: "text-emerald-600",
      };
    }

    if (row.efficiency >= 85) {
      return {
        rowBg: "border-amber-200 bg-amber-50/30",
        indicatorColor: "bg-amber-500",
        efficiencyColor: "text-amber-600",
      };
    }

    return {
      rowBg: "border-rose-200 bg-rose-50/30",
      indicatorColor: "bg-rose-500",
      efficiencyColor: "text-rose-600",
    };
  }, [row.efficiency]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-full cursor-pointer rounded-xl border p-4 text-left shadow-sm transition-transform active:scale-[0.98] ${styles.rowBg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.indicatorColor}`}
          />

          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">
              {row.employeeName}
            </p>

            <p className="mt-0.5 truncate font-mono text-[10px] uppercase text-slate-500">
              {row.hour !== undefined ? `${row.hour}:00` : "Daily"}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className={`font-mono text-lg font-bold ${styles.efficiencyColor}`}>
            {row.efficiency}%
          </p>
          <p className="text-[10px] font-medium text-slate-400">{KPI_HEADERS.actualEfficiency}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            {KPI_HEADERS.handledCalls}
          </p>
          <p className="font-mono text-sm font-semibold text-slate-800">
            {row.handledCalls}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400">
            {KPI_HEADERS.actualLoggedTime}
          </p>
          <p className="font-mono text-sm font-semibold text-slate-800">
            {formatSeconds(row.loggedSeconds)}
          </p>
        </div>
      </div>

      <div className="absolute bottom-3 right-3 text-slate-300">
        <ChevronRight size={16} />
      </div>
    </button>
  );
}

export default React.memo(MobilePerformanceCard);