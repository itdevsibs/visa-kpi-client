export const KPI_DUMP_COLUMNS = [
  "SIB ID",
  "Name",
  "Interval",
  "Expected Hours(sec)",
  "Actual Logged Time",
  "Handled Calls",
  "AVG Talk Time",
  "AVG Hold Time",
  "Avail Time",
  "Phone Occupancy",
  "Available Email Capacity (email)",
  "Target # of Emails",
  "Actual # of Emails (Email/Hour)",
  "Utilization (Email)",
  "Actual Efficiency",
  "Task Order",
  "HeroDash",
  "MSD",
];

export const normalizeHeader = (header) => {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[#()/%]+/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

export const findValue = (row, keys, fallback = "") => {
  const normalizedRow = {};

  Object.keys(row || {}).forEach((key) => {
    normalizedRow[normalizeHeader(key)] = row[key];
  });

  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    const value = normalizedRow[normalizedKey];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return fallback;
};

export const parseNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;

  const cleaned = String(value)
    .replace(/,/g, "")
    .replace(/%/g, "")
    .match(/-?\d+(\.\d+)?/);

  if (!cleaned) return fallback;

  const parsed = Number(cleaned[0]);

  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseTimeToSeconds = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const text = String(value).trim().toLowerCase();

  if (/^\d+(\.\d+)?$/.test(text)) {
    return Math.round(Number(text));
  }

  const hourMatch = text.match(/(\d+(\.\d+)?)\s*h/);
  const minMatch = text.match(/(\d+(\.\d+)?)\s*m/);
  const secMatch = text.match(/(\d+(\.\d+)?)\s*s/);

  if (hourMatch || minMatch || secMatch) {
    const hours = hourMatch ? Number(hourMatch[1]) : 0;
    const mins = minMatch ? Number(minMatch[1]) : 0;
    const secs = secMatch ? Number(secMatch[1]) : 0;

    return Math.round(hours * 3600 + mins * 60 + secs);
  }

  const clockMatch = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (clockMatch) {
    const first = Number(clockMatch[1]);
    const second = Number(clockMatch[2]);
    const third = clockMatch[3] ? Number(clockMatch[3]) : 0;

    return first * 3600 + second * 60 + third;
  }

  return 0;
};

export const parseIntervalHour = (value) => {
  const text = String(value || "").trim().toLowerCase();

  if (!text || text === "daily") return null;

  const numeric = text.match(/^(\d{1,2})/);

  if (!numeric) return null;

  let hour = Number(numeric[1]);

  if (text.includes("pm") && hour < 12) hour += 12;
  if (text.includes("am") && hour === 12) hour = 0;

  return Number.isFinite(hour) ? hour : null;
};

export const formatHourLabel = (hour) => {
  if (hour === null || hour === undefined) return "Daily";

  const suffix = hour >= 12 ? "PM" : "AM";
  const standardHour = hour % 12 === 0 ? 12 : hour % 12;

  return `${String(standardHour).padStart(2, "0")}:00 ${suffix}`;
};

export const normalizeKpiDumpRows = ({
  rows = [],
  employees = [],
  dumpDate = "2026-07-07",
}) => {
  return rows
    .map((row, index) => {
      const employeeName = findValue(row, [
        "Name",
        "Agent Name",
        "Employee Name",
        "Employee",
      ]);

      const sibId = findValue(row, [
        "SIB ID",
        "SIB-ID",
        "SIB_ID",
        "Employee ID",
        "Employee Number",
        "ID",
      ]);

      const matchingEmployee = employees.find((employee) => {
        const empName = String(employee.employee_name || "").toLowerCase();
        const empId = String(employee.employee_id || "").toLowerCase();
        const empNumber = String(employee.employee_number || "").toLowerCase();

        return (
          (employeeName && empName === employeeName.toLowerCase()) ||
          (sibId && empId === sibId.toLowerCase()) ||
          (sibId && empNumber === sibId.toLowerCase())
        );
      });

      const interval = findValue(row, ["Interval"], "Daily");
      const hour = parseIntervalHour(interval);

      const expectedSeconds = parseNumber(
        findValue(row, ["Expected Hours(sec)", "Expected Hours sec"])
      );

      const loggedSeconds = parseTimeToSeconds(
        findValue(row, ["Actual Logged Time", "Logged Time"])
      );

      const handledCalls = parseNumber(findValue(row, ["Handled Calls"]));
      const avgTalkTime = parseNumber(
        findValue(row, ["AVG Talk Time", "Avg Talk Time"])
      );
      const avgHoldTime = parseNumber(
        findValue(row, ["AVG Hold Time", "Avg Hold Time"])
      );
      const availableSeconds = parseTimeToSeconds(
        findValue(row, ["Avail Time", "Available Time"])
      );
      const phoneOccupancy = parseNumber(findValue(row, ["Phone Occupancy"]));
      const availableEmailCapacity = parseNumber(
        findValue(row, [
          "Available Email Capacity (email)",
          "Available Email Capacity",
        ])
      );
      const targetEmails = parseNumber(
        findValue(row, ["Target # of Emails", "Target Emails"])
      );
      const actualEmails = parseNumber(
        findValue(row, ["Actual # of Emails (Email/Hour)", "Actual Emails"])
      );
      const emailUtilization = parseNumber(
        findValue(row, ["Utilization (Email)", "Email Utilization"])
      );
      const efficiency = parseNumber(
        findValue(row, ["Actual Efficiency", "Efficiency"])
      );

      const taskOrder = findValue(row, ["Task Order", "TaskOrder"]);
      const heroDash = findValue(row, ["HeroDash", "Hero Dash"]);
      const msd = findValue(row, ["MSD"]);

      return {
        id: `kpi_${Date.now()}_${index}`,
        date: dumpDate,
        employeeId: matchingEmployee?.id || sibId || employeeName,
        employeeCode: sibId || matchingEmployee?.employee_id || "",
        employeeName:
          employeeName || matchingEmployee?.employee_name || "Unknown Employee",
        position: matchingEmployee?.position || "",
        team: matchingEmployee?.team || "",
        interval: interval || formatHourLabel(hour),
        hour,
        expectedSeconds,
        loggedSeconds,
        handledCalls,
        avgTalkTime,
        avgHoldTime,
        availableSeconds,
        phoneOccupancy,
        availableEmailCapacity,
        targetEmails,
        actualEmails,
        emailUtilization,
        efficiency,
        taskOrder,
        heroDash,
        msd,
      };
    })
    .filter((row) => row.employeeName && row.employeeName !== "Unknown Employee");
};

export const aggregateImportedDailyRecords = (records = []) => {
  const grouped = new Map();

  records.forEach((record) => {
    const key = record.employeeId;

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...record,
        interval: "Daily",
        hour: null,
        expectedSeconds: 0,
        loggedSeconds: 0,
        handledCalls: 0,
        avgTalkTime: 0,
        avgHoldTime: 0,
        availableSeconds: 0,
        phoneOccupancy: 0,
        availableEmailCapacity: 0,
        targetEmails: 0,
        actualEmails: 0,
        emailUtilization: 0,
        efficiency: 0,
        _talkWeighted: 0,
        _holdWeighted: 0,
        _occupancySum: 0,
        _efficiencySum: 0,
        _count: 0,
      });
    }

    const current = grouped.get(key);

    current.expectedSeconds += record.expectedSeconds || 0;
    current.loggedSeconds += record.loggedSeconds || 0;
    current.handledCalls += record.handledCalls || 0;
    current.availableSeconds += record.availableSeconds || 0;
    current.availableEmailCapacity += record.availableEmailCapacity || 0;
    current.targetEmails += record.targetEmails || 0;
    current.actualEmails += record.actualEmails || 0;
    current._talkWeighted += (record.avgTalkTime || 0) * (record.handledCalls || 0);
    current._holdWeighted += (record.avgHoldTime || 0) * (record.handledCalls || 0);
    current._occupancySum += record.phoneOccupancy || 0;
    current._efficiencySum += record.efficiency || 0;
    current._count += 1;
  });

  return Array.from(grouped.values()).map((record) => {
    const calls = record.handledCalls || 0;
    const count = record._count || 1;

    const {
      _talkWeighted,
      _holdWeighted,
      _occupancySum,
      _efficiencySum,
      _count,
      ...cleanRecord
    } = record;

    return {
      ...cleanRecord,
      avgTalkTime: calls > 0 ? Math.round(_talkWeighted / calls) : 0,
      avgHoldTime: calls > 0 ? Math.round(_holdWeighted / calls) : 0,
      phoneOccupancy: Math.round(_occupancySum / count),
      emailUtilization:
        record.targetEmails > 0
          ? Math.round((record.actualEmails / record.targetEmails) * 100)
          : 0,
      efficiency: Math.round((_efficiencySum / count) * 10) / 10,
    };
  });
};

export const filterImportedKpiRecords = ({
  kpiRecords = [],
  selectedDate,
  fromHour = 8,
  toHour = 17,
  selectedEmployeeIds = ["all"],
  intervalType = "Daily",
}) => {
  const selectedSet = new Set(selectedEmployeeIds);

  const filtered = (kpiRecords || []).filter((record) => {
    const matchesDate = !selectedDate || record.date === selectedDate;

    const matchesEmployee =
      selectedSet.has("all") ||
      selectedEmployeeIds.length === 0 ||
      selectedSet.has(record.employeeId);

    const matchesHour =
      record.hour === null ||
      record.hour === undefined ||
      (record.hour >= fromHour && record.hour <= toHour);

    return matchesDate && matchesEmployee && matchesHour;
  });

  if (intervalType === "Hourly") {
    return filtered;
  }

  return aggregateImportedDailyRecords(filtered);
};
