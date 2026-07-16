import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { Button } from "../../../components/ui/button.jsx";

import {
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Printer,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import MobilePerformanceCard from "./MobilePerformanceCard.jsx";
import { PerformanceStatsBar } from "./PerformanceStatsBar.jsx";
import LazyChartMount from "../../../components/ui/LazyChartMount.jsx";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { getUsVisaKpiPerformanceRecords } from "../../../services/api/usVisaKpiPerformanceApi.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LabelList,
} from "recharts";

const HOURS = [
  { value: 8, label: "08:00 AM" },
  { value: 9, label: "09:00 AM" },
  { value: 10, label: "10:00 AM" },
  { value: 11, label: "11:00 AM" },
  { value: 12, label: "12:00 PM" },
  { value: 13, label: "01:00 PM" },
  { value: 14, label: "02:00 PM" },
  { value: 15, label: "03:00 PM" },
  { value: 16, label: "04:00 PM" },
  { value: 17, label: "05:00 PM" },
];

const EMPTY_PERFORMANCE_DATA = {
  agents: [],
  records: [],
  hourlyRecords: [],
  dailyRecords: [],
  statistics: {
    totalEmp: 0,
    avgEff: 0,
    avgOccupancy: 0,
    totalCalls: 0,
    totalEmails: 0,
  },
};

function getHourLabel(hour) {
  return HOURS.find((item) => item.value === Number(hour))?.label || `${hour}:00`;
}

