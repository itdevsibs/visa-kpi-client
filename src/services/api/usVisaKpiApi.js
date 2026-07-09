const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function getUsVisaKpiDashboard({
  date,
  fromHour = 8,
  toHour = 17,
  employeeIds = ["all"],
} = {}) {
  const params = new URLSearchParams();

  if (date) params.set("date", date);
  params.set("fromHour", String(fromHour));
  params.set("toHour", String(toHour));
  params.set(
    "employeeIds",
    Array.isArray(employeeIds) ? employeeIds.join(",") : employeeIds
  );

  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/dashboard?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch US Visa KPI dashboard.");
  }

  return result.data;
}

export async function getUsVisaKpiAgents({ date } = {}) {
  const params = new URLSearchParams();

  if (date) params.set("date", date);

  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/agents?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch US Visa KPI agents.");
  }

  return result.data;
}