import { KPI_HEADERS } from "../../constants/kpiHeaders.js";
import { formatSeconds } from "../../lib/utils/formatters.js";
import { X } from "lucide-react";
import BaseModal from "./BaseModal";

export const DetailModal = ({ isOpen, onClose, employee }) => {
  if (!employee) return null;

  return (
    <BaseModal open={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 shrink-0 gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold text-slate-800">{employee.name}</h2>
          <p className="truncate text-sm text-slate-500">{employee.role} &middot; {employee.department}</p>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 overflow-y-auto thin-scroll">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Performance Overview</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">{KPI_HEADERS.actualEfficiency}</div>
            <div className={`text-2xl font-bold ${
              employee.actualEfficiency >= 95 ? 'text-green-600' :
              employee.actualEfficiency >= 80 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {employee.actualEfficiency.toFixed(1)}%
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">{KPI_HEADERS.handledCalls}</div>
            <div className="text-2xl font-bold text-slate-800">{employee.handledCalls}</div>
            <div className="text-xs text-slate-500 mt-1">Target: {employee.targetCalls}</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 mb-1">{KPI_HEADERS.actualLoggedTime}</div>
            <div className="text-2xl font-bold text-slate-800">
              {formatSeconds(employee.actualLoggedTime)}
            </div>
          </div>
        </div>

        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Detailed Metrics</h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          <div className="flex flex-col sm:flex-row justify-between gap-1 p-4">
            <span className="text-sm text-slate-600">{KPI_HEADERS.avgTalkTime}</span>
            <span className="text-sm font-medium text-slate-800">{formatSeconds(employee.averageTalkTime)} (Target: {formatSeconds(employee.targetTalkTime)})</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-1 p-4">
            <span className="text-sm text-slate-600">{KPI_HEADERS.avgHoldTime}</span>
            <span className="text-sm font-medium text-slate-800">{formatSeconds(employee.averageHoldTime)} (Target: {formatSeconds(employee.targetHoldTime)})</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-1 p-4">
            <span className="text-sm text-slate-600">Phone Occupancy</span>
            <span className="text-sm font-medium text-slate-800">{employee.phoneOccupancy}%</span>
          </div>
          <div className="flex flex-col sm:flex-row justify-between gap-1 p-4">
            <span className="text-sm text-slate-600">{KPI_HEADERS.availableEmailCapacity}</span>
            <span className="text-sm font-medium text-slate-800">{employee.availableEmailCapacity} / {employee.dailyTotalSlots}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
        >
          Close
        </button>
      </div>
    </BaseModal>
  );
};
