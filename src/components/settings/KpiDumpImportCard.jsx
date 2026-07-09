import React, { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "../ui/button.jsx";
import { useRoster } from "../../services/context/RosterContext.jsx";
import {
  KPI_DUMP_COLUMNS,
  normalizeKpiDumpRows,
} from "../../lib/utils/kpiDumpParser.js";

export default function KpiDumpImportCard({
  hasAdminAccess = false,
  onToast,
  onUploadComplete,
}) {
  const fileRef = useRef(null);
  const { employees, setEmployees, kpiRecords, setKpiRecords } = useRoster();
  const [kpiDumpDate, setKpiDumpDate] = useState("2026-07-07");
  const [isImporting, setIsImporting] = useState(false);

  const showToast = (message) => {
    if (onToast) {
      onToast(message);
      return;
    }

    window.dispatchEvent(new CustomEvent("show-toast", { detail: message }));
  };

  const handleDownloadTemplate = () => {
    const sampleRows = [
      {
        "SIB ID": "SIB-0001",
        Name: "Jane Smith",
        Interval: "Daily",
        "Expected Hours(sec)": 32400,
        "Actual Logged Time": "8h 59m",
        "Handled Calls": 57,
        "AVG Talk Time": 180,
        "AVG Hold Time": 25,
        "Avail Time": "1h 20m",
        "Phone Occupancy": 82,
        "Available Email Capacity (email)": 30,
        "Target # of Emails": 25,
        "Actual # of Emails (Email/Hour)": 28,
        "Utilization (Email)": 112,
        "Actual Efficiency": 96,
        "Task Order": "GSS 2.0 TO10 - SEASIA",
        HeroDash: "HeroDash Queue 1",
        MSD: "MSD Queue 1",
      },
      {
        "SIB ID": "SIB-0002",
        Name: "John Doe",
        Interval: "08:00 AM",
        "Expected Hours(sec)": 3600,
        "Actual Logged Time": "59m",
        "Handled Calls": 6,
        "AVG Talk Time": 175,
        "AVG Hold Time": 21,
        "Avail Time": "8m",
        "Phone Occupancy": 84,
        "Available Email Capacity (email)": 4,
        "Target # of Emails": 3,
        "Actual # of Emails (Email/Hour)": 4,
        "Utilization (Email)": 133,
        "Actual Efficiency": 97,
        "Task Order": "GSS 2.0 TO10 - SEASIA",
        HeroDash: "HeroDash Queue 2",
        MSD: "MSD Queue 2",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows, {
      header: KPI_DUMP_COLUMNS,
    });

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "KPI Dump");
    XLSX.writeFile(workbook, "US_Visa_KPI_Dump_Template.xlsx");
  };

  const handleImportDump = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!hasAdminAccess) {
      showToast("Access denied. Only Administrators can import KPI dumps.");
      event.target.value = "";
      return;
    }

    const fileName = file.name.toLowerCase();
    const isAllowed =
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".csv");

    if (!isAllowed) {
      showToast("Invalid file type. Upload only .xlsx, .xls, or .csv files.");
      event.target.value = "";
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      try {
        const workbook = XLSX.read(readerEvent.target?.result, {
          type: "array",
        });

        const firstSheet = workbook.SheetNames[0];

        if (!firstSheet) {
          showToast("No worksheet found in this KPI dump.");
          return;
        }

        const worksheet = workbook.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });

        const normalizedRows = normalizeKpiDumpRows({
          rows,
          employees,
          dumpDate: kpiDumpDate,
        });

        if (normalizedRows.length === 0) {
          showToast("No valid KPI rows found in this dump.");
          return;
        }

        setKpiRecords(normalizedRows);

        setEmployees((prevEmployees) =>
          (prevEmployees || []).map((employee) => {
            const importedMatch = normalizedRows.find((row) => {
              const empName = String(employee.employee_name || "").toLowerCase();
              const empId = String(employee.employee_id || "").toLowerCase();
              const empNumber = String(employee.employee_number || "").toLowerCase();
              const rowName = String(row.employeeName || "").toLowerCase();
              const rowCode = String(row.employeeCode || "").toLowerCase();

              return rowName === empName || rowCode === empId || rowCode === empNumber;
            });

            if (!importedMatch) return employee;

            const timestamp = new Date().toISOString();

            return {
              ...employee,
              account_name: "US Visa",
              task_order: importedMatch.taskOrder || employee.task_order || employee.assigned_sub_account || "",
              herodash: importedMatch.heroDash || employee.herodash || "",
              msd: importedMatch.msd || employee.msd || "",
              assigned_sub_account:
                importedMatch.taskOrder || employee.task_order || employee.assigned_sub_account || "",
              task_order_assigned_at:
                importedMatch.taskOrder || employee.task_order
                  ? timestamp
                  : employee.task_order_assigned_at,
              sub_account_assigned_at:
                importedMatch.taskOrder || employee.assigned_sub_account
                  ? timestamp
                  : employee.sub_account_assigned_at,
              updated_at: timestamp,
              last_kpi_dump_at: timestamp,
            };
          })
        );

        onUploadComplete?.({
          fileName: file.name,
          uploadedBy: "Administrator",
          status: rows.length - normalizedRows.length > 0 ? "Warning" : "Success",
          records: normalizedRows.length,
          added: 0,
          updated: normalizedRows.length,
          skipped: rows.length - normalizedRows.length,
        });

        showToast(
          `KPI dump imported. ${normalizedRows.length} KPI record(s) loaded.`
        );
      } catch (error) {
        console.error(error);
        showToast("Unable to read KPI dump file.");
      } finally {
        setIsImporting(false);
        event.target.value = "";
      }
    };

    reader.onerror = () => {
      setIsImporting(false);
      showToast("Unable to read KPI dump file.");
      event.target.value = "";
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="sibs-card sibs-page-card-in p-5 space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              US Visa KPI Dump Import
            </h3>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Import KPI dump records to update Dashboard and Employee Performance data
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="date"
            value={kpiDumpDate}
            onChange={(event) => setKpiDumpDate(event.target.value)}
            className="sibs-filter-input min-h-[36px] text-xs"
          />

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportDump}
            className="hidden"
          />

          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={!hasAdminAccess || isImporting}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {isImporting ? "Importing..." : "Import KPI Dump"}
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadTemplate}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
          >
            <Download className="h-3.5 w-3.5" />
            Download Template
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        Required KPI columns: {" "}
        <span className="font-bold text-slate-700">
          Name, Interval, Expected Hours(sec), Actual Logged Time, Handled Calls,
          AVG Talk Time, AVG Hold Time, Avail Time, Phone Occupancy, Available Email
          Capacity (email), Target # of Emails, Actual # of Emails (Email/Hour),
          Utilization (Email), Actual Efficiency
        </span>
        <br />
        Optional matching/assignment columns: {" "}
        <span className="font-bold text-slate-700">SIB ID, Task Order, HeroDash, MSD</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="sibs-section-label">Loaded KPI Rows</p>
          <p className="sibs-metric-value text-xl">{kpiRecords?.length || 0}</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="sibs-section-label">Dump Date</p>
          <p className="sibs-metric-value text-xl">{kpiDumpDate}</p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="sibs-section-label">Data Source</p>
          <p className="sibs-metric-value text-xl">
            {kpiRecords?.length ? "Imported" : "Mock"}
          </p>
        </div>
      </div>
    </div>
  );
}
