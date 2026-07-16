export const KPI_RAW_MAX_FILE_BYTES = 50 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);

export function isSupportedKpiFile(file) {
  if (!file?.name || !Number.isFinite(Number(file.size))) return false;

  const extension = String(file.name)
    .trim()
    .toLowerCase()
    .split(".")
    .pop();

  return (
    SUPPORTED_EXTENSIONS.has(extension) &&
    Number(file.size) > 0 &&
    Number(file.size) <= KPI_RAW_MAX_FILE_BYTES
  );
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    units.length - 1,
    Math.floor(Math.log(value) / Math.log(1024)),
  );
  const converted = value / 1024 ** unitIndex;

  return `${Number(converted.toFixed(converted >= 10 ? 0 : 1))} ${units[unitIndex]}`;
}

export function getImportTotals(result = {}) {
  const sources = Array.isArray(result?.sources) ? result.sources : [];

  return sources.reduce(
    (totals, source) => ({
      insertedRows: totals.insertedRows + Number(source?.insertedRows || 0),
      duplicateRows: totals.duplicateRows + Number(source?.duplicateRows || 0),
      matchedRows: totals.matchedRows + Number(source?.matchedRows || 0),
      unmatchedRows: totals.unmatchedRows + Number(source?.unmatchedRows || 0),
      summaryRows: Number(result?.summaryRows || 0),
    }),
    {
      insertedRows: 0,
      duplicateRows: 0,
      matchedRows: 0,
      unmatchedRows: 0,
      summaryRows: Number(result?.summaryRows || 0),
    },
  );
}
