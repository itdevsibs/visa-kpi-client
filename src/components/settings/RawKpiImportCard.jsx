import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  Mail,
  PhoneCall,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "../ui/button.jsx";
import {
  deleteKpiRawImport,
  getKpiRawImportHistory,
  rebuildKpiReports,
  uploadKpiRawFile,
} from "../../lib/axios/kpiRawImport.js";
import {
  formatBytes,
  getImportTotals,
  isSupportedKpiFile,
  KPI_RAW_MAX_FILE_BYTES,
} from "../../lib/utils/kpiRawImport.js";

const SOURCE_OPTIONS = [
  { value: "auto", label: "Auto-detect source" },
  { value: "msd", label: "MSD handled emails" },
  { value: "hd_calls", label: "HD Call Report" },
  { value: "hd_activity", label: "HD Agent Statistics" },
];

const SOURCE_GUIDES = [
  {
    icon: Mail,
    title: "MSD handled emails",
    description: "Uses Case Number, Modified On, and Modified By/Agent.",
  },
  {
    icon: PhoneCall,
    title: "HD Call Report",
    description: "Uses Call ID, Agent name, Answer time, End time, and hold values.",
  },
  {
    icon: Clock3,
    title: "HD Agent Statistics",
    description: "Uses Agent name, Start time, End time, Duration, and Status.",
  },
];

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SourceGuide({ icon: Icon, title, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white text-[#0D4676]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-800">{title}</p>
          <p className="mt-1 text-[11px] font-medium leading-4 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultMetric({ label, value, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    blue: "border-blue-100 bg-blue-50 text-blue-800",
    green: "border-emerald-100 bg-emerald-50 text-emerald-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-xl border px-3 py-3 ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.08em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-black tabular-nums">
        {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
}

function ImportHistoryTable({
  history,
  loading,
  deletingBatchId,
  deleteDisabled,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="flex min-h-28 items-center justify-center gap-2 text-sm font-bold text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading import history...
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="flex min-h-28 flex-col items-center justify-center text-center">
        <History className="h-7 w-7 text-slate-300" />
        <p className="mt-2 text-sm font-black text-slate-700">
          No raw-data imports yet
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Completed and failed uploads will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] border-collapse">
        <thead>
          <tr className="border-y border-slate-200 bg-slate-50 text-left">
            <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              File
            </th>
            <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Date
            </th>
            <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Raw Rows
            </th>
            <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Summary
            </th>
            <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Status
            </th>
            <th className="px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Uploaded
            </th>
            <th className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((item) => {
            const rawRows =
              Number(item.agentActivityRows || 0) +
              Number(item.callsAnsweredRows || 0) +
              Number(item.emailCaseRows || 0);
            const completed = item.status === "completed";
            const failed = item.status === "failed";

            return (
              <tr key={item.id || item.batchCode} className="bg-white">
                <td className="max-w-[280px] px-3 py-3">
                  <p className="truncate text-xs font-black text-slate-800">
                    {item.sourceFilename || "Unnamed import"}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                    {item.batchCode}
                  </p>
                </td>
                <td className="px-3 py-3 text-xs font-bold text-slate-600">
                  {item.productionDate || "Multiple dates"}
                </td>
                <td className="px-3 py-3 text-xs font-black tabular-nums text-slate-700">
                  {rawRows.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-xs font-black tabular-nums text-slate-700">
                  {Number(item.summaryRows || 0).toLocaleString()}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.06em] ${
                      completed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : failed
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status || "unknown"}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs font-semibold text-slate-500">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    disabled={deleteDisabled || deletingBatchId === item.id}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-2.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Delete this import and its raw database rows"
                  >
                    {deletingBatchId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {deletingBatchId === item.id ? "Deleting" : "Delete"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function RawKpiImportCard({
  disabled = false,
  hasUnsavedAssignments = false,
  onImported,
  onDeleted,
}) {
  const inputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceType, setSourceType] = useState("auto");
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [deletingBatchId, setDeletingBatchId] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [notice, setNotice] = useState("");

  const busy = importing || rebuilding || deletingBatchId !== null;
  const importDisabled =
    disabled || hasUnsavedAssignments || busy || !selectedFile;
  const historyDeleteDisabled =
    disabled || hasUnsavedAssignments || importing || rebuilding || historyLoading;

  const totals = useMemo(() => getImportTotals(result), [result]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const rows = await getKpiRawImportHistory(8);
      setHistory(rows);
    } catch (historyError) {
      console.error("Unable to load KPI import history:", historyError);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load server history when the Administration importer mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory();
  }, [loadHistory]);

  function chooseFile(file) {
    setError("");
    setNotice("");
    setResult(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!isSupportedKpiFile(file)) {
      setSelectedFile(null);
      setError(
        `Choose a non-empty .xlsx, .xls, or .csv file no larger than ${formatBytes(
          KPI_RAW_MAX_FILE_BYTES,
        )}.`,
      );
      return;
    }

    setSelectedFile(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
    if (!disabled && !busy) setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    if (disabled || busy) return;
    chooseFile(event.dataTransfer.files?.[0] || null);
  }

  async function handleImport() {
    if (importDisabled) return;

    setImporting(true);
    setProgress(0);
    setError("");
    setNotice("");
    setResult(null);

    try {
      const response = await uploadKpiRawFile(
        selectedFile,
        sourceType,
        setProgress,
      );
      const importedResult = response?.data || null;
      setResult(importedResult);
      setProgress(100);
      await loadHistory();
      onImported?.(response);
    } catch (uploadError) {
      setError(
        getErrorMessage(
          uploadError,
          "Unable to import the selected KPI raw-data file.",
        ),
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleRebuildReports() {
    if (disabled || hasUnsavedAssignments || busy) return;

    setRebuilding(true);
    setError("");
    setNotice("");

    try {
      const response = await rebuildKpiReports();
      setNotice(
        response?.message ||
          "KPI reports were rebuilt successfully from the imported raw data.",
      );
      await loadHistory();
      onImported?.(response);
    } catch (rebuildError) {
      setError(
        getErrorMessage(
          rebuildError,
          "Unable to rebuild KPI reports from the imported raw data.",
        ),
      );
    } finally {
      setRebuilding(false);
    }
  }

  async function handleDeleteImport(item) {
    if (
      !item?.id ||
      historyDeleteDisabled ||
      deletingBatchId !== null
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${item.sourceFilename || "this KPI import"}?

This removes the imported raw rows from MySQL and regenerates the affected KPI summaries using only the remaining imports. You can upload the file again afterward.`,
    );

    if (!confirmed) return;

    setDeletingBatchId(item.id);
    setError("");
    setNotice("");

    try {
      const response = await deleteKpiRawImport(item.id);
      const deletedBatchId = Number(response?.data?.batch?.id || item.id);

      setResult((currentResult) =>
        Number(currentResult?.batch?.id || 0) === deletedBatchId
          ? null
          : currentResult,
      );
      setNotice(
        response?.message ||
          `${item.sourceFilename || "KPI import"} was deleted successfully.`,
      );
      await loadHistory();
      onDeleted?.(response);
    } catch (deleteError) {
      setError(
        getErrorMessage(
          deleteError,
          "Unable to delete the selected KPI import.",
        ),
      );
    } finally {
      setDeletingBatchId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D4676] text-white">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  Raw KPI Data Import
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  Upload one combined workbook or a separate MSD, HD Call Report, or HD Agent Statistics file.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              onClick={handleRebuildReports}
              disabled={disabled || hasUnsavedAssignments || busy}
              className="h-9 rounded-lg bg-[#0D4676] px-3 text-xs font-black text-white hover:bg-[#0A3A63]"
              title="Recalculate all KPI summaries using the saved employee mappings and Excel formulas"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${rebuilding ? "animate-spin" : ""}`}
              />
              {rebuilding ? "Rebuilding" : "Rebuild Reports"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={loadHistory}
              disabled={historyLoading || busy}
              className="h-9 rounded-lg border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              <History className="h-3.5 w-3.5" />
              Refresh History
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {SOURCE_GUIDES.map((guide) => (
            <SourceGuide key={guide.title} {...guide} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex min-h-[190px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragActive
                ? "border-[#0D4676] bg-blue-50"
                : selectedFile
                  ? "border-emerald-300 bg-emerald-50/40"
                  : "border-slate-300 bg-slate-50/70 hover:border-slate-400"
            } ${disabled || busy ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={() => {
              if (!disabled && !busy) inputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (
                !disabled &&
                !busy &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => chooseFile(event.target.files?.[0] || null)}
            />

            {selectedFile ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 shadow-sm">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <p className="mt-3 max-w-full truncate text-sm font-black text-slate-900">
                  {selectedFile.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {formatBytes(selectedFile.size)} · Click or drop another file to replace
                </p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedFile(null);
                    setResult(null);
                    setError("");
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove file
                </button>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0D4676] shadow-sm">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-black text-slate-900">
                  Drop Excel or CSV here
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  or click to browse · Maximum {formatBytes(KPI_RAW_MAX_FILE_BYTES)}
                </p>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <label className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
              Source Type
            </label>
            <select
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
              disabled={disabled || busy}
              className={`${INPUT_CLASS} mt-2`}
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
              Keep Auto-detect for the complete workbook. Choose a source manually only when a CSV header is unusual.
            </p>

            {hasUnsavedAssignments ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-4 text-amber-800">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Save the employee Task Order, HeroDash, and MSD changes before importing raw data.
              </div>
            ) : null}

            <Button
              type="button"
              onClick={handleImport}
              disabled={importDisabled}
              className="mt-4 h-10 w-full rounded-xl bg-[#0D4676] text-sm font-black text-white hover:bg-[#063C69]"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {importing ? `Importing ${progress}%` : "Import Raw Data"}
            </Button>

            {importing ? (
              <progress
                value={progress}
                max="100"
                className="mt-3 h-2 w-full overflow-hidden rounded-full accent-[#0D4676]"
              />
            ) : null}
          </div>
        </div>

        {notice ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {result ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-emerald-900">
                  Raw data imported and KPI summary regenerated
                </h3>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Production date{result.productionDates?.length === 1 ? "" : "s"}: {result.productionDates?.join(", ") || "Not detected"}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
              <ResultMetric label="Inserted" value={totals.insertedRows} tone="green" />
              <ResultMetric label="Duplicates" value={totals.duplicateRows} tone="slate" />
              <ResultMetric label="Matched" value={totals.matchedRows} tone="blue" />
              <ResultMetric label="Unmatched" value={totals.unmatchedRows} tone="amber" />
              <ResultMetric label="KPI Rows" value={totals.summaryRows} tone="green" />
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-emerald-100 bg-white">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-emerald-50">
                  <tr>
                    {[
                      "Detected Source",
                      "Sheet",
                      "Rows",
                      "Inserted",
                      "Duplicates",
                      "Matched",
                      "Unmatched",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.06em] text-emerald-800"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                  {(result.sources || []).map((source) => (
                    <tr key={`${source.sourceType}-${source.sheetName}`}>
                      <td className="px-3 py-2.5 text-xs font-black text-slate-800">
                        {source.sourceLabel}
                      </td>
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-xs font-semibold text-slate-500">
                        {source.sheetName}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-black tabular-nums text-slate-700">
                        {Number(source.detectedRows || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-black tabular-nums text-emerald-700">
                        {Number(source.insertedRows || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-black tabular-nums text-slate-500">
                        {Number(source.duplicateRows || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-black tabular-nums text-blue-700">
                        {Number(source.matchedRows || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-xs font-black tabular-nums text-amber-700">
                        {Number(source.unmatchedRows || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.unmatchedNames?.length ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-black text-amber-900">
                  Top unmatched source names
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.unmatchedNames.slice(0, 12).map((item) => (
                    <span
                      key={`${item.sourceType}-${item.name}`}
                      className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-[10px] font-bold text-amber-800"
                    >
                      {item.sourceLabel}: {item.name} ({item.rows})
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[11px] font-semibold leading-4 text-amber-700">
                  Add the exact HeroDash or MSD name to the correct Kronos employee, save it, then upload the file again. Duplicate raw rows will be skipped while the KPI summary is rebuilt with the new mapping.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <History className="h-4 w-4 text-[#0D4676]" />
            <h3 className="text-xs font-black uppercase tracking-[0.08em] text-slate-700">
              Recent Imports
            </h3>
          </div>
          <ImportHistoryTable
            history={history}
            loading={historyLoading}
            deletingBatchId={deletingBatchId}
            deleteDisabled={historyDeleteDisabled}
            onDelete={handleDeleteImport}
          />
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
          <FileText className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Raw rows are stored in MySQL. MSD records are matched using the saved MSD name, while both HeroDash files use the saved HeroDash name. Deleting a recent import removes its raw rows and regenerates the affected KPI summary from the remaining imports.
          </span>
        </div>
      </div>
    </section>
  );
}
