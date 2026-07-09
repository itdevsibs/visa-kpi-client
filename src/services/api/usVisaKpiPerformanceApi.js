const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function getUsVisaKpiPerformanceRecords({
  date,
  fromHour = 8,
  toHour = 17,
  intervalType = "Daily",
  employeeIds = ["all"],
} = {}) {
  const params = new URLSearchParams();

  if (date) params.set("date", date);
  params.set("fromHour", String(fromHour));
  params.set("toHour", String(toHour));
  params.set("intervalType", intervalType);
  params.set(
    "employeeIds",
    Array.isArray(employeeIds) ? employeeIds.join(",") : employeeIds
  );

  const response = await fetch(
    `${API_BASE_URL}/us-visa-kpi/performance?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Failed to fetch US Visa KPI performance records."
    );
  }

  return result.data;
}
