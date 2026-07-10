import React from "react";
import { FileSpreadsheet } from "lucide-react";
import ExcelImporter from "../ui/ExcelImporter.jsx";
import UploadHistoryList from "./UploadHistoryList.jsx";

export default function RosterUploadHistoryCard({
  employees,
  setEmployees,
  userRole,
  uploadLogs,
  onUploadComplete,
}) {
  return (
    <div className="sibs-card sibs-page-card-in overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FileSpreadsheet className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-slate-900">
              Excel / CSV Employee KPI Roster
            </h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
              Upload Excel employee KPI roster files and review import history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-breathe" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          <span className="h-2 w-2 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] items-stretch">
        {/* LEFT: Upload only */}
        <div className="border-b border-slate-100 p-5 xl:border-b-0 xl:border-r flex min-h-[460px] flex-col justify-start">
          <ExcelImporter
            employees={employees}
            setEmployees={setEmployees}
            userRole={userRole}
            embedded
            onUploadComplete={onUploadComplete}
          />
        </div>

        {/* RIGHT: History only */}
        <div className="bg-slate-50/50 p-5 min-h-[460px]">
          <UploadHistoryList uploadLogs={uploadLogs} />
        </div>
      </div>
    </div>
  );
}