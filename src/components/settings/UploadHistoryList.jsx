import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  History,
} from "lucide-react";

export default function UploadHistoryList({ uploadLogs = [] }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h4 className="font-bold text-slate-900 text-sm">
              Uploaded Files History
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Recent roster uploads and import results
          </p>
        </div>

        <span className="rounded-full border border-slate-100 bg-white px-2 py-1 text-[10px] font-bold text-slate-400">
          {uploadLogs.length} FILES
        </span>
      </div>

      <div className="thin-scroll mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
        {uploadLogs.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">
              No uploaded files yet
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
              Upload a CSV or Excel roster. The import history will appear here.
            </p>
          </div>
        ) : (
          uploadLogs.map((log, index) => {
            const isSuccess = log.status === "Success";

            return (
              <div
                key={log.id}
                className={`sibs-page-card-in card-hover-lift rounded-xl border border-slate-200 bg-white p-3 shadow-sm stagger-${Math.min(index + 1, 8)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">
                        {log.fileName}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                        Uploaded by {log.uploadedBy || "Administrator"}
                      </p>

                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${
                      isSuccess
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertCircle className="h-3 w-3" />
                    )}
                    {log.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="sibs-section-label text-[9px]">Rows</p>
                    <p className="sibs-metric-value text-sm">
                      {log.records ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="sibs-section-label text-[9px]">New</p>
                    <p className="sibs-metric-value text-sm text-blue-600">
                      {log.added ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="sibs-section-label text-[9px]">Updated</p>
                    <p className="sibs-metric-value text-sm text-amber-500">
                      {log.updated ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}