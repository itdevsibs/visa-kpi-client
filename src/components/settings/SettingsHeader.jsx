import React from "react";
import { Database, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "../ui/button.jsx";

export default function SettingsHeader({
  isSyncing,
  hasAdminAccess,
  onSyncDatabase,
}) {
  return (
    <div className="sibs-page-header-in flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Operational Settings & Configuration
        </h1>
        <p className="text-sm text-slate-500 font-sans mt-0.5">
          US Visa account administration, HRIS database synchronization, and team task ordering
        </p>

        {!hasAdminAccess && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
            <ShieldAlert className="h-3.5 w-3.5" />
            Admin permission required to sync database
          </div>
        )}
      </div>

      <Button
        variant="outline"
        onClick={onSyncDatabase}
        disabled={isSyncing || !hasAdminAccess}
        className={`sibs-action-btn interactive-press shrink-0 border text-xs font-bold ${
          isSyncing
            ? "bg-blue-50 text-blue-600 border-blue-100 cursor-not-allowed"
            : !hasAdminAccess
              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm hover:shadow-md"
        }`}
      >
        {isSyncing ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Database className="h-4 w-4" />
        )}
        <span>{isSyncing ? "Syncing Database..." : "Sync Database"}</span>
      </Button>
    </div>
  );
}