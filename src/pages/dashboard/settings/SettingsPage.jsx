import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button.jsx";

import {
  AlertCircle,
  CheckCircle2,
  Database,
  RefreshCw,
  RotateCcw,
  Save,
  Edit2,
  History,
  Eye,
  ArrowUpDown,
  Download,
  Upload,
  X,
  FileSpreadsheet,
  Plus,
} from "lucide-react";

import * as XLSX from "xlsx";

import {
  bulkUpsertUsVisaKpiEmployees,
  createUsVisaKpiEmployee,
  getUsVisaKpiEmployees,
  importOfficialUsVisaRoster,
  syncUsVisaKpiEmployeesFromKpi,
  updateUsVisaKpiEmployee,
} from "../../../services/api/usVisaKpiSettingsApi.js";

import BaseModal from "../../../components/modals/BaseModal.jsx";
import SettingsHeader from "../../../components/settings/SettingsHeader.jsx";
import RosterUploadHistoryCard from "../../../components/settings/RosterUploadHistoryCard.jsx";

const DEFAULT_TASK_ORDER_OPTIONS = [
  "GSS 2.0 TO10 - SEASIA",
  "GSS 2.0 TO12 - NICE",
  "GSS 2.0 TO14 - NESAMI",
  "GSS 2.0 TO16 - SEURECA",
];


const createEmptyEmployeeForm = () => ({
  id: `emp_${Date.now()}`,
  employee_uid: `emp_${Date.now()}`,
  employee_id: "",
  employee_number: "",
  employee_name: "",
  email: "",
  position: "",
  department: "US Visa Operations",
  team: "",
  supervisor: "",
  account_name: "US Visa",

  status: "Active",
  employment_status: "Active",

  task_order: "",
  assigned_sub_account: "",
  herodash: "",
  msd: "",

  include_dashboard: true,
  include_reports: true,
  kpi_tracking_enabled: true,

  aliases: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});


