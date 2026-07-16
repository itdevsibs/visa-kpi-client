import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import RawKpiImportCard from "../../../components/settings/RawKpiImportCard.jsx";
import { Button } from "../../../components/ui/button.jsx";
import { useUser } from "../../../services/context/UserContext.jsx";
import {
  getEmployeeAssignments,
  saveEmployeeAssignments,
  syncEmployeeAssignmentsFromKronos,
} from "../../../lib/axios/employeeAssignments.js";
import {
  filterEmployeeAssignments,
  getAssignmentStats,
  getChangedAssignments,
  normalizeEmployeeAssignment,
} from "../../../lib/utils/employeeAssignments.js";

const DEFAULT_TASK_ORDERS = [
  "GSS 2.0 TO4 - PAC",
  "GSS 2.0 TO10 - SEASIA",
  "GSS 2.0 TO12 - NICE",
  "GSS 2.0 TO14 - NESAMI",
  "GSS 2.0 TO16 - SEURECA",
];

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 hover:border-slate-300 focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

function normalizeRole(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isAdministrator(user) {
  return ["admin", "administrator", "super_admin", "superadmin", "super_administrator", "superadministrator"].includes(
    normalizeRole(user?.role),
  );
}

function StatCard({ icon: Icon, label, value, description, tone = "blue" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function MessageBanner({ type = "success", children, onClose }) {
  const isError = type === "error";

  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
        isError
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {isError ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <span>{children}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded-md px-2 py-0.5 text-xs font-black hover:bg-black/5"
      >
        Close
      </button>
    </div>
  );
}

function TaskOrderField({ employee, taskOrderOptions, disabled, onChange }) {
  const listId = `task-orders-${employee.sibsId.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <div className="min-w-[240px]">
      <input
        list={listId}
        value={employee.taskOrder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="Select or type Task Order"
        className={INPUT_CLASS}
      />
      <datalist id={listId}>
        {taskOrderOptions.map((taskOrder) => (
          <option key={taskOrder} value={taskOrder} />
        ))}
      </datalist>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white">
      <RefreshCw className="h-8 w-8 animate-spin text-[#0D4676]" />
      <div className="text-center">
        <p className="text-sm font-extrabold text-slate-800">
          Loading employee assignments
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Retrieving the current active US Visa roster directly from Kronos.
        </p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const hasAdminAccess = isAdministrator(user);

  const [originalEmployees, setOriginalEmployees] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [completenessFilter, setCompletenessFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const applyEmployeeRows = useCallback((rows) => {
    const normalizedRows = (Array.isArray(rows) ? rows : [])
      .map(normalizeEmployeeAssignment)
      .filter((employee) => employee.sibsId && employee.agentName)
      .sort((a, b) =>
        a.agentName.localeCompare(b.agentName, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );

    setOriginalEmployees(normalizedRows);
    setEmployees(normalizedRows.map((employee) => ({ ...employee })));
  }, []);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const rows = await getEmployeeAssignments();
      applyEmployeeRows(rows);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to load employee assignments.",
      });
    } finally {
      setLoading(false);
    }
  }, [applyEmployeeRows]);

  useEffect(() => {
    // The callback performs the initial API synchronization for this page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssignments();
  }, [loadAssignments]);

  const changedEmployees = useMemo(
    () => getChangedAssignments(originalEmployees, employees),
    [employees, originalEmployees],
  );

  const stats = useMemo(() => getAssignmentStats(employees), [employees]);

  const visibleEmployees = useMemo(
    () =>
      filterEmployeeAssignments(
        employees,
        searchQuery,
        completenessFilter,
      ),
    [completenessFilter, employees, searchQuery],
  );

  const taskOrderOptions = useMemo(() => {
    const options = new Set(DEFAULT_TASK_ORDERS);

    employees.forEach((employee) => {
      if (employee.taskOrder) options.add(employee.taskOrder);
    });

    return [...options].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
    );
  }, [employees]);

  useEffect(() => {
    if (!changedEmployees.length) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [changedEmployees.length]);

  function updateEmployee(sibsId, field, value) {
    setEmployees((currentEmployees) =>
      currentEmployees.map((employee) =>
        employee.sibsId === sibsId
          ? {
              ...employee,
              [field]: value,
            }
          : employee,
      ),
    );
  }

  function resetChanges() {
    setEmployees(originalEmployees.map((employee) => ({ ...employee })));
    setMessage(null);
  }

  async function handleSyncKronos() {
    if (!hasAdminAccess || syncing || saving) return;

    if (
      changedEmployees.length > 0 &&
      !window.confirm(
        "You have unsaved assignment changes. Synchronizing Kronos will discard those changes. Continue?",
      )
    ) {
      return;
    }

    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncEmployeeAssignmentsFromKronos();
      applyEmployeeRows(result?.data || []);

      const summary = result?.summary || {};
      setMessage({
        type: "success",
        text:
          result?.message ||
          `Kronos synchronized successfully. ${summary.eligible || 0} employees are ready for assignment.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to synchronize Kronos employees.",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveChanges() {
    if (!hasAdminAccess || !changedEmployees.length || saving || syncing) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload = changedEmployees.map((employee) => ({
        sibsId: employee.sibsId,
        taskOrder: employee.taskOrder,
        heroDash: employee.heroDash,
        msd: employee.msd,
      }));

      const result = await saveEmployeeAssignments(payload);
      applyEmployeeRows(result?.data || []);
      setMessage({
        type: "success",
        text:
          result?.message ||
          `${payload.length} employee assignment${payload.length === 1 ? "" : "s"} saved successfully.`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to save employee assignments.",
      });
    } finally {
      setSaving(false);
    }
  }

  const controlsDisabled = loading || syncing || saving || !hasAdminAccess;

  return (
    <div className="min-h-full bg-slate-50 px-3 py-4 sm:px-5 lg:px-7 lg:py-6">
      <div className="mx-auto w-full max-w-[1700px] space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0D4676] text-white shadow-sm">
                  <Database className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    Employee Source Assignment
                  </h1>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Connect each Kronos employee to their Task Order, HeroDash name, and MSD name.
                  </p>
                </div>
              </div>

              {!hasAdminAccess ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  <ShieldAlert className="h-4 w-4" />
                  Administrator access is required to edit assignments.
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="outline"
                onClick={resetChanges}
                disabled={!changedEmployees.length || controlsDisabled}
                className="h-10 rounded-xl border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSyncKronos}
                disabled={controlsDisabled}
                className="h-10 rounded-xl border-[#0D4676] bg-white px-4 text-sm font-extrabold text-[#0D4676] hover:bg-blue-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing Kronos..." : "Sync Kronos"}
              </Button>

              <Button
                type="button"
                onClick={handleSaveChanges}
                disabled={!changedEmployees.length || controlsDisabled}
                className="h-10 rounded-xl bg-[#0D4676] px-4 text-sm font-extrabold text-white shadow-sm hover:bg-[#063C69]"
              >
                <Save className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
                {saving
                  ? "Saving..."
                  : changedEmployees.length
                    ? `Save ${changedEmployees.length} Change${changedEmployees.length === 1 ? "" : "s"}`
                    : "Save Changes"}
              </Button>
            </div>
          </div>
        </section>

        {message ? (
          <MessageBanner
            type={message.type}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </MessageBanner>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={UsersRound}
                label="Kronos Employees"
                value={stats.total}
                description="Employees available for assignment"
                tone="blue"
              />
              <StatCard
                icon={Database}
                label="Task Order Assigned"
                value={stats.withTaskOrder}
                description={`${stats.total - stats.withTaskOrder} still missing`}
                tone="slate"
              />
              <StatCard
                icon={UserRoundCheck}
                label="HeroDash Mapped"
                value={stats.withHeroDash}
                description={`${stats.total - stats.withHeroDash} still missing`}
                tone="amber"
              />
              <StatCard
                icon={CheckCircle2}
                label="Fully Mapped"
                value={stats.complete}
                description={`${stats.incomplete} incomplete employee mappings`}
                tone="green"
              />
            </section>

            <RawKpiImportCard
              disabled={!hasAdminAccess || syncing || saving}
              hasUnsavedAssignments={changedEmployees.length > 0}
            />

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-black text-slate-900">
                      Employee Assignment List
                    </h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Only current active US Visa employees returned by Kronos appear here. Task Order, HeroDash, and MSD values are maintained in this system for matching.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 sm:w-[320px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search SIB-ID, employee, Task Order..."
                        className={`${INPUT_CLASS} pl-9`}
                      />
                    </div>

                    <select
                      value={completenessFilter}
                      onChange={(event) => setCompletenessFilter(event.target.value)}
                      className={`${INPUT_CLASS} sm:w-[160px]`}
                    >
                      <option value="all">All Employees</option>
                      <option value="complete">Fully Mapped</option>
                      <option value="incomplete">Incomplete</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1180px] border-collapse">
                  <thead className="bg-[#0D4676] text-white">
                    <tr>
                      <th className="w-[150px] px-4 py-3.5 text-left text-xs font-black uppercase tracking-[0.08em]">
                        SIB-ID
                      </th>
                      <th className="min-w-[250px] px-4 py-3.5 text-left text-xs font-black uppercase tracking-[0.08em]">
                        Agent Name
                      </th>
                      <th className="min-w-[280px] px-4 py-3.5 text-left text-xs font-black uppercase tracking-[0.08em]">
                        Task Order
                      </th>
                      <th className="min-w-[230px] px-4 py-3.5 text-left text-xs font-black uppercase tracking-[0.08em]">
                        HeroDash
                      </th>
                      <th className="min-w-[230px] px-4 py-3.5 text-left text-xs font-black uppercase tracking-[0.08em]">
                        MSD
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleEmployees.map((employee) => (
                      <tr
                        key={employee.sibsId}
                        className="bg-white transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-3 align-middle">
                          <span className="whitespace-nowrap text-sm font-black text-[#0D4676]">
                            {employee.sibsId}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="text-sm font-extrabold text-slate-900">
                            {employee.agentName}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <TaskOrderField
                            employee={employee}
                            taskOrderOptions={taskOrderOptions}
                            disabled={controlsDisabled}
                            onChange={(value) =>
                              updateEmployee(employee.sibsId, "taskOrder", value)
                            }
                          />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <input
                            value={employee.heroDash}
                            onChange={(event) =>
                              updateEmployee(
                                employee.sibsId,
                                "heroDash",
                                event.target.value,
                              )
                            }
                            disabled={controlsDisabled}
                            placeholder="HeroDash username or name"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <input
                            value={employee.msd}
                            onChange={(event) =>
                              updateEmployee(
                                employee.sibsId,
                                "msd",
                                event.target.value,
                              )
                            }
                            disabled={controlsDisabled}
                            placeholder="MSD name"
                            className={INPUT_CLASS}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 p-3 lg:hidden">
                {visibleEmployees.map((employee) => (
                  <article
                    key={employee.sibsId}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="border-b border-slate-100 pb-3">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-[#0D4676]">
                        {employee.sibsId}
                      </p>
                      <h3 className="mt-1 text-base font-black text-slate-900">
                        {employee.agentName}
                      </h3>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          Task Order
                        </label>
                        <input
                          list={`mobile-task-orders-${employee.sibsId.replace(/[^a-z0-9]/gi, "-")}`}
                          value={employee.taskOrder}
                          onChange={(event) =>
                            updateEmployee(
                              employee.sibsId,
                              "taskOrder",
                              event.target.value,
                            )
                          }
                          disabled={controlsDisabled}
                          placeholder="Select or type Task Order"
                          className={INPUT_CLASS}
                        />
                        <datalist
                          id={`mobile-task-orders-${employee.sibsId.replace(/[^a-z0-9]/gi, "-")}`}
                        >
                          {taskOrderOptions.map((taskOrder) => (
                            <option key={taskOrder} value={taskOrder} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          HeroDash
                        </label>
                        <input
                          value={employee.heroDash}
                          onChange={(event) =>
                            updateEmployee(
                              employee.sibsId,
                              "heroDash",
                              event.target.value,
                            )
                          }
                          disabled={controlsDisabled}
                          placeholder="HeroDash username or name"
                          className={INPUT_CLASS}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
                          MSD
                        </label>
                        <input
                          value={employee.msd}
                          onChange={(event) =>
                            updateEmployee(
                              employee.sibsId,
                              "msd",
                              event.target.value,
                            )
                          }
                          disabled={controlsDisabled}
                          placeholder="MSD name"
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {visibleEmployees.length === 0 ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
                  <Search className="h-9 w-9 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-800">
                    No employees found
                  </p>
                  <p className="mt-1 max-w-md text-xs font-medium text-slate-500">
                    Adjust your search or filter, or synchronize Kronos to retrieve the current US Visa roster.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {visibleEmployees.length} of {employees.length} employees
                </span>
                <span>
                  {changedEmployees.length > 0
                    ? `${changedEmployees.length} unsaved change${changedEmployees.length === 1 ? "" : "s"}`
                    : "All changes are saved"}
                </span>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
