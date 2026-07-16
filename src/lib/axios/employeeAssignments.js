import { apiGet, apiPost, apiPut } from "./api.js";

export async function getEmployeeAssignments() {
  const result = await apiGet("/users/employee-assignments");
  return Array.isArray(result?.data) ? result.data : [];
}

export async function syncEmployeeAssignmentsFromKronos() {
  return apiPost("/users/employee-assignments/sync-kronos");
}

export async function saveEmployeeAssignments(assignments) {
  return apiPut("/users/employee-assignments", {
    assignments: Array.isArray(assignments) ? assignments : [],
  });
}
