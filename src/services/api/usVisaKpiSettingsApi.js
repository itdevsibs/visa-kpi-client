const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function parseApiResponse(response, fallbackMessage) {
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export async function getUsVisaKpiEmployees({
  activeOnly = false,
  includeDashboardOnly = false,
  search = "",
} = {}) {
  const params = new URLSearchParams();

  if (activeOnly) params.set("activeOnly", "true");
  if (includeDashboardOnly) params.set("includeDashboardOnly", "true");
  if (search) params.set("search", search);

  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/employees?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  const result = await parseApiResponse(
    response,
    "Failed to fetch US Visa employees."
  );

  return result.data || [];
}

export async function createUsVisaKpiEmployee(payload) {
  const response = await fetch(`${API_BASE_URL}/us-visa-kpi/employees`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const result = await parseApiResponse(
    response,
    "Failed to create US Visa employee."
  );

  return result.data;
}

export async function updateUsVisaKpiEmployee(employeeUid, payload) {
  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/employees/${encodeURIComponent(employeeUid)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  );

  const result = await parseApiResponse(
    response,
    "Failed to update US Visa employee."
  );

  return result.data;
}

export async function bulkUpsertUsVisaKpiEmployees(employees = []) {
  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/employees/bulk-upsert`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ employees }),
    }
  );

  const result = await parseApiResponse(
    response,
    "Failed to save US Visa employees."
  );

  return {
    employees: result.data || [],
    summary: result.summary || null,
  };
}


export async function syncUsVisaKpiEmployeesFromKpi({ date = "", batchId = null } = {}) {
  const response = await fetch(`${API_BASE_URL}/us-visa-kpi/employees/sync-from-kpi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ date, batchId }),
  });

  const result = await parseApiResponse(
    response,
    "Failed to sync employees from KPI data."
  );

  return {
    employees: result.data || [],
    summary: result.summary || null,
  };
}

export async function importOfficialUsVisaRoster({ rows = [], deactivateMissing = true } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/employees/import-official-roster`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ rows, deactivateMissing }),
    }
  );

  const result = await parseApiResponse(
    response,
    "Failed to import official US Visa roster."
  );

  return {
    employees: result.data || [],
    summary: result.summary || null,
  };
}