function formatSeconds(sec = 0) {
  const safeSec = Number.isFinite(Number(sec)) ? Number(sec) : 0;
  const h = Math.floor(safeSec / 3600);
  const m = Math.round((safeSec % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function PerformancePage() {
  const { userRole, selectedSimUserEmail: currentUserEmail } = useRoster();

  const [performanceData, setPerformanceData] = useState(EMPTY_PERFORMANCE_DATA);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState("");

  const [selectedEmpFilters, setSelectedEmpFilters] = useState(["all"]);
  const [selectedDate, setSelectedDate] = useState("2026-06-30");
  const [isPending, startTransition] = useTransition();
  const [fromHour, setFromHour] = useState(8);
  const [toHour, setToHour] = useState(17);
  const [intervalType, setIntervalType] = useState("Daily");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const debouncedSearchQuery = useDebounce(deferredSearchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowEmployee, setSelectedRowEmployee] = useState(null);
  const [hourlyDrawerData, setHourlyDrawerData] = useState([]);
  const [historicalDrawerData, setHistoricalDrawerData] = useState([]);
  const [isBootstrapLoading, setIsBootstrapLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [isDrawerLoading, setIsDrawerLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [sortColumn, setSortColumn] = useState("employeeName");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isPending, startTransition] = useTransition();

  const [sortColumn, setSortColumn] = useState("employeeName");
  const [sortDirection, setSortDirection] = useState("asc");

  const [visibleColumns] = useState({
    employeeName: true,
    interval: true,
    expectedHours: true,
    actualLogged: true,
    handledCalls: true,
    avgTalkTime: true,
    avgHoldTime: true,
    availableTime: true,
    phoneOccupancy: true,
    availableEmailCapacity: true,
    targetEmails: true,
    actualEmails: true,
    emailUtilization: true,
    efficiency: true,
  });

  const [colWidths] = useState({
    employeeName: 180,
    interval: 80,
    expectedHours: 110,
    actualLogged: 110,
    handledCalls: 100,
    avgTalkTime: 105,
    avgHoldTime: 105,
    availableTime: 110,
    phoneOccupancy: 110,
    availableEmailCapacity: 140,
    targetEmails: 100,
    actualEmails: 110,
    emailUtilization: 115,
    efficiency: 110,
  });

  const activeEmployees = useMemo(() => {
    return (performanceData.agents || []).filter(
      (employee) =>
        employee.status === "Active" &&
        employee.employment_status === "Active"
    );
  }, [performanceData.agents]);

  const activeUserEmployee = useMemo(() => {
    if (userRole !== "Employee") return null;

    const currentEmail = String(currentUserEmail || "").toLowerCase();
    if (!currentEmail) return null;

    return (
      activeEmployees.find(
        (employee) => String(employee.email || "").toLowerCase() === currentEmail
      ) || null
    );
  }, [userRole, activeEmployees, currentUserEmail]);

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmpFilters.includes("all") || selectedEmpFilters.length === 0) {
      return "All Employees";
    }

    if (selectedEmpFilters.length === 1) {
      return (
        activeEmployees.find((employee) => employee.id === selectedEmpFilters[0])
          ?.employee_name || "Select Employee"
      );
    }

    return `${selectedEmpFilters.length} Employees`;
  }, [selectedEmpFilters, activeEmployees]);

  useEffect(() => {
    if (activeUserEmployee) {
      setSelectedEmpFilters([activeUserEmployee.id]);
      return;
    }

    const validFilters = selectedEmpFilters.filter(
      (id) => id === "all" || activeEmployees.some((employee) => employee.id === id)
    );

    if (validFilters.length === 0) {
      setSelectedEmpFilters(["all"]);
    } else if (JSON.stringify(validFilters) !== JSON.stringify(selectedEmpFilters)) {
      setSelectedEmpFilters(validFilters);
    }
  }, [activeUserEmployee, activeEmployees, selectedEmpFilters]);

  const fetchPerformanceData = useCallback(async () => {
    try {
      setPerformanceLoading(true);
      setPerformanceError("");

      const data = await getUsVisaKpiPerformanceRecords({
        date: selectedDate,
        fromHour,
        toHour,
        intervalType,
        employeeIds: selectedEmpFilters,
      });

      setPerformanceData(data || EMPTY_PERFORMANCE_DATA);
    } catch (error) {
      console.error("Failed to load US Visa KPI performance records:", error);
      setPerformanceError(
        error.message || "Failed to load US Visa KPI performance records."
      );
      setPerformanceData(EMPTY_PERFORMANCE_DATA);
    } finally {
      setPerformanceLoading(false);
    }
  }, [selectedDate, fromHour, toHour, intervalType, selectedEmpFilters]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  const baseAggregatedData = useMemo(() => {
    return performanceData.records || [];
  }, [performanceData.records]);

  const searchedData = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();

    return baseAggregatedData.filter((item) => {
      const employeeName = String(item.employeeName ?? "").toLowerCase();
      const position = String(item.position ?? "").toLowerCase();
      const team = String(item.team ?? "").toLowerCase();

      return (
        employeeName.includes(query) ||
        position.includes(query) ||
        team.includes(query)
      );
    });
    setCurrentPage(1);
  }, []);

  const searchedData = useMemo(() => {
    const query = normalizeComparableText(debouncedSearchQuery);

    if (!query) {
      return records;
    }

    return records.filter((row) =>
      normalizeComparableText(
        [row.employeeName, row.email, row.position, row.team].join(" "),
      ).includes(query),
    );
  }, [debouncedSearchQuery, records]);

  const sortedData = useMemo(() => {
    const sorted = [...searchedData];

    sorted.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [searchedData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, sortedData]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  const statistics = useMemo(() => {
    return performanceData.statistics || EMPTY_PERFORMANCE_DATA.statistics;
  }, [performanceData.statistics]);

  const handleSort = useCallback((column) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prevDirection) =>
          prevDirection === "asc" ? "desc" : "asc"
        );
        return prevColumn;
      }

      setSortDirection("asc");
      return column;
    });

    setCurrentPage(1);
  }, []);

  const handleExport = async (format) => {
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: `Compiling detailed employee KPI report in ${format} format...`,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 300));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const element = document.createElement("a");
    const headers =
      "Employee,Interval,Expected Hours (sec),Actual Logged Time,Handled Calls,Avg Talk Time,Avg Hold Time,Available Time,Phone Occupancy,Available Email Capacity,Target Emails,Actual Emails,Email Utilization,Actual Efficiency\n";

    const rows = sortedData
      .map((row) => {
        const intervalVal =
          row.hour !== undefined ? getHourLabel(row.hour) : "Daily";

        return `"${row.employeeName}","${intervalVal}",${row.expectedSeconds},"${formatSeconds(
          row.loggedSeconds
        )}",${row.handledCalls},${row.avgTalkTime},${row.avgHoldTime},"${formatSeconds(
          row.availableSeconds
        )}",${row.phoneOccupancy},${row.availableEmailCapacity},${row.targetEmails},${row.actualEmails},${row.emailUtilization},${row.efficiency}`;
      })
      .join("\n");

    const file = new Blob([headers + rows], {
      type: "text/csv",
    });

    element.href = URL.createObjectURL(file);
    element.download = `US_Visa_KPI_Records_${selectedDate}_${selectedEmployeeName.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: "Detailed report successfully downloaded!",
      })
    );
    setTimeout(
      () =>
        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: null,
          })
        ),
      3000
    );
  };

  const historicalDrawerData = useMemo(() => {
    if (!selectedRowEmployee) return [];

    return [
      {
        date: selectedDate,
        efficiency: selectedRowEmployee.efficiency,
        calls: selectedRowEmployee.handledCalls,
        emails: selectedRowEmployee.actualEmails,
        occupancy: selectedRowEmployee.phoneOccupancy,
      },
    ];
  }, [selectedRowEmployee, selectedDate]);

  const hourlyDrawerData = useMemo(() => {
    if (!selectedRowEmployee) return [];

    return (performanceData.hourlyRecords || [])
      .filter((row) => row.employeeId === selectedRowEmployee.employeeId)
      .sort((a, b) => Number(a.hour || 0) - Number(b.hour || 0))
      .map((row) => ({
        hour: getHourLabel(row.hour),
        calls: row.handledCalls,
        logged: Math.round((row.loggedSeconds / 60) * 10) / 10,
        emails: row.actualEmails,
        efficiency: row.efficiency,
      }));
  }, [selectedRowEmployee, performanceData.hourlyRecords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">
            Employee Performance Records
          </h1>
          <p className="mt-0.5 font-sans text-sm text-slate-500">
            Detailed KPI logs, productivity reporting, and historical audit
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleExport("CSV")}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleExport("Excel")}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-blue-600" />
            <span className="hidden sm:inline">Excel</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {performanceError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {performanceError}
        </div>
      )}

      {performanceLoading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600">
          Loading backend performance records...
        </div>
      )}

      <div className="animate-slide-up-fade">
        <PerformanceStatsBar statistics={statistics} />
      </div>

      <div className="flex w-full flex-col items-end gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-1.5 md:flex-[1.35]">
          <label className="pl-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Search
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or position..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="sibs-filter-input min-h-[38px] w-full rounded-lg border-slate-200 bg-slate-50 pl-9 pr-4 text-xs hover:bg-slate-100"
              />
            </div>

            {userRole !== "Employee" && (
              <div className="w-full shrink-0 sm:w-48">
                <EmployeeFilterDropdown
                  label=""
                  employees={activeEmployees}
                  selectedIds={selectedEmpFilters}
                  onChange={(newIds) => {
                    startTransition(() => setSelectedEmpFilters(newIds));
                    setCurrentPage(1);
                  }}
                  placeholder="Search team members..."
                  selectionMode="immediate"
                />
              </div>
            )}
          </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 md:flex-1">
          <label className="pl-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              startTransition(() => setSelectedDate(event.target.value));
              setCurrentPage(1);
            }}
            className="sibs-filter-input min-h-[38px] w-full cursor-pointer rounded-lg border-slate-200 bg-slate-50 text-center text-xs hover:bg-slate-100"
          />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 md:w-auto">
          <label className="pl-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Time Range
          </label>
          <div className="flex items-center gap-2">
            <select
              value={fromHour}
              onChange={(event) => {
                startTransition(() => setFromHour(parseInt(event.target.value)));
                setCurrentPage(1);
              }}
              className="sibs-filter-input min-h-[38px] flex-1 cursor-pointer rounded-lg border-slate-200 bg-slate-50 text-xs hover:bg-slate-100 md:flex-none"
            >
              {HOURS.map((hour) => (
                <option
                  key={`from-tbl-${hour.value}`}
                  value={hour.value}
                  disabled={hour.value >= toHour}
                >
                  {hour.label}
                </option>
              ))}
            </select>
            <span className="text-sm font-medium text-slate-400">-</span>
            <select
              value={toHour}
              onChange={(event) => {
                startTransition(() => setToHour(parseInt(event.target.value)));
                setCurrentPage(1);
              }}
              className="sibs-filter-input min-h-[38px] flex-1 cursor-pointer rounded-lg border-slate-200 bg-slate-50 text-xs hover:bg-slate-100 md:flex-none"
            >
              {HOURS.map((hour) => (
                <option
                  key={`to-tbl-${hour.value}`}
                  value={hour.value}
                  disabled={hour.value <= fromHour}
                >
                  {hour.label}
                </option>
              ))}
            </select>
          </div>

        <div className="flex w-full shrink-0 flex-col gap-1.5 md:flex-1">
          <label className="pl-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Interval
          </label>
          <div className="inline-flex min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                startTransition(() => setIntervalType("Daily"));
                setCurrentPage(1);
              }}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                intervalType === "Daily"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
              }`}
            >
              Daily
            </button>

            <button
              type="button"
              onClick={() => {
                startTransition(() => setIntervalType("Hourly"));
                setCurrentPage(1);
              }}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                intervalType === "Hourly"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
              }`}
            >
              Hourly
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {paginatedData.length > 0 ? (
          paginatedData.map((row) => (
            <MobilePerformanceCard
              key={`${row.employeeId}-${row.hour ?? "daily"}`}
              row={row}
              onClick={() => setSelectedRowEmployee(row)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
            No matched records found.
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="relative max-h-[500px] overflow-x-auto overflow-y-scroll">
          <table
            className="w-full min-w-[1200px] table-fixed border-collapse text-left"
            id="kpi-table"
          >
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 font-sans text-[11px] uppercase tracking-wider text-slate-500 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr>
                {visibleColumns.employeeName && (
                  <th style={{ width: colWidths.employeeName }} className="relative p-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => handleSort("employeeName")}
                      className="flex w-full items-center gap-1.5 text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900"
                    >
                      Employee {sortColumn === "employeeName" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                  </th>
                )}
                {visibleColumns.interval && <th style={{ width: colWidths.interval }} className="relative p-3 font-bold uppercase tracking-wider text-slate-500">Interval</th>}
                {visibleColumns.expectedHours && <th style={{ width: colWidths.expectedHours }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("expectedSeconds")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Expected {sortColumn === "expectedSeconds" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.actualLogged && <th style={{ width: colWidths.actualLogged }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("loggedSeconds")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Logged {sortColumn === "loggedSeconds" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.handledCalls && <th style={{ width: colWidths.handledCalls }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("handledCalls")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Calls {sortColumn === "handledCalls" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.avgTalkTime && <th style={{ width: colWidths.avgTalkTime }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("avgTalkTime")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Avg Talk {sortColumn === "avgTalkTime" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.avgHoldTime && <th style={{ width: colWidths.avgHoldTime }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("avgHoldTime")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Avg Hold {sortColumn === "avgHoldTime" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.availableTime && <th style={{ width: colWidths.availableTime }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("availableSeconds")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Available {sortColumn === "availableSeconds" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.phoneOccupancy && <th style={{ width: colWidths.phoneOccupancy }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("phoneOccupancy")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Occupancy {sortColumn === "phoneOccupancy" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.availableEmailCapacity && <th style={{ width: colWidths.availableEmailCapacity }} className="relative p-3 font-bold uppercase tracking-wider text-slate-500">Email Capacity</th>}
                {visibleColumns.targetEmails && <th style={{ width: colWidths.targetEmails }} className="relative p-3 font-bold uppercase tracking-wider text-slate-500">Target Emails</th>}
                {visibleColumns.actualEmails && <th style={{ width: colWidths.actualEmails }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("actualEmails")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Emails {sortColumn === "actualEmails" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.emailUtilization && <th style={{ width: colWidths.emailUtilization }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("emailUtilization")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Email Util {sortColumn === "emailUtilization" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
                {visibleColumns.efficiency && <th style={{ width: colWidths.efficiency }} className="relative p-3 font-semibold"><button type="button" onClick={() => handleSort("efficiency")} className="flex w-full items-center gap-1.5 truncate text-left font-bold uppercase tracking-wider transition-colors hover:text-slate-900">Efficiency {sortColumn === "efficiency" && (sortDirection === "asc" ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}</button></th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-sans text-[13px] text-slate-700">
              {paginatedData.map((row) => {
                let rowBg = "hover:bg-slate-50/50";
                let indicatorColor = "bg-slate-300";

                if (row.efficiency >= 95) {
                  rowBg = "bg-emerald-50/20 text-emerald-950 hover:bg-emerald-50/40";
                  indicatorColor = "bg-emerald-500";
                } else if (row.efficiency >= 85) {
                  rowBg = "bg-amber-50/15 text-amber-950 hover:bg-amber-50/30";
                  indicatorColor = "bg-amber-500";
                } else {
                  rowBg = "bg-rose-50/20 text-rose-950 hover:bg-rose-50/35";
                  indicatorColor = "bg-rose-500";
                }

                return (
                  <tr
                    key={`${row.employeeId}-${row.hour ?? "daily"}`}
                    onClick={() => setSelectedRowEmployee(row)}
                    className={`${rowBg} cursor-pointer transition-all active:scale-[0.99]`}
                  >
                    {visibleColumns.employeeName && (
                      <td className="flex max-w-full items-center gap-3 truncate p-3">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ${indicatorColor}`} />
                        <div className="truncate">
  <p className="font-bold text-slate-900">{row.employeeName}</p>
