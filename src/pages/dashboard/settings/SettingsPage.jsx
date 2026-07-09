import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/button.jsx";

import {
  Search,
  Settings,
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
  "GSS 2.0 TO11 - SEASIA",
  "GSS 2.0 TO12 - SEASIA",
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

  const getTaskOrder = (emp) => {
    return emp.task_order || emp.assigned_sub_account || "";
  };

  const getHeroDash = (emp) => {
    return emp.herodash || emp.heroDash || emp.hero_dash || "";
  };

  const getMsd = (emp) => {
    return emp.msd || emp.MSD || "";
  };

  const getDisplaySibId = (emp) => {
    return emp.employee_id || emp.employee_number || "Unassigned";
  };

  const taskOrderOptions = useMemo(() => {
    const set = new Set(DEFAULT_TASK_ORDER_OPTIONS);

    (employees || []).forEach((emp) => {
      const currentTaskOrder = getTaskOrder(emp);

      if (currentTaskOrder) {
        set.add(currentTaskOrder);
      }
    });

    return Array.from(set);
  }, [employees]);

  const handleRosterUploadComplete = (payload = {}) => {
    const newUploadLog = {
      id: `upload_${Date.now()}`,
      fileName: payload.fileName || "Roster Upload",
      uploadedBy: payload.uploadedBy || "Administrator",
      timestamp:
        payload.timestamp ||
        new Date().toLocaleString([], {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      status: payload.status || "Success",
      records: payload.records ?? 0,
      added: payload.added ?? 0,
      updated: payload.updated ?? 0,
      skipped: payload.skipped ?? 0,
    };

    setUploadLogs((prev) => [newUploadLog, ...prev]);
    handleToast(`Roster import logged: ${newUploadLog.fileName}`);
  };

  const handleFetchEmployees = () => {
    if (!hasAdminAccess) {
      handleToast(
        "Access Denied: Only Administrators can trigger HRIS synchronization."
      );
      return;
    }

    setIsSyncing(true);

    setTimeout(() => {
      setEmployees((prevEmployees) => {
        const updated = [...(prevEmployees || [])].map((emp) => {
          if (!isUsVisaEmployee(emp)) return emp;

          return {
            ...emp,
            account_name: "US Visa",
            updated_at: new Date().toISOString(),
            last_synced_at: new Date().toISOString(),
            include_dashboard: emp.include_dashboard ?? true,
            include_reports: emp.include_reports ?? true,
            kpi_tracking_enabled: emp.kpi_tracking_enabled ?? true,
            task_order: emp.task_order || emp.assigned_sub_account || "",
            herodash: getHeroDash(emp),
            msd: getMsd(emp),
          };
        });

        return updated;
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

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const arrayBuffer = readerEvent.target?.result;

        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          handleToast("No worksheet found in this import file.");
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });

        if (!rows.length) {
          handleToast("No task order rows found in the file.");
          return;
        }

        let updatedCount = 0;
        let skippedCount = 0;

        setEmployees((prevEmployees) => {
          const updatedEmployees = [...(prevEmployees || [])];

          rows.forEach((row) => {
            const sibId = findValue(row, [
              "SIB ID",
              "SIB-ID",
              "SIB_ID",
              "employee_id",
              "employee id",
              "employee_number",
              "employee number",
              "id",
            ]);

            const agentName = findValue(row, [
              "Agent Name",
              "agent_name",
              "employee_name",
              "employee name",
              "name",
              "full name",
            ]);

            const taskOrder = findValue(row, [
              "Task Order",
              "task_order",
              "taskorder",
              "assigned task order",
            ]);

            const herodash = findValue(row, [
              "HeroDash",
              "hero_dash",
              "hero dash",
              "herodash queue",
            ]);

            const msd = findValue(row, ["MSD", "msd", "msd queue"]);

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

  const sortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];

    sorted.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "employee_name") {
        aVal = String(a.employee_name || "");
        bVal = String(b.employee_name || "");
      } else if (sortField === "task_order") {
        aVal = String(getTaskOrder(a));
        bVal = String(getTaskOrder(b));
      } else {
        aVal = String(a[sortField] || "");
        bVal = String(b[sortField] || "");
      }

      return sortOrder === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    return sorted;
  }, [filteredEmployees, sortField, sortOrder]);

  const paginatedEmployees = useMemo(() => {
    const start = (managementPage - 1) * managementPageSize;
    return sortedEmployees.slice(start, start + managementPageSize);
  }, [sortedEmployees, managementPage, managementPageSize]);

  const managementTotalPages =
    Math.ceil(sortedEmployees.length / managementPageSize) || 1;

  const activeEmployeesForAssignment = useMemo(() => {
    return (employees || []).filter(
      (e) =>
        isUsVisaEmployee(e) &&
        e.status === "Active" &&
        e.employment_status === "Active"
    );
  }, [employees]);

  const handleUpdateTaskAssignment = (empId, updates) => {
    if (!hasAdminAccess) return;

    const timestamp = new Date().toISOString();

    setEmployees((prev) =>
      (prev || []).map((emp) => {
        if (emp.id !== empId) return emp;

        const shouldUpdateTaskOrder = Object.prototype.hasOwnProperty.call(
          updates,
          "task_order"
        );

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

  const handleBulkAction = (action) => {
    if (!hasAdminAccess) {
      handleToast(
        "Access Denied: Administrative permissions required for bulk actions."
      );
      return;
    }

    if (selectedEmpIds.length === 0) {
      handleToast("No employees selected for bulk operations.");
      return;
    }

    setEmployees((prev) =>
      (prev || []).map((emp) => {
        if (!selectedEmpIds.includes(emp.id)) return emp;

        if (action === "activate") {
          return {
            ...emp,
            status: "Active",
            employment_status: "Active",
            updated_at: new Date().toISOString(),
          };
        }

        if (action === "deactivate") {
          return {
            ...emp,
            status: "Inactive",
            employment_status: "Inactive",
            updated_at: new Date().toISOString(),
          };
        }

        if (action === "reset_assignments") {
          return {
            ...emp,
            task_order: "",
            herodash: "",
            msd: "",
            task_order_assigned_at: null,
            assigned_sub_account: null,
            sub_account_assigned_at: null,
            updated_at: new Date().toISOString(),
          };
        }

        return emp;
      })
    );

    setSelectedEmpIds([]);
    handleToast(
      `Bulk action '${action.replace("_", " ")}' successfully completed.`
    );
  };

  const handleExportConfig = () => {
    const fileContent = JSON.stringify(employees, null, 2);

    const blob = new Blob([fileContent], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `US_Visa_Employee_Configurations_${
      new Date().toISOString().split("T")[0]
    }.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmpIds(paginatedEmployees.map((emp) => emp.id));
    } else {
      setSelectedEmpIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedEmpIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }

      return [...prev, id];
    });
  };

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

      <RosterUploadHistoryCard
        employees={employees}
        setEmployees={setEmployees}
        userRole={userRole}
        uploadLogs={uploadLogs}
        onUploadComplete={handleRosterUploadComplete}
      />

      <div className="sibs-card sibs-page-card-in p-5 space-y-4">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                US Visa Employee Task Order Roster
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Fetch all US Visa employees and assign Task Order, HeroDash, and MSD
              </p>
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

              <Button
                variant="outline"
                onClick={() => handleBulkAction("activate")}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                Activate Selected
              </Button>

              <Button
                variant="outline"
                onClick={() => handleBulkAction("deactivate")}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                Deactivate Selected
              </Button>

              <Button
                variant="outline"
                onClick={() => handleBulkAction("reset_assignments")}
                className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-200"
                title="Reset Task Order Assignments"
              >
                Reset Assignments
              </Button>

              <Button
                variant="outline"
                onClick={handleExportConfig}
                className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <Download className="h-3 w-3" />
                <span>Backup Config</span>
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SIB ID, Name, Task Order..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setManagementPage(1);
              }}
              className="sibs-filter-input min-h-[36px] w-full pl-8 pr-3 text-xs"
            />
          </div>


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
                        type="checkbox"
                        checked={selectedEmpIds.includes(emp.id)}
                        onChange={() => handleSelectRow(emp.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
                  </td>

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
                      value={getMsd(emp)}
                      onChange={(e) =>
                        handleUpdateTaskAssignment(emp.id, {
                          msd: e.target.value,
                        })
                      }
                      placeholder="MSD"
                      className="sibs-filter-input w-full text-xs"
                    />
                  </>
                ) : (
                  <div className="lg:col-span-3">
                    <span className="block text-[11px] font-bold text-slate-700">
                      {getTaskOrder(emp) || "Unassigned"}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      HeroDash: {getHeroDash(emp) || "-"} | MSD:{" "}
                      {getMsd(emp) || "-"}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {activeEmployeesForAssignment.length === 0 && (
              <div className="p-8 text-center text-sm font-bold text-slate-500">
                No active US Visa employees available for assignment.
              </div>
            )}
          </div>
        </div>

        <div className="sibs-card sibs-page-card-in space-y-4 p-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <History className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                HRIS Audit Sync Log Trail
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Chronological record of Kronos synchronizations
              </p>
            </div>
          </div>

          <p className="text-xs leading-normal text-slate-500">
            Maintains a secure, read-only administrative trace of HRIS loading,
            updates, and task order assignment checks.
          </p>

          <div className="thin-scroll max-h-[400px] overflow-y-auto rounded-xl border border-slate-200">
            {safeSyncLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedAuditLog(log)}
                className="flex cursor-pointer flex-col justify-between gap-2 border-b border-slate-100 bg-white p-3 text-xs font-mono transition-colors last:border-b-0 hover:bg-slate-50 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      log.result === "Success" || log.status === "Success"
                        ? "bg-emerald-500"
                        : "bg-red-500"
                    }`}
                  />

                  <div className="min-w-0 truncate">
                    <span className="font-semibold text-slate-700">
                      {log.date || log.timestamp?.split("T")[0] || "Unknown Date"}{" "}
                      {log.time || ""}
                    </span>
                    <span className="ml-2 text-[10px] text-slate-400">
                      By: {log.performedBy || log.source || "System"}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 text-[11px]">
                  <span className="font-bold text-emerald-600">
                    +{log.summary?.added ?? log.recordsProcessed ?? 0} Add
                  </span>
                  <span className="font-bold text-slate-400">
                    {log.summary?.retrieved ?? log.recordsProcessed ?? 0} Total
                  </span>
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            ))}

            {safeSyncLogs.length === 0 && (
              <div className="p-8 text-center text-sm font-bold text-slate-500">
                No sync logs found.
              </div>
            )}
          </div>
        </div>
      </div>

      <BaseModal
        open={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        maxWidth="max-w-lg"
      >
        {selectedAuditLog && (
          <>
            <div className="flex items-center justify-between bg-slate-900 p-4 text-white">
              <h3 className="flex items-center gap-1.5 font-sans text-sm font-bold">
                <History className="h-4 w-4 text-indigo-400" />
                Audit Session Details
              </h3>

              <Button
                variant="outline"
                onClick={() => setSelectedAuditLog(null)}
                className="border-0 bg-transparent text-slate-300 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 p-5 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px]">
                <p>
                  Date:{" "}
                  <strong className="text-slate-800">
                    {selectedAuditLog.date ||
                      selectedAuditLog.timestamp?.split("T")[0] ||
                      "Unknown"}
                  </strong>
                </p>
                <p>
                  Time:{" "}
                  <strong className="text-slate-800">
                    {selectedAuditLog.time || "--:--"}
                  </strong>
                </p>
                <p>
                  Operator:{" "}
                  <strong className="text-slate-800">
                    {selectedAuditLog.performedBy ||
                      selectedAuditLog.source ||
                      "System"}
                  </strong>
                </p>
                <p>
                  Result:{" "}
                  <span className="font-bold text-emerald-600">
                    {selectedAuditLog.result || selectedAuditLog.status}
                  </span>
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Metrics Comparison
                </p>

                <div className="grid grid-cols-2 gap-2 text-center text-[10px] sm:grid-cols-4">
                  <div className="rounded border border-slate-150 bg-slate-50 p-2">
                    <p className="text-slate-400">Retrieved</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {selectedAuditLog.summary?.retrieved ??
                        selectedAuditLog.recordsProcessed ??
                        0}
                    </p>
                  </div>

                  <div className="rounded border border-slate-150 bg-slate-50 p-2">
                    <p className="text-blue-500">Added</p>
                    <p className="mt-1 text-sm font-bold text-blue-600">
                      {selectedAuditLog.summary?.added ??
                        selectedAuditLog.recordsProcessed ??
                        0}
                    </p>
                  </div>

                  <div className="rounded border border-slate-150 bg-slate-50 p-2">
                    <p className="text-amber-500">Updated</p>
                    <p className="mt-1 text-sm font-bold text-amber-600">
                      {selectedAuditLog.summary?.updated ?? 0}
                    </p>
                  </div>

                  <div className="rounded border border-slate-150 bg-slate-50 p-2">
                    <p className="text-rose-500">Inactive</p>
                    <p className="mt-1 text-sm font-bold text-rose-600">
                      {selectedAuditLog.summary?.markedInactive ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-900 p-3 text-[10px] text-emerald-400">
                <p className="mb-1 border-b border-slate-800 pb-1 font-sans text-slate-400">
                  Full Output Trace Logs
                </p>
                <p className="leading-relaxed">
                  &gt; Connection established successfully
                </p>
                <p className="leading-relaxed">
                  &gt; {selectedAuditLog.details}
                </p>
                <p className="leading-relaxed">
                  &gt; Audit trail written. Hash: 0x9f1a238b99
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-3">
              <Button
                variant="outline"
                onClick={() => setSelectedAuditLog(null)}
                className="rounded-lg bg-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-300"
              >
                Acknowledge Log
              </Button>
            </div>
          </>
        )}
      </BaseModal>


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
                  <p className="truncate text-[15px] font-black tracking-tight text-slate-900">
                    {editingEmployee.supervisor || "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-sm transition-colors hover:bg-slate-100/70">
                  <div>
                    <p className="font-bold text-slate-900">
                      Include in Dashboard
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">
                      Render individual aggregate metrics in Executive summary cards
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={!!editingEmployee.include_dashboard}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        include_dashboard: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-sm transition-colors hover:bg-slate-100/70">
                  <div>
                    <p className="font-bold text-slate-900">Include in Reports</p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">
                      Expose records in CSV and Excel downloads
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={!!editingEmployee.include_reports}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        include_reports: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-sm transition-colors hover:bg-slate-100/70">
                  <div>
                    <p className="font-bold text-slate-900">
                      Enable Live KPI Tracking
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500">
                      Simulate hourly data loads and calculate overall metrics
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={!!editingEmployee.kpi_tracking_enabled}
                    onChange={(e) =>
                      setEditingEmployee({
                        ...editingEmployee,
                        kpi_tracking_enabled: e.target.checked,
                      })
                    }
                    className="h-5 w-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Active Status
                    </label>

                    <select
                      value={editingEmployee.status}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          status: e.target.value,
                          employment_status:
                            e.target.value === "Active" ? "Active" : "Inactive",
                        })
                      }
                      className="sibs-filter-input w-full text-sm font-bold"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Task Order
                    </label>

                    <select
                      value={editingEmployee.task_order || ""}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          task_order: e.target.value,
                          assigned_sub_account: e.target.value,
                          task_order_assigned_at: new Date().toISOString(),
                          sub_account_assigned_at: new Date().toISOString(),
                        })
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
                      HeroDash
                    </label>

                    <input
                      value={editingEmployee.herodash || ""}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          herodash: e.target.value,
                        })
                      }
                      placeholder="HeroDash"
                      className="sibs-filter-input w-full text-sm font-bold"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      MSD
                    </label>

                    <input
                      value={editingEmployee.msd || ""}
                      onChange={(e) =>
                        setEditingEmployee({
                          ...editingEmployee,
                          msd: e.target.value,
                        })
                      }
                      placeholder="MSD"
                      className="sibs-filter-input w-full text-sm font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 p-4">
              <Button
                variant="outline"
                onClick={() => setEditingEmployee(null)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-100"
              >
                Cancel
              </Button>

              <Button
                variant="outline"
                onClick={() => handleSaveEmployeeConfig(editingEmployee)}
                className="rounded-xl border-0 bg-blue-600 px-5 py-2 text-[13px] font-bold text-white shadow-sm transition-all hover:bg-blue-700"
              >
                Save Settings
              </Button>
            </div>
          </>
        )}
      </BaseModal>
    </div>
  );
}