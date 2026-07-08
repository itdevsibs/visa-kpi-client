import React from "react";
import { Button } from "./button.jsx";
import { Edit2, RefreshCw } from "lucide-react";

export default function EmployeeManagementMobileCard({
  emp,
  hasAdminAccess,
  selectedEmpIds,
  handleSelectRow,
  setEditingEmployee,
  setEmployees,
  setNotification,
}) {
  const isActive = emp.status === "Active";

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all active:scale-[0.98]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {hasAdminAccess && (
            <input
              type="checkbox"
              checked={selectedEmpIds.includes(emp.id)}
              onChange={() => handleSelectRow(emp.id)}
              className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-800">{emp.employee_name}</p>
            <p className="truncate font-mono text-[10px] text-slate-500">
              {emp.employee_id} &middot; {emp.team}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
            isActive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-rose-500"
            }`}
          ></span>
          {emp.status}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="text-[10px] min-w-0">
          <p className="font-bold text-slate-400 uppercase">Position</p>
          <p className="truncate font-medium text-slate-700">{emp.position}</p>
        </div>

        <div className="flex justify-end gap-1.5">
          <Button
            variant="outline"
            onClick={() => setEditingEmployee(emp)}
            className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors cursor-pointer"
            title="Configure Settings"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>

          {hasAdminAccess && (
            <Button
              variant="outline"
              onClick={() => {
                setEmployees((prev) =>
                  prev.map((e) =>
                    e.id === emp.id
                      ? {
                          ...e,
                          status: e.status === "Active" ? "Inactive" : "Active",
                          employment_status:
                            e.status === "Active" ? "Inactive" : "Active",
                        }
                      : e
                  )
                );
                setNotification(`Toggled operational status for ${emp.employee_name}`);
                setTimeout(() => setNotification(null), 3000);
              }}
              className={`p-1 rounded border transition-colors cursor-pointer ${
                isActive
                  ? "bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600"
                  : "bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600"
              }`}
              title={isActive ? "Deactivate Employee" : "Activate Employee"}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