export default function SettingsPage() {
  const { employees, setEmployees, syncLogs, setSyncLogs, userRole } =
    useRoster();

  const taskOrderFileRef = useRef(null);
  const officialRosterFileRef = useRef(null);

  const [isSyncing, setIsSyncing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [managementPage, setManagementPage] = useState(1);
  const [managementPageSize] = useState(10);

  const [sortField, setSortField] = useState("employee_name");
  const [sortOrder, setSortOrder] = useState("asc");

  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState(createEmptyEmployeeForm);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [isKpiSyncing, setIsKpiSyncing] = useState(false);
  const [isOfficialRosterImporting, setIsOfficialRosterImporting] = useState(false);

  const [uploadLogs, setUploadLogs] = useState([
    {
      id: "upload_001",
      fileName: "US_Visa_KPI_Roster_July_2026.csv",
      uploadedBy: "Administrator",
      timestamp: "July 7, 2026, 10:35 AM",
      status: "Success",
      records: 58,
      added: 3,
      updated: 55,
      skipped: 0,
    },
  ]);

  const hasAdminAccess = userRole === "Administrator";
  const safeSyncLogs = Array.isArray(syncLogs) ? syncLogs : [];

  const handleToast = (message, duration = 3000) => {
    setNotification(message);
    setTimeout(() => setNotification(null), duration);
  };

  const fetchBackendEmployees = useCallback(async () => {
    try {
      setSettingsLoading(true);

      const backendEmployees = await getUsVisaKpiEmployees();

      if (backendEmployees.length > 0) {
        setEmployees(backendEmployees);
      }
    } catch (error) {
      console.error(error);
      handleToast(error.message || "Unable to load backend employee settings.");
    } finally {
      setSettingsLoading(false);
    }
  }, [setEmployees]);

  useEffect(() => {
    fetchBackendEmployees();
  }, [fetchBackendEmployees]);


  const isUsVisaEmployee = (emp) => {
    const accountName = String(emp.account_name || "US Visa").toLowerCase();
    return accountName.includes("us visa");
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

  const getDisplaySibId = (emp) => {
    return emp.employee_id || emp.employee_number || "Unassigned";
  };

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

      const newLog = {
        id: `log_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        performedBy: "Administrator",
        result: "Success",
        details:
          "Manual synchronization requested by administrator. Fetched all US Visa employees and verified task order assignment fields.",
        summary: {
          retrieved: (employees || []).filter(isUsVisaEmployee).length,
          added: 0,
          updated: (employees || []).filter(isUsVisaEmployee).length,
          markedInactive: 0,
        },
      };

      setSyncLogs((prev) => [newLog, ...(prev || [])]);
      setIsSyncing(false);
      handleToast("US Visa employee sync completed successfully.");
    }, 1200);
  };

  const normalizeHeader = (header) => {
    return String(header || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  };

  const findValue = (row, keys, fallback = "") => {
    const normalizedRow = {};

    Object.keys(row || {}).forEach((key) => {
      normalizedRow[normalizeHeader(key)] = row[key];
    });

    for (const key of keys) {
      const normalizedKey = normalizeHeader(key);
      const value = normalizedRow[normalizedKey];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return String(value).trim();
      }
    }

    return fallback;
  };

  const handleDownloadTaskOrderDump = () => {
    const usVisaEmployees = (employees || []).filter(isUsVisaEmployee);

    const rows =
      usVisaEmployees.length > 0
        ? usVisaEmployees.map((emp) => ({
            "SIB ID": emp.employee_id || emp.employee_number || "",
            "Agent Name": emp.employee_name || "",
            "Task Order": getTaskOrder(emp),
            HeroDash: getHeroDash(emp),
            MSD: getMsd(emp),
          }))
        : [
            {
              "SIB ID": "SIB-6677",
              "Agent Name": "Sample Agent",
              "Task Order": "GSS 2.0 TO10 - SEASIA",
              HeroDash: "HeroDash Queue 1",
              MSD: "MSD Queue 1",
            },
          ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Task Order Dump");
    XLSX.writeFile(workbook, "US_Visa_Task_Order_Assignment_Dump.xlsx");
  };

  const handleImportTaskOrderDump = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const name = file.name.toLowerCase();
    const isAllowed =
      name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");

    if (!isAllowed) {
      handleToast("Invalid file type. Upload only .xlsx, .xls, or .csv files.");
      event.target.value = "";
      return;
    }
  }, [applyEmployeeRows]);

  useEffect(() => {
    // The callback performs the initial API synchronization for this page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAssignments();
  }, [loadAssignments]);

            if (!sibId && !agentName) {
              skippedCount++;
              return;
            }

            const matchIndex = updatedEmployees.findIndex((emp) => {
              const empId = String(emp.employee_id || "").toLowerCase();
              const empNumber = String(emp.employee_number || "").toLowerCase();
              const empName = String(emp.employee_name || "").toLowerCase();

              return (
                (sibId && empId === sibId.toLowerCase()) ||
                (sibId && empNumber === sibId.toLowerCase()) ||
                (agentName && empName === agentName.toLowerCase())
              );
            });

            if (matchIndex < 0) {
              skippedCount++;
              return;
            }

            const current = updatedEmployees[matchIndex];
            const timestamp = new Date().toISOString();

            updatedEmployees[matchIndex] = {
              ...current,
              account_name: "US Visa",
              task_order: taskOrder || getTaskOrder(current),
              herodash: herodash || getHeroDash(current),
              msd: msd || getMsd(current),
              task_order_assigned_at: timestamp,
              updated_at: timestamp,

              // Compatibility with older parts of your project that still read assigned_sub_account.
              assigned_sub_account: taskOrder || getTaskOrder(current),
              sub_account_assigned_at: timestamp,
            };

            updatedCount++;
          });

          return updatedEmployees;
        });

        const status = skippedCount > 0 ? "Warning" : "Success";

        setUploadLogs((prev) => [
          {
            id: `task_order_upload_${Date.now()}`,
            fileName: file.name,
            uploadedBy: "Administrator",
            timestamp: new Date().toLocaleString([], {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            status,
            records: rows.length,
            added: 0,
            updated: updatedCount,
            skipped: skippedCount,
          },
          ...prev,
        ]);

        handleToast(
          `Task order dump imported. Updated: ${updatedCount}, Skipped: ${skippedCount}.`
        );
      } catch (error) {
        console.error(error);
        handleToast("Unable to read this task order file.");
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImportOfficialRoster = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const name = file.name.toLowerCase();
    const isAllowed =
      name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");

    if (!isAllowed) {
      handleToast("Invalid file type. Upload only .xlsx, .xls, or .csv files.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = async (readerEvent) => {
      try {
        setIsOfficialRosterImporting(true);

        const arrayBuffer = readerEvent.target?.result;
        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
        });
        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          handleToast("No worksheet found in this official roster file.");
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });

        if (!rows.length) {
          handleToast("No official roster rows found in the file.");
          return;
        }

        const result = await importOfficialUsVisaRoster({
          rows,
          deactivateMissing: true,
        });

        const backendEmployees = result.employees || [];
        const summary = result.summary || {};

        setEmployees(backendEmployees);
        setManagementPage(1);
        setSelectedStatusFilter("all");

        setUploadLogs((prev) => [
          {
            id: `official_roster_upload_${Date.now()}`,
            fileName: file.name,
            uploadedBy: "Administrator",
            timestamp: new Date().toLocaleString([], {
              year: "numeric",
              month: "short",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
            status: summary.skipped > 0 ? "Warning" : "Success",
            records: summary.totalRows || rows.length,
            added: summary.added || 0,
            updated: summary.updated || 0,
            skipped: summary.skipped || 0,
          },
          ...prev,
        ]);

        const newLog = {
          id: `official_roster_import_${Date.now()}`,
          date: new Date().toISOString().split("T")[0],
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          performedBy: "Administrator",
          result: "Success",
          details: `Imported official US Visa roster. Added ${summary.added || 0}, updated ${summary.updated || 0}, deactivated ${summary.deactivated || 0}, skipped ${summary.skipped || 0}.`,
          summary: {
            retrieved: summary.officialRows || 0,
            added: summary.added || 0,
            updated: summary.updated || 0,
            markedInactive: summary.deactivated || 0,
          },
        };

        setSyncLogs((prev) => [newLog, ...(prev || [])]);

        handleToast(
          `Official roster imported. Added: ${summary.added || 0}, Updated: ${summary.updated || 0}, Deactivated: ${summary.deactivated || 0}.`
        );
      } catch (error) {
        console.error(error);
        handleToast(error.message || "Unable to import official roster.");
      } finally {
        setIsOfficialRosterImporting(false);
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((emp) => {
      if (!isUsVisaEmployee(emp)) return false;

      const name = String(emp.employee_name || "").toLowerCase();
      const employeeId = String(emp.employee_id || "").toLowerCase();
      const employeeNumber = String(emp.employee_number || "").toLowerCase();
      const taskOrder = String(getTaskOrder(emp)).toLowerCase();
      const herodash = String(getHeroDash(emp)).toLowerCase();
      const msd = String(getMsd(emp)).toLowerCase();
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        name.includes(query) ||
        employeeId.includes(query) ||
        employeeNumber.includes(query) ||
        taskOrder.includes(query) ||
        herodash.includes(query) ||
        msd.includes(query);

      const matchesStatus =
        selectedStatusFilter === "all" || emp.status === selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, selectedStatusFilter]);

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

        return {
          ...emp,
          ...updates,
          updated_at: timestamp,
          ...(shouldUpdateTaskOrder
            ? {
                task_order_assigned_at: timestamp,
                assigned_sub_account: updates.task_order,
                sub_account_assigned_at: timestamp,
              }
            : {}),
        };
      })
    );
  };

  const handleSaveAssignments = async () => {
    if (!hasAdminAccess) {
      handleToast("Access Denied: Administrative permissions required.");
      return;
    }

    try {
      setSettingsSaving(true);
      const usVisaEmployees = (employees || []).filter(isUsVisaEmployee);
      const result = await bulkUpsertUsVisaKpiEmployees(usVisaEmployees);

      setEmployees(result.employees);
      handleToast(
        `Task order assignments saved. Added: ${result.summary?.added ?? 0}, Updated: ${result.summary?.updated ?? 0}, Skipped: ${result.summary?.skipped ?? 0}.`
      );
    } catch (error) {
      console.error(error);
      handleToast(error.message || "Unable to save task order assignments.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveEmployeeConfig = async (updatedEmp) => {
    const timestamp = new Date().toISOString();

    const employeePayload = {
      ...updatedEmp,
      updated_at: timestamp,
      assigned_sub_account: updatedEmp.task_order || "",
      sub_account_assigned_at:
        updatedEmp.task_order_assigned_at || timestamp,
    };

    try {
      setSettingsSaving(true);
      const savedEmployee = await updateUsVisaKpiEmployee(
        updatedEmp.employee_uid || updatedEmp.id,
        employeePayload
      );

      setEmployees((prev) =>
        (prev || []).map((emp) =>
          emp.id === updatedEmp.id || emp.employee_uid === updatedEmp.employee_uid
            ? savedEmployee
            : emp
        )
      );

      setEditingEmployee(null);
      handleToast(`Successfully updated ${savedEmployee.employee_name}.`);
    } catch (error) {
      console.error(error);
      handleToast(error.message || "Unable to update this employee.");
    } finally {
      setSettingsSaving(false);
    }
  };


  const handleAddEmployee = async () => {
    if (!hasAdminAccess) {
      handleToast("Access Denied: Only Administrators can add employees.");
      return;
    }

    const employeeName = String(newEmployee.employee_name || "").trim();
    const employeeId = String(newEmployee.employee_id || "").trim();
    const email = String(newEmployee.email || "").trim().toLowerCase();

    if (!employeeName) {
      handleToast("Employee name is required.");
      return;
    }

    if (!employeeId) {
      handleToast("SIB ID is required.");
      return;
    }

    try {
      setSettingsSaving(true);

      const savedEmployee = await createUsVisaKpiEmployee({
        ...newEmployee,
        id: newEmployee.employee_uid || newEmployee.id || `emp_${Date.now()}`,
        employee_uid: newEmployee.employee_uid || newEmployee.id || `emp_${Date.now()}`,
        employee_id: employeeId,
        employee_number: employeeId,
        employee_name: employeeName,
        email,
        account_name: "US Visa",
        employment_status:
          newEmployee.status === "Inactive" ? "Inactive" : "Active",
        assigned_sub_account: newEmployee.task_order || "",
      });

      setEmployees((prev) => [savedEmployee, ...(prev || [])]);

      setUploadLogs((prev) => [
        {
          id: `manual_add_${Date.now()}`,
          fileName: "Manual Employee Add",
          uploadedBy: "Administrator",
          timestamp: new Date().toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "Success",
          records: 1,
          added: 1,
          updated: 0,
          skipped: 0,
        },
        ...prev,
      ]);

      setIsAddEmployeeOpen(false);
      setNewEmployee(createEmptyEmployeeForm());
      setManagementPage(1);
      handleToast(`Successfully added ${savedEmployee.employee_name}.`);
    } catch (error) {
      console.error(error);
      handleToast(error.message || "Unable to add this employee.");
    } finally {
      setSettingsSaving(false);
    }
  };


  const handleSyncEmployeesFromKpi = async () => {
    if (!hasAdminAccess) {
      handleToast("Access Denied: Only Administrators can sync KPI employees.");
      return;
    }

    try {
      setIsKpiSyncing(true);

      const result = await syncUsVisaKpiEmployeesFromKpi();
      const backendEmployees = result.employees || [];
      const summary = result.summary || {};

      setEmployees(backendEmployees);
      setManagementPage(1);

      const newLog = {
        id: `kpi_employee_sync_${Date.now()}`,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        performedBy: "Administrator",
        result: "Success",
        details: `Synced official employee settings from KPI summary date ${summary.selectedDate || "latest"}. Added ${summary.added || 0}, matched ${summary.matched || 0}, skipped ${summary.skipped || 0}.`,
        summary: {
          retrieved: summary.sourceAgents || 0,
          added: summary.added || 0,
          updated: summary.matched || 0,
          markedInactive: 0,
        },
      };

      setSyncLogs((prev) => [newLog, ...(prev || [])]);
      setUploadLogs((prev) => [
        {
          id: `kpi_employee_sync_upload_${Date.now()}`,
          fileName: "KPI Summary Employee Sync",
          uploadedBy: "Administrator",
          timestamp: new Date().toLocaleString([], {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "Success",
          records: summary.sourceAgents || 0,
          added: summary.added || 0,
          updated: summary.matched || 0,
          skipped: summary.skipped || 0,
        },
        ...prev,
      ]);

      handleToast(
        `KPI employee sync completed. Added: ${summary.added || 0}, Matched: ${summary.matched || 0}, Skipped: ${summary.skipped || 0}.`
      );
    } catch (error) {
      console.error(error);
      handleToast(error.message || "Unable to sync employees from KPI data.");
    } finally {
      setIsKpiSyncing(false);
    }
  };

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
    <div className="space-y-8 pb-10">
      {notification && (
        <div className="animate-slide-up-fade fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-mono text-white shadow-2xl">
          <Settings className="h-4 w-4 text-blue-400 animate-sibs-pulse" />
          <span>{notification}</span>
        </div>
      )}

      {(settingsLoading || settingsSaving || isKpiSyncing) && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700">
          {settingsLoading
            ? "Loading backend employee settings..."
            : isKpiSyncing
              ? "Syncing employees from KPI data..."
              : "Saving employee settings to backend..."}
        </div>
      )}

      <SettingsHeader
        isSyncing={isSyncing}
        hasAdminAccess={hasAdminAccess}
        onSyncDatabase={handleFetchEmployees}
      />

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
          </div>

          {hasAdminAccess && (
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                ref={officialRosterFileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportOfficialRoster}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setNewEmployee(createEmptyEmployeeForm());
                  setIsAddEmployeeOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                <Plus className="h-3 w-3" />
                <span>Add Employee</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => officialRosterFileRef.current?.click()}
                disabled={isOfficialRosterImporting}
                className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                title="Import the official SIB-ID and Agent Name roster. Non-official KPI names will be excluded."
              >
                <Upload className={`h-3 w-3 ${isOfficialRosterImporting ? "animate-pulse" : ""}`} />
                <span>{isOfficialRosterImporting ? "Importing..." : "Import Official Roster"}</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleSyncEmployeesFromKpi}
                disabled={isKpiSyncing}
                className="flex items-center gap-1 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                title="Import missing employee names from the generated KPI summary"
              >
                <FileSpreadsheet className={`h-3 w-3 ${isKpiSyncing ? "animate-pulse" : ""}`} />
                <span>{isKpiSyncing ? "Syncing KPI..." : "Sync From KPI Data"}</span>
              </Button>

              <span className="mr-1 text-[10px] font-bold uppercase text-slate-400">
                Bulk ({selectedEmpIds.length}):
              </span>

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


          <div className="flex w-full items-center gap-1 text-xs sm:w-auto">
            <span className="font-mono text-slate-400">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setManagementPage(1);
              }}
              className="sibs-filter-input min-h-[36px] text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex w-full shrink-0 items-center justify-between gap-1 text-xs sm:ml-auto sm:w-auto sm:justify-start">
            <span className="shrink-0 font-mono text-slate-400">Sort By:</span>

            <Button
              variant="outline"
              onClick={() => {
                setSortField("employee_name");
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              }}
              className={`flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 ${
                sortField === "employee_name"
                  ? "font-semibold text-blue-600"
                  : "text-slate-600"
              }`}
            >
              <span>Name</span>
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setSortField("task_order");
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              }}
              className={`flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 ${
                sortField === "task_order"
                  ? "font-semibold text-blue-600"
                  : "text-slate-600"
              }`}
            >
              <span>Task Order</span>
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3 lg:hidden">
          {paginatedEmployees.length > 0 ? (
            paginatedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">
                      {emp.employee_name}
                    </p>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      {getDisplaySibId(emp)}
                    </p>
                  </div>

                  {hasAdminAccess && (
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.includes(emp.id)}
                      onChange={() => handleSelectRow(emp.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  <select
                    disabled={!hasAdminAccess}
                    value={getTaskOrder(emp)}
                    onChange={(e) =>
                      handleUpdateTaskAssignment(emp.id, {
                        task_order: e.target.value,
                      })
                    }
                    className="sibs-filter-input w-full text-xs"
                  >
                    <option value="">Select Task Order...</option>
                    {taskOrderOptions.map((taskOrder) => (
                      <option key={taskOrder} value={taskOrder}>
                        {taskOrder}
                      </option>
                    ))}
                  </select>

                  <input
                    disabled={!hasAdminAccess}
                    value={getHeroDash(emp)}
                    onChange={(e) =>
                      handleUpdateTaskAssignment(emp.id, {
                        herodash: e.target.value,
                      })
                    }
                    placeholder="HeroDash"
                    className="sibs-filter-input w-full text-xs"
                  />

                  <input
                    disabled={!hasAdminAccess}
                    value={getMsd(emp)}
                    onChange={(e) =>
                      handleUpdateTaskAssignment(emp.id, {
                        msd: e.target.value,
                      })
                    }
                    placeholder="MSD"
                    className="sibs-filter-input w-full text-xs"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
              No employees found matching criteria.
            </div>
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-slate-200 shadow-sm lg:block">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-slate-200 bg-slate-50 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                {hasAdminAccess && (
                  <th className="w-10 p-3 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        paginatedEmployees.length > 0 &&
                        paginatedEmployees.every((emp) =>
                          selectedEmpIds.includes(emp.id)
                        )
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="p-3">SIB ID</th>
                <th className="p-3">Agent Name</th>
                <th className="p-3">Position</th>
                <th className="p-3">Status</th>
                <th className="p-3">Task Order</th>
                <th className="p-3">HeroDash</th>
                <th className="p-3">MSD</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.map((emp) => (
                <tr key={emp.id} className="transition-colors hover:bg-slate-50/60">
                  {hasAdminAccess && (
                    <td className="p-3 text-center">
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search SIB-ID, employee, Task Order..."
                        className={`${INPUT_CLASS} pl-9`}
                      />
                    </td>
                  )}

                  <td className="p-3 font-sans font-bold text-slate-700">
                    {getDisplaySibId(emp)}
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-slate-900">
                      {emp.employee_name}
                    </div>
                    <div className="font-sans text-[11px] text-slate-500">
                      {emp.email}
                    </div>

                  <td className="p-3 font-medium text-slate-700">
                    {emp.position || "-"}
                  </td>

                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-sans text-[11px] font-black tracking-tight ${
                        emp.status === "Active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          emp.status === "Active"
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        }`}
                      />
                      {emp.status}
                    </span>
                  </td>

                  <td className="p-3">
                    {hasAdminAccess ? (
                      <select
                        value={getTaskOrder(emp)}
                        onChange={(e) =>
                          handleUpdateTaskAssignment(emp.id, {
                            task_order: e.target.value,
                          })
                        }
                        className="sibs-filter-input min-h-[34px] w-full max-w-[260px] text-xs"
                      >
                        <option value="">Select Task Order...</option>
                        {taskOrderOptions.map((taskOrder) => (
                          <option key={taskOrder} value={taskOrder}>
                            {taskOrder}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs font-bold text-slate-700">
                        {getTaskOrder(emp) || "Unassigned"}
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {hasAdminAccess ? (
                      <input
                        value={getHeroDash(emp)}
                        onChange={(e) =>
                          handleUpdateTaskAssignment(emp.id, {
                            herodash: e.target.value,
                          })
                        }
                        placeholder="HeroDash"
                        className="sibs-filter-input min-h-[34px] w-full max-w-[180px] text-xs"
                      />
                    ) : (
                      <span className="text-xs font-medium text-slate-700">
                        {getHeroDash(emp) || "-"}
                      </span>
                    )}
                  </td>

                  <td className="p-3">
                    {hasAdminAccess ? (
                      <input
                        value={getMsd(emp)}
                        onChange={(e) =>
                          handleUpdateTaskAssignment(emp.id, {
                            msd: e.target.value,
                          })
                        }
                        placeholder="MSD"
                        className="sibs-filter-input min-h-[34px] w-full max-w-[180px] text-xs"
                      />
                    ) : (
                      <span className="text-xs font-medium text-slate-700">
                        {getMsd(emp) || "-"}
                      </span>
                    )}
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        onClick={() => setEditingEmployee(emp)}
                        className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-500 transition-colors hover:bg-slate-100"
                        title="Configure Settings"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      {hasAdminAccess && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEmployees((prev) =>
                              (prev || []).map((e) =>
                                e.id === emp.id
                                  ? {
                                      ...e,
                                      status:
                                        e.status === "Active"
                                          ? "Inactive"
                                          : "Active",
                                      employment_status:
                                        e.status === "Active"
                                          ? "Inactive"
                                          : "Active",
                                      updated_at: new Date().toISOString(),
                                    }
                                  : e
                              )
                            );

                            handleToast(
                              `Toggled operational status for ${emp.employee_name}.`
                            );
                          }}
                          className={`rounded border p-1 transition-colors ${
                            emp.status === "Active"
                              ? "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                              : "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                          title={
                            emp.status === "Active"
                              ? "Deactivate Employee"
                              : "Activate Employee"
                          }
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {paginatedEmployees.length === 0 && (
                <tr>
                  <td
                    colSpan={hasAdminAccess ? 9 : 8}
                    className="p-8 text-center text-sm font-bold text-slate-500"
                  >
                    No employees found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer rounded-xl border border-slate-200">
          <div className="table-footer__left">
            <span className="table-footer__meta">
              Showing{" "}
              {sortedEmployees.length === 0
                ? 0
                : (managementPage - 1) * managementPageSize + 1}{" "}
              to {Math.min(managementPage * managementPageSize, sortedEmployees.length)}{" "}
              of {sortedEmployees.length} employees
            </span>
          </div>

          <div className="table-footer__right">
            <Button
              variant="outline"
              onClick={() => setManagementPage((prev) => Math.max(1, prev - 1))}
              disabled={managementPage === 1}
              className="table-footer__btn"
            >
              Prev
            </Button>

            <span className="table-footer__page-indicator">
              {managementPage} / {managementTotalPages}
            </span>

            <Button
              variant="outline"
              onClick={() =>
                setManagementPage((prev) =>
                  Math.min(managementTotalPages, prev + 1)
                )
              }
              disabled={managementPage === managementTotalPages}
              className="table-footer__btn"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="sibs-card sibs-page-card-in space-y-4 p-5">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 shrink-0 text-indigo-600" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800">
                  US Visa Task Order Assignment
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Assign Task Order, HeroDash, and MSD per active employee
                </p>
              </div>
            </div>

            {hasAdminAccess && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <input
                  ref={taskOrderFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportTaskOrderDump}
                  className="hidden"
                />

                <Button
                  variant="outline"
                  onClick={() => taskOrderFileRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Upload className="h-3.5 w-3.5 text-blue-600" />
                  Import Dump
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadTaskOrderDump}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Dump
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSaveAssignments}
                  disabled={settingsSaving}
                  className="flex items-center justify-center gap-1.5 rounded-lg border-0 bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {settingsSaving ? "Saving..." : "Save Assignments"}
                </Button>
              </div>
            )}
          </div>

          <p className="text-[13px] leading-normal text-slate-500">
            Import or download the assignment dump using these columns:
            <span className="font-bold text-slate-700">
              {" "}
              SIB ID, Agent Name, Task Order, HeroDash, MSD.
            </span>
          </p>

          <div className="thin-scroll max-h-[400px] overflow-y-auto rounded-xl border border-slate-200">
            {activeEmployeesForAssignment.map((emp) => (
              <div
                key={emp.id}
                className="grid grid-cols-1 gap-3 border-b border-slate-100 bg-white p-3.5 text-xs transition-colors last:border-b-0 hover:bg-slate-50 lg:grid-cols-[1fr_1.2fr_0.8fr_0.8fr]"
              >
                <div className="min-w-0">
                  <span className="block truncate text-[13px] font-bold text-slate-800">
                    {emp.employee_name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    SIB ID: {getDisplaySibId(emp)}
                  </span>
                </div>

                {hasAdminAccess ? (
                  <>
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


      <BaseModal
        open={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white p-5">
          <h3 className="flex min-w-0 items-center gap-2 font-sans text-lg font-black tracking-tight text-slate-900">
            <Plus className="h-5 w-5 shrink-0 text-blue-600" />
            <span className="truncate">Add US Visa Employee</span>
          </h3>

          <Button
            variant="outline"
            onClick={() => setIsAddEmployeeOpen(false)}
            className="shrink-0 rounded-lg border-0 bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
          >
            <X className="h-4.5 w-4.5" />
          </Button>
        </div>

        <div className="space-y-5 p-5 font-sans text-xs">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                SIB ID
              </label>
              <input
                value={newEmployee.employee_id}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    employee_id: e.target.value,
                    employee_number: e.target.value,
                  }))
                }
                placeholder="Example: SIB-6677"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Employee Name
              </label>
              <input
                value={newEmployee.employee_name}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    employee_name: e.target.value,
                  }))
                }
                placeholder="Full name"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Email
              </label>
              <input
                value={newEmployee.email}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="employee@sibs.com"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Position
              </label>
              <input
                value={newEmployee.position}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    position: e.target.value,
                  }))
                }
                placeholder="Position"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>


            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Supervisor
              </label>
              <input
                value={newEmployee.supervisor}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    supervisor: e.target.value,
                  }))
                }
                placeholder="Supervisor"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Task Order
              </label>
              <select
                value={newEmployee.task_order}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    task_order: e.target.value,
                    assigned_sub_account: e.target.value,
                  }))
                }
                className="sibs-filter-input w-full text-sm font-bold"
              >
                <option value="">Select Task Order...</option>
                {taskOrderOptions.map((taskOrder) => (
                  <option key={taskOrder} value={taskOrder}>
                    {taskOrder}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select
                value={newEmployee.status}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    status: e.target.value,
                    employment_status:
                      e.target.value === "Active" ? "Active" : "Inactive",
                  }))
                }
                className="sibs-filter-input w-full text-sm font-bold"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                HeroDash / KPI Source Name
              </label>
              <input
                value={newEmployee.herodash}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    herodash: e.target.value,
                  }))
                }
                placeholder="Optional source name"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                MSD / Email Source Name
              </label>
              <input
                value={newEmployee.msd}
                onChange={(e) =>
                  setNewEmployee((prev) => ({
                    ...prev,
                    msd: e.target.value,
                  }))
                }
                placeholder="Optional email source name"
                className="sibs-filter-input w-full text-sm font-bold"
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] font-semibold leading-relaxed text-blue-700">
            HeroDash and MSD are optional, but they are useful when the KPI Excel
            name is different from the official employee name. These values are
            saved as backend aliases for dashboard matching.
          </div>
        </div>

        <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 p-4">
          <Button
            variant="outline"
            onClick={() => setIsAddEmployeeOpen(false)}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100"
          >
            Cancel
          </Button>

          <Button
            variant="outline"
            onClick={handleAddEmployee}
            disabled={settingsSaving}
            className="rounded-xl border-0 bg-blue-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {settingsSaving ? "Saving..." : "Add Employee"}
          </Button>
        </div>
      </BaseModal>

      <BaseModal
        open={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        maxWidth="max-w-lg"
      >
        {editingEmployee && (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white p-5">
              <h3 className="flex min-w-0 items-center gap-2 font-sans text-lg font-black tracking-tight text-slate-900">
                <Settings className="h-5 w-5 shrink-0 text-indigo-600" />
                <span className="truncate">
                  Configure Employee: {editingEmployee.employee_name}
                </span>
              </h3>

              <Button
                variant="outline"
                onClick={() => setEditingEmployee(null)}
                className="shrink-0 rounded-lg border-0 bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>

            <div className="space-y-5 p-5 font-sans text-xs">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                <div className="min-w-0">
                  <p className="mb-0.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    SIB ID
                  </p>
                  <p className="truncate text-[15px] font-black tracking-tight text-slate-900">
                    {getDisplaySibId(editingEmployee)}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="mb-0.5 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Supervisor
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
