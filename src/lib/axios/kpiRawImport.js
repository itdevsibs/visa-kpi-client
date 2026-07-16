import { apiDelete, apiGet, apiPost, apiUpload } from "./api.js";

export async function getKpiRawImportHistory(limit = 10) {
  const result = await apiGet("/users/kpi-raw-import/history", {
    params: { limit },
  });

  return Array.isArray(result?.data) ? result.data : [];
}

export async function uploadKpiRawFile(
  file,
  sourceType = "auto",
  onProgress,
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sourceType", sourceType);

  return apiUpload("/users/kpi-raw-import", formData, onProgress);
}

export async function deleteKpiRawImport(batchId) {
  return apiDelete(`/users/kpi-raw-import/${encodeURIComponent(batchId)}`);
}

export async function rebuildKpiReports(productionDates = []) {
  return apiPost("/users/kpi-raw-import/rebuild", { productionDates });
}
