import React from "react";
import { ChevronRight } from "lucide-react";

/**
 * MobilePerformanceCard — Mobile-only view for a KPI record row.
 * Displays only the most critical metrics (Efficiency, Handled Calls, Logged Time)
 * to prevent horizontal scrolling on mobile devices.
 */
export default function MobilePerformanceCard({ row, onClick }) {
  const formatSeconds = sec => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}m`;
  };

  let rowBg = "border-slate-200 hover:border-slate-300";
  let indicatorColor = "bg-slate-300";
  let efficiencyColor = "text-slate-700";

  if (row.efficiency >= 95) {
    rowBg = "border-emerald-200 bg-emerald-50/30";
    indicatorColor = "bg-emerald-500";
    efficiencyColor = "text-emerald-600";
  } else if (row.efficiency >= 85) {
    rowBg = "border-amber-200 bg-amber-50/30";
    indicatorColor = "bg-amber-500";
    efficiencyColor = "text-amber-600";
  } else {
    rowBg = "border-rose-200 bg-rose-50/30";
    indicatorColor = "bg-rose-500";
    efficiencyColor = "text-rose-600";
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border p-4 shadow-sm transition-all active:scale-[0.98] cursor-pointer ${rowBg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${indicatorColor}`} />
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{row.employeeName}</p>
            <p className="truncate font-mono text-[10px] text-slate-500 uppercase mt-0.5">
              {row.team} &middot; {row.hour !== undefined ? `${row.hour}:00` : "Daily"}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold font-mono ${efficiencyColor}`}>
            {row.efficiency}%
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Efficiency</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Calls</p>
          <p className="font-mono text-sm font-semibold text-slate-800">{row.handledCalls}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Logged Time</p>
          <p className="font-mono text-sm font-semibold text-slate-800">
            {formatSeconds(row.loggedSeconds)}
          </p>
        </div>
      </div>
      
      <div className="absolute right-3 bottom-3 text-slate-300">
        <ChevronRight size={16} />
      </div>
    </div>
  );
}
