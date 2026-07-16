function cleanText(value) {
  return String(value ?? "").trim();
}

export function normalizeEmployeeAssignment(row = {}) {
  return {
    id: Number(row.id || 0),
    employeeUid: cleanText(row.employeeUid || row.employee_uid),
    sibsId: cleanText(
      row.sibsId ||
        row.sibs_id ||
        row.employeeId ||
        row.employee_id ||
        row.employeeNumber ||
        row.employee_number,
    ),
    agentName: cleanText(
      row.agentName || row.agent_name || row.employeeName || row.employee_name,
    ),
    taskOrder: cleanText(
      row.taskOrder || row.task_order || row.assigned_sub_account,
    ),
    heroDash: cleanText(
      row.heroDash || row.herodash || row.hero_dash,
    ),
    msd: cleanText(row.msd || row.MSD),
    updatedAt: row.updatedAt || row.updated_at || null,
  };
}

function assignmentSignature(row = {}) {
  const normalized = normalizeEmployeeAssignment(row);

  return JSON.stringify({
    sibsId: normalized.sibsId,
    agentName: normalized.agentName,
    taskOrder: normalized.taskOrder,
    heroDash: normalized.heroDash,
    msd: normalized.msd,
  });
}

export function getChangedAssignments(originalRows = [], draftRows = []) {
  const originalBySibsId = new Map(
    originalRows.map((row) => {
      const normalized = normalizeEmployeeAssignment(row);
      return [normalized.sibsId.toUpperCase(), normalized];
    }),
  );

  return draftRows
    .map(normalizeEmployeeAssignment)
    .filter((row) => {
      const original = originalBySibsId.get(row.sibsId.toUpperCase());
      return !original || assignmentSignature(original) !== assignmentSignature(row);
    });
}

function isComplete(row = {}) {
  const normalized = normalizeEmployeeAssignment(row);
  return Boolean(
    normalized.taskOrder && normalized.heroDash && normalized.msd,
  );
}

export function getAssignmentStats(rows = []) {
  const normalizedRows = rows.map(normalizeEmployeeAssignment);
  const complete = normalizedRows.filter(isComplete).length;

  return {
    total: normalizedRows.length,
    withTaskOrder: normalizedRows.filter((row) => row.taskOrder).length,
    withHeroDash: normalizedRows.filter((row) => row.heroDash).length,
    withMsd: normalizedRows.filter((row) => row.msd).length,
    complete,
    incomplete: normalizedRows.length - complete,
  };
}

export function filterEmployeeAssignments(
  rows = [],
  searchQuery = "",
  completenessFilter = "all",
) {
  const query = cleanText(searchQuery).toLowerCase();
  const filter = cleanText(completenessFilter).toLowerCase() || "all";

  return rows
    .map(normalizeEmployeeAssignment)
    .filter((row) => {
      const complete = isComplete(row);

      if (filter === "complete" && !complete) return false;
      if (filter === "incomplete" && complete) return false;

      if (!query) return true;

      return [
        row.sibsId,
        row.agentName,
        row.taskOrder,
        row.heroDash,
        row.msd,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) =>
      a.agentName.localeCompare(b.agentName, undefined, {
        sensitivity: "base",
        numeric: true,
      }),
    );
}