</div>
                      </td>
                    )}
                    {visibleColumns.interval && <td className="p-3 font-medium text-slate-600">{row.hour !== undefined ? getHourLabel(row.hour) : "Daily"}</td>}
                    {visibleColumns.expectedHours && <td className="p-3 font-medium text-slate-700">{row.expectedSeconds}s <span className="text-[11px] text-slate-400">({formatSeconds(row.expectedSeconds)})</span></td>}
                    {visibleColumns.actualLogged && <td className="p-3 font-bold text-slate-800">{formatSeconds(row.loggedSeconds)}</td>}
                    {visibleColumns.handledCalls && <td className="p-3 text-[14px] font-bold text-slate-900">{row.handledCalls}</td>}
                    {visibleColumns.avgTalkTime && <td className="p-3 font-medium text-slate-700">{row.avgTalkTime}s</td>}
                    {visibleColumns.avgHoldTime && <td className="p-3 font-medium text-slate-700">{row.avgHoldTime}s</td>}
                    {visibleColumns.availableTime && <td className="p-3 font-medium text-slate-700">{formatSeconds(row.availableSeconds)}</td>}
                    {visibleColumns.phoneOccupancy && <td className="p-3 font-bold text-slate-800">{row.phoneOccupancy}%</td>}
                    {visibleColumns.availableEmailCapacity && <td className="p-3 font-medium text-slate-700">{row.availableEmailCapacity}</td>}
                    {visibleColumns.targetEmails && <td className="p-3 font-medium text-slate-700">{row.targetEmails}</td>}
                    {visibleColumns.actualEmails && <td className="p-3 font-semibold text-slate-800">{row.actualEmails}</td>}
                    {visibleColumns.emailUtilization && <td className="p-3 font-semibold text-slate-800">{row.emailUtilization}%</td>}
                    {visibleColumns.efficiency && <td className="p-3 text-[14px] font-bold text-slate-900">{row.efficiency}%</td>}
                  </tr>
                );
              })}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={14} className="p-8 text-center text-sm font-medium text-slate-500">
                    No matching KPI records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex items-center justify-center gap-2 font-sans text-xs text-slate-500 sm:justify-start">
            <span className="shrink-0">Show</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(parseInt(event.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="shrink-0">per page</span>
          </div>

          <div className="text-center font-mono text-xs leading-relaxed text-slate-400">
            Showing <span className="font-bold text-slate-600">{sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to <span className="font-bold text-slate-600">{Math.min(currentPage * pageSize, sortedData.length)}</span> of <span className="font-bold text-slate-600">{sortedData.length}</span> records
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[78px] text-center font-mono text-xs font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedRowEmployee && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedRowEmployee(null)}
        >
          <div
            className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-slide-left"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 bg-white p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
                  {selectedRowEmployee.employeeName
                    .split(" ")
                    .map((name) => name[0])
                    .join("")}
                </div>
                <div>
                  <h3 className="font-sans text-base font-bold text-slate-900">{selectedRowEmployee.employeeName}</h3>
                 <p className="mt-0.5 font-mono text-xs text-slate-400">
  {selectedRowEmployee.position || "Agent"}
</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowEmployee(null)}
                className="rounded-lg p-2 text-slate-700 transition-colors hover:cursor-pointer hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div>
                <h4 className="mb-3 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {selectedRowEmployee.hour !== undefined
                    ? `KPI Summary (${getHourLabel(selectedRowEmployee.hour)})`
                    : `Daily KPI Summary (${selectedDate})`}
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">Logged Time</p>
                    <p className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900">{formatSeconds(selectedRowEmployee.loggedSeconds)}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">Handled Calls</p>
                    <p className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900">{selectedRowEmployee.handledCalls}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">Avg Talk Time</p>
                    <p className="mt-1 font-sans text-xl font-black tracking-tight text-slate-900">{selectedRowEmployee.avgTalkTime}s</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="font-sans text-[11px] font-semibold uppercase tracking-wider text-slate-500">Efficiency</p>
                    <p className="mt-1 font-sans text-xl font-black tracking-tight text-emerald-600">{selectedRowEmployee.efficiency}%</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="sibs-section-label mb-3">Hourly Calls and Logged Time</h4>
                <LazyChartMount heightClass="h-56" className="sibs-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyDrawerData} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="barCalls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.6} />
                        </linearGradient>
                        <linearGradient id="barEmails" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }} dy={10} />
                      <YAxis tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} />
                      <Bar dataKey="calls" fill="url(#barCalls)" radius={[4, 4, 0, 0]} name="Calls Handled">
                        <LabelList dataKey="calls" position="top" offset={10} style={{ fontSize: "12px", fontWeight: "900", fill: "#1e293b", fontFamily: "sans-serif" }} />
                      </Bar>
                      <Bar dataKey="emails" fill="url(#barEmails)" radius={[4, 4, 0, 0]} name="Emails Sent">
                        <LabelList dataKey="emails" position="top" offset={10} style={{ fontSize: "12px", fontWeight: "900", fill: "#1e293b", fontFamily: "sans-serif" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </LazyChartMount>
              </div>

              <div>
                <h4 className="sibs-section-label mb-3">Hourly Efficiency Trend</h4>
                <LazyChartMount heightClass="h-56" className="sibs-chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyDrawerData} margin={{ top: 30, right: 15, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="lineEff" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#34d399" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }} dy={10} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderRadius: "12px", border: "none", color: "#fff", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }} />
                      <Line type="monotone" dataKey="efficiency" stroke="url(#lineEff)" strokeWidth={4} name="Efficiency %" dot={{ r: 5, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 7 }}>
                        <LabelList dataKey="efficiency" position="top" offset={15} style={{ fontSize: "13px", fontWeight: "900", fill: "#0f172a", fontFamily: "sans-serif" }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </LazyChartMount>
              </div>

              <div>
                <h4 className="sibs-section-label mb-3">Historical Daily Performance</h4>
                <div className="overflow-hidden rounded-xl border border-slate-100 divide-y divide-slate-100">
                  {historicalDrawerData.map((hist, index) => (
                    <div key={index} className="flex items-center justify-between p-3.5 font-sans text-[13px] transition-colors hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-700">{hist.date}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-slate-500">Calls: <strong className="font-bold text-slate-900">{hist.calls}</strong></span>
                        <span className="text-slate-500">Emails: <strong className="font-bold text-slate-900">{hist.emails}</strong></span>
                        <span className="text-slate-500">Occupancy: <strong className="font-bold text-slate-900">{hist.occupancy}%</strong></span>
                        <span className={`font-black tracking-tight ${hist.efficiency >= 95 ? "text-emerald-600" : hist.efficiency >= 85 ? "text-amber-500" : "text-red-500"}`}>{hist.efficiency}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 p-4 text-xs">
              <Button
                variant="outline"
                onClick={() => setSelectedRowEmployee(null)}
                className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-200"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
