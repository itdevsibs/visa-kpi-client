import React from "react";
import { usePagination } from "../../hooks/usePagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const PerformanceTable = ({ data }) => {
  const { currentPage, totalPages, paginatedData, nextPage, prevPage, goToPage } = usePagination(data, 10);

  return (
    <div className="w-full flex flex-col">
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <th className="px-4 py-3 font-semibold">Employee</th>
              <th className="px-4 py-3 font-semibold">Role</th>
              <th className="px-4 py-3 font-semibold">Logged Time</th>
              <th className="px-4 py-3 font-semibold">Calls (Act/Tgt)</th>
              <th className="px-4 py-3 font-semibold">Efficiency</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No performance data available.
                </td>
              </tr>
            ) : (
              paginatedData.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{emp.name}</div>
                    <div className="text-xs text-slate-500">{emp.department}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{emp.role}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{Math.floor(emp.actualLoggedTime / 3600)}h {Math.floor((emp.actualLoggedTime % 3600) / 60)}m</div>
                    <div className="text-xs text-slate-500">Target: {emp.expectedHours}h</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{emp.handledCalls}</div>
                    <div className="text-xs text-slate-500">Target: {emp.targetCalls}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      emp.actualEfficiency >= 95 ? 'bg-green-100 text-green-800' :
                      emp.actualEfficiency >= 80 ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {emp.actualEfficiency.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
          <div className="text-sm text-slate-500">
            Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to <span className="font-medium">{Math.min(currentPage * 10, data.length)}</span> of <span className="font-medium">{data.length}</span> results
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevPage}
              disabled={currentPage === 1}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToPage(i + 1)}
                  className={`w-8 h-8 rounded-md text-sm font-medium flex items-center justify-center ${
                    currentPage === i + 1 
                      ? 'bg-blue-600 text-white border border-blue-600' 
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="p-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
