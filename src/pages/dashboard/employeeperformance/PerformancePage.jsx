import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from "../../../components/ui/button.jsx";

import { X, Search, ChevronDown, ChevronUp, SlidersHorizontal, Download, FileSpreadsheet, FileText, Printer, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import MobilePerformanceCard from "./MobilePerformanceCard.jsx";
import { PerformanceStatsBar } from "./PerformanceStatsBar.jsx";
import EmployeeFilterDropdown from "../../../components/ui/EmployeeFilterDropdown.jsx";
import LazyChartMount from "../../../components/ui/LazyChartMount.jsx";
import { aggregateKPIRecords, generateHourlyRecord } from '../../../lib/utils/mockData.js';
import { useDebounce } from "../../../hooks/useDebounce.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LabelList } from 'recharts';
const HOURS = [{
  value: 8,
  label: '08:00 AM'
}, {
  value: 9,
  label: '09:00 AM'
}, {
  value: 10,
  label: '10:00 AM'
}, {
  value: 11,
  label: '11:00 AM'
}, {
  value: 12,
  label: '12:00 PM'
}, {
  value: 13,
  label: '01:00 PM'
}, {
  value: 14,
  label: '02:00 PM'
}, {
  value: 15,
  label: '03:00 PM'
}, {
  value: 16,
  label: '04:00 PM'
}, {
  value: 17,
  label: '05:00 PM'
}];
export default function PerformancePage() {
  const { filteredEmployeesForPerformanceAndDashboard: employees, userRole, selectedSimUserEmail: currentUserEmail } = useRoster();
  const [selectedEmpFilters, setSelectedEmpFilters] = useState(['all']);
  const [selectedDate, setSelectedDate] = useState('2026-07-07');
  const [isPending, startTransition] = useTransition();
  const [fromHour, setFromHour] = useState(8);
  const [toHour, setToHour] = useState(17);
  const [intervalType, setIntervalType] = useState('Daily');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const debouncedSearchQuery = useDebounce(deferredSearchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowEmployee, setSelectedRowEmployee] = useState(null);

  // Sorting
  const [sortColumn, setSortColumn] = useState('employeeName');
  const [sortDirection, setSortDirection] = useState('asc');

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
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
    efficiency: true
  });
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  // Column Resizing Simulation width state (pixels)
  const [colWidths, setColWidths] = useState({
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
    efficiency: 110
  });

  // Filter employees list for the searchable dropdown
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'Active' && e.employment_status === 'Active');
  }, [employees]);

  // Handle Employee role restrictions
  const activeUserEmployee = useMemo(() => {
    if (userRole === 'Employee') {
      return employees.find(e => e.email.toLowerCase() === currentUserEmail.toLowerCase()) || null;
    }
    return null;
  }, [userRole, employees, currentUserEmail]);
  const selectedEmployeeName = useMemo(() => {
    if (selectedEmpFilters.includes('all') || selectedEmpFilters.length === 0) return 'All Employees';
    if (selectedEmpFilters.length === 1) {
      return employees.find(e => e.id === selectedEmpFilters[0])?.employee_name || 'Select Employee';
    }
    return `${selectedEmpFilters.length} Employees`;
  }, [selectedEmpFilters, employees]);
  useEffect(() => {
    if (activeUserEmployee) {
      setSelectedEmpFilters([activeUserEmployee.id]);
    } else {
      const validFilters = selectedEmpFilters.filter(id => id === 'all' || employees.some(e => e.id === id && e.status === 'Active' && e.employment_status === 'Active'));
      if (validFilters.length === 0) {
        setSelectedEmpFilters(['all']);
      } else if (JSON.stringify(validFilters) !== JSON.stringify(selectedEmpFilters)) {
        setSelectedEmpFilters(validFilters);
      }
    }
  }, [activeUserEmployee, employees]);

  // Compile Base Data
  const baseAggregatedData = useMemo(() => {
    const activeEmployees = employees.filter(emp => emp.status === 'Active' && emp.employment_status === 'Active');
    const filterEmployees = selectedEmpFilters.includes('all') || selectedEmpFilters.length === 0 ? activeEmployees : activeEmployees.filter(emp => selectedEmpFilters.includes(emp.id));
    if (intervalType === 'Hourly') {
      const records = [];
      filterEmployees.forEach(emp => {
        for (let h = fromHour; h <= toHour; h++) {
          const hr = generateHourlyRecord(emp.id, selectedDate, h);

          // Calculations
          const avgTalkTime = hr.handledCalls > 0 ? Math.round(hr.totalTalkSeconds / hr.handledCalls) : 0;
          const avgHoldTime = hr.handledCalls > 0 ? Math.round(hr.totalHoldSeconds / hr.handledCalls) : 0;
          const phoneOccupancy = hr.loggedSeconds > 0 ? Math.round(hr.occupiedSeconds / hr.loggedSeconds * 100) : 0;
          const emailUtilization = hr.targetEmails > 0 ? Math.round(hr.actualEmails / hr.targetEmails * 100) : 0;
          records.push({
            employeeId: emp.id,
            employeeName: emp.employee_name,
            position: emp.position,
            team: emp.team,
            expectedSeconds: hr.expectedSeconds,
            loggedSeconds: hr.loggedSeconds,
            handledCalls: hr.handledCalls,
            avgTalkTime,
            avgHoldTime,
            availableSeconds: hr.availableSeconds,
            phoneOccupancy,
            availableEmailCapacity: hr.availableEmailCapacity,
            targetEmails: hr.targetEmails,
            actualEmails: hr.actualEmails,
            emailUtilization,
            efficiency: hr.efficiency,
            hour: h
          });
        }
      });
      return records;
    } else {
      const records = aggregateKPIRecords(employees, selectedDate, fromHour, toHour);
      if (selectedEmpFilters.includes('all') || selectedEmpFilters.length === 0) {
        return records;
      }
      return records.filter(r => selectedEmpFilters.includes(r.employeeId));
    }
  }, [employees, selectedDate, fromHour, toHour, selectedEmpFilters, intervalType]);

  // Apply Search
  const searchedData = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    return baseAggregatedData.filter(item => {
      const employeeName = String(item.employeeName ?? '').toLowerCase();
      const position = String(item.position ?? '').toLowerCase();
      const team = String(item.team ?? '').toLowerCase();
      return employeeName.includes(query) || position.includes(query) || team.includes(query);
    });
  }, [baseAggregatedData, debouncedSearchQuery]);

  // Apply Sorting
  const sortedData = useMemo(() => {
    const sorted = [...searchedData];
    sorted.sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      aVal = aVal;
      bVal = bVal;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [searchedData, sortColumn, sortDirection]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Total pages
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

  // Header stats summary
  const statistics = useMemo(() => {
    if (baseAggregatedData.length === 0) {
      return {
        totalEmp: 0,
        avgEff: 0,
        avgOccupancy: 0,
        totalCalls: 0,
        totalEmails: 0
      };
    }
    const count = baseAggregatedData.length;
    let effSum = 0;
    let occSum = 0;
    let callsSum = 0;
    let emailsSum = 0;
    baseAggregatedData.forEach(item => {
      effSum += item.efficiency;
      occSum += item.phoneOccupancy;
      callsSum += item.handledCalls;
      emailsSum += item.actualEmails;
    });
    return {
      totalEmp: count,
      avgEff: Math.round(effSum / count * 10) / 10,
      avgOccupancy: Math.round(occSum / count),
      totalCalls: callsSum,
      totalEmails: emailsSum
    };
  }, [baseAggregatedData]);

  // Time formatting helper
  const formatSeconds = (sec = 0) => {
  const safeSec = Number.isFinite(Number(sec)) ? Number(sec) : 0;
  const h = Math.floor(safeSec / 3600);
  const m = Math.round((safeSec % 3600) / 60);
  return `${h}h ${m}m`;
};
  const handleSort = useCallback((column) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prevDirection) =>
          prevDirection === 'asc' ? 'desc' : 'asc'
        );
        return prevColumn;
      }

      setSortDirection('asc');
      return column;
    });

    setCurrentPage(1);
  }, []);
  const handleExport = async (format) => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: `Compiling detailed employee KPI report in ${format} format...` }));
    
    // Non-blocking wait
    await new Promise(r => setTimeout(r, 1200));
    await new Promise(r => requestAnimationFrame(r));

    const element = document.createElement("a");
    const headers = "Employee,Interval,Expected Hours (sec),Actual Logged Time,Handled Calls,Avg Talk Time,Avg Hold Time,Available Time,Phone Occupancy,Available Email Capacity,Target Emails,Actual Emails,Email Utilization,Actual Efficiency\n";
    const rows = sortedData.map(r => {
      const intervalVal = r.hour !== undefined ? HOURS.find(h => h.value === r.hour)?.label || `${r.hour}:00` : 'Daily';
      return `"${r.employeeName}","${intervalVal}",${r.expectedSeconds},"${formatSeconds(r.loggedSeconds)}",${r.handledCalls},${r.avgTalkTime},${r.avgHoldTime},"${formatSeconds(r.availableSeconds)}",${r.phoneOccupancy},${r.availableEmailCapacity},${r.targetEmails},${r.actualEmails},${r.emailUtilization},${r.efficiency}`;
    }).join("\n");
    const file = new Blob([headers + rows], {
      type: 'text/csv'
    });
    element.href = URL.createObjectURL(file);
    element.download = `US_Visa_KPI_Records_${selectedDate}.${format === 'Excel' ? 'xlsx' : format === 'PDF' ? 'pdf' : 'csv'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: `Detailed report successfully downloaded!` }));
    setTimeout(() => window.dispatchEvent(new CustomEvent('show-toast', { detail: null })), 3000);
  };
  const toggleColumn = col => {
    setVisibleColumns(prev => ({
      ...prev,
      [col]: !prev[col]
    }));
  };

  // Support interactive column resizing by click-drag simulation
  const handleResize = (col, amount) => {
    setColWidths(prev => ({
      ...prev,
      [col]: Math.max(70, prev[col] + amount)
    }));
  };

  // Generate mock multi-day history for the detail drawer
  const historicalDrawerData = useMemo(() => {
    if (!selectedRowEmployee) return [];
    const dates = ['2026-07-07', '2026-07-06', '2026-07-05', '2026-07-04', '2026-07-03'];
    return dates.map(dt => {
      const dayData = aggregateKPIRecords(employees, dt, 8, 17).find(r => r.employeeId === selectedRowEmployee.employeeId);
      return {
        date: dt,
        efficiency: dayData ? dayData.efficiency : 90 + Math.floor(Math.random() * 8),
        calls: dayData ? dayData.handledCalls : 35 + Math.floor(Math.random() * 15),
        emails: dayData ? dayData.actualEmails : 20 + Math.floor(Math.random() * 10),
        occupancy: dayData ? dayData.phoneOccupancy : 78 + Math.floor(Math.random() * 8)
      };
    });
  }, [selectedRowEmployee, employees]);

  // Hourly drawer stats (Breakdown for selected employee for the active date)
  const hourlyDrawerData = useMemo(() => {
    if (!selectedRowEmployee) return [];
    const data = [];
    for (let h = fromHour; h <= toHour; h++) {
      const hr = generateHourlyRecord(selectedRowEmployee.employeeId, selectedDate, h);
      const hObj = HOURS.find(item => item.value === h);
      data.push({
        hour: hObj ? hObj.label : `${h}:00`,
        calls: hr.handledCalls,
        logged: Math.round(hr.loggedSeconds / 60 * 10) / 10,
        emails: hr.actualEmails,
        efficiency: hr.efficiency
      });
    }
    return data;
  }, [selectedRowEmployee, selectedDate, fromHour, toHour]);
  return <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Employee Performance Records
          </h1>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            Detailed KPI logs, productivity reporting, and historical audit
          </p>
        </div>

        {/* Action controls */}
<div className="flex flex-wrap items-center gap-2">
  <Button
    variant="outline"
    onClick={() => handleExport("CSV")}
    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
  >
    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
    <span className="hidden sm:inline">Export CSV</span>
  </Button>

  <Button
    variant="outline"
    onClick={() => handleExport("Excel")}
    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
  >
    <Download className="h-3.5 w-3.5 text-blue-600" />
    <span className="hidden sm:inline">Excel</span>
  </Button>

  <Button
    variant="outline"
    onClick={() => window.print()}
    className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 transition-all cursor-pointer"
  >
    <Printer className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Print</span>
  </Button>
</div>
      </div>

      {/* Dynamic Statistics Bar above Table */}
      <div className="animate-slide-up-fade">
  <PerformanceStatsBar statistics={statistics} />
</div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-end gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm w-full">
        {/* Search */}
        <div className="flex flex-col gap-1.5 w-full md:flex-[1.35] shrink-0">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Search</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Search name, position, team..." value={searchQuery} onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }} className="sibs-filter-input w-full pl-9 pr-4 bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200" />
            </div>
            {userRole !== 'Employee' && (
              <div className="w-full sm:w-48 shrink-0">
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
        </div>

        {/* Date Filter */}
        <div className="flex flex-col gap-1.5 w-full md:flex-1 shrink-0">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Date</label>
          <input type="date" value={selectedDate} onChange={e => {
          startTransition(() => setSelectedDate(e.target.value));
          setCurrentPage(1);
        }} className="sibs-filter-input w-full bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200 text-center cursor-pointer" />
        </div>

        {/* Hours Selector */}
        <div className="flex flex-col gap-1.5 w-full md:w-auto shrink-0">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Time Range</label>
          <div className="flex items-center gap-2">
            <select value={fromHour} onChange={e => {
            startTransition(() => setFromHour(parseInt(e.target.value)));
            setCurrentPage(1);
          }} className="sibs-filter-input flex-1 md:flex-none bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200 cursor-pointer">
              {HOURS.map(h => <option key={`from-tbl-${h.value}`} value={h.value} disabled={h.value >= toHour}>{h.label}</option>)}
            </select>
            <span className="text-slate-400 font-medium text-sm">-</span>
            <select value={toHour} onChange={e => {
            startTransition(() => setToHour(parseInt(e.target.value)));
            setCurrentPage(1);
          }} className="sibs-filter-input flex-1 md:flex-none bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200 cursor-pointer">
              {HOURS.map(h => <option key={`to-tbl-${h.value}`} value={h.value} disabled={h.value <= fromHour}>{h.label}</option>)}
            </select>
          </div>
        </div>

        {/* Interval Selector */}
        <div className="flex flex-col gap-1.5 w-full md:flex-1 shrink-0">
          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">Interval</label>
          <div className="inline-flex min-h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => startTransition(() => setIntervalType('Daily'))}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                intervalType === 'Daily'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              Daily
            </button>

            <button
              type="button"
              onClick={() => startTransition(() => setIntervalType('Hourly'))}
              className={`flex flex-1 cursor-pointer items-center justify-center rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
                intervalType === 'Hourly'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-900'
              }`}
            >
              Hourly
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      
      {/* 1. Mobile View (Visible only below lg breakpoint) */}
      <div className="space-y-3 lg:hidden">
        {paginatedData.length > 0 ? (
          paginatedData.map(row => (
            <MobilePerformanceCard 
              key={`${row.employeeId}-${row.hour ?? 'daily'}`} 
              row={row} 
              onClick={() => setSelectedRowEmployee(row)} 
            />
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
            No records found.
          </div>
        )}
      </div>

      {/* 2. Desktop View (Visible only at lg breakpoint and above) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hidden lg:block">
        <div className="overflow-x-auto overflow-y-scroll relative max-h-[500px]">
          <table className="w-full text-left border-collapse table-fixed min-w-[1200px]" id="kpi-table">
            {/* Sticky Header */}
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-sans text-slate-500 uppercase tracking-wider sticky top-0 z-10 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
              <tr>
                {visibleColumns.employeeName && <th style={{
                width: colWidths.employeeName
              }} className="p-3 font-semibold relative group">
                    <button type="button" onClick={() => handleSort('employeeName')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left tracking-wider">
                      Employee {sortColumn === 'employeeName' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.interval && <th style={{
                width: colWidths.interval
              }} className="p-3 font-semibold relative uppercase font-bold text-slate-500 tracking-wider">
                    Interval
                    
                  </th>}
                {visibleColumns.expectedHours && <th style={{
                width: colWidths.expectedHours
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('expectedSeconds')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Expected {sortColumn === 'expectedSeconds' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.actualLogged && <th style={{
                width: colWidths.actualLogged
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('loggedSeconds')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Logged {sortColumn === 'loggedSeconds' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.handledCalls && <th style={{
                width: colWidths.handledCalls
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('handledCalls')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Calls {sortColumn === 'handledCalls' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.avgTalkTime && <th style={{
                width: colWidths.avgTalkTime
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('avgTalkTime')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Avg Talk {sortColumn === 'avgTalkTime' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.avgHoldTime && <th style={{
                width: colWidths.avgHoldTime
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('avgHoldTime')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Avg Hold {sortColumn === 'avgHoldTime' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.availableTime && <th style={{
                width: colWidths.availableTime
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('availableSeconds')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Available {sortColumn === 'availableSeconds' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.phoneOccupancy && <th style={{
                width: colWidths.phoneOccupancy
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('phoneOccupancy')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Occupancy {sortColumn === 'phoneOccupancy' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.availableEmailCapacity && <th style={{
                width: colWidths.availableEmailCapacity
              }} className="p-3 font-semibold relative font-sans text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Email Capacity
                    
                  </th>}
                {visibleColumns.targetEmails && <th style={{
                width: colWidths.targetEmails
              }} className="p-3 font-semibold relative font-sans text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                    Target Emails
                    
                  </th>}
                {visibleColumns.actualEmails && <th style={{
                width: colWidths.actualEmails
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('actualEmails')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Emails {sortColumn === 'actualEmails' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.emailUtilization && <th style={{
                width: colWidths.emailUtilization
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('emailUtilization')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Email Util {sortColumn === 'emailUtilization' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
                {visibleColumns.efficiency && <th style={{
                width: colWidths.efficiency
              }} className="p-3 font-semibold relative">
                    <button type="button" onClick={() => handleSort('efficiency')} className="flex items-center gap-1.5 hover:text-slate-900 transition-colors uppercase font-bold w-full text-left truncate tracking-wider">
                      Efficiency {sortColumn === 'efficiency' && (sortDirection === 'asc' ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-blue-500" />)}
                    </button>
                    
                  </th>}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-700 font-sans">
              {paginatedData.map(row => {
              // Conditional Formatting row color-coding
              let rowBg = 'hover:bg-slate-50/50';
              let indicatorColor = 'bg-slate-300';
              if (row.efficiency >= 95) {
                rowBg = 'bg-emerald-50/20 hover:bg-emerald-50/40 text-emerald-950';
                indicatorColor = 'bg-emerald-500';
              } else if (row.efficiency >= 85) {
                rowBg = 'bg-amber-50/15 hover:bg-amber-50/30 text-amber-950';
                indicatorColor = 'bg-amber-500';
              } else {
                rowBg = 'bg-rose-50/20 hover:bg-rose-50/35 text-rose-950';
                indicatorColor = 'bg-rose-500';
              }
              return <tr key={`${row.employeeId}-${row.hour ?? 'daily'}`} onClick={() => setSelectedRowEmployee(row)} className={`${rowBg} cursor-pointer transition-all active:scale-[0.99]`}>
                    {visibleColumns.employeeName && <td className="p-3 flex items-center gap-3 max-w-full truncate">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${indicatorColor} shadow-sm`} />
                        <div className="truncate">
                          <p className="font-bold text-slate-900">{row.employeeName}</p>
                          <p className="text-[11px] text-slate-500 font-medium tracking-wide">{row.team}</p>
                        </div>
                      </td>}
                    {visibleColumns.interval && <td className="p-3 text-slate-600 font-medium">
                        {row.hour !== undefined ? HOURS.find(h => h.value === row.hour)?.label || `${row.hour}:00` : 'Daily'}
                      </td>}
                    {visibleColumns.expectedHours && <td className="p-3 text-slate-700 font-medium">
                        {row.expectedSeconds}s <span className="text-[11px] text-slate-400">({formatSeconds(row.expectedSeconds)})</span>
                      </td>}
                    {visibleColumns.actualLogged && <td className="p-3 font-bold text-slate-800">
                        {formatSeconds(row.loggedSeconds)}
                      </td>}
                    {visibleColumns.handledCalls && <td className="p-3 font-bold text-slate-900 text-[14px]">
                        {row.handledCalls}
                      </td>}
                    {visibleColumns.avgTalkTime && <td className="p-3 text-slate-700 font-medium">
                        {row.avgTalkTime}s
                      </td>}
                    {visibleColumns.avgHoldTime && <td className="p-3 text-slate-700 font-medium">
                        {row.avgHoldTime}s
                      </td>}
                    {visibleColumns.availableTime && <td className="p-3 text-slate-700 font-medium">
                        {formatSeconds(row.availableSeconds)}
                      </td>}
                    {visibleColumns.phoneOccupancy && <td className="p-3 font-bold text-slate-800">
                        {row.phoneOccupancy}%
                      </td>}
                    {visibleColumns.availableEmailCapacity && <td className="p-3 text-slate-700 font-medium">
                        {row.availableEmailCapacity}
                      </td>}
                    {visibleColumns.targetEmails && <td className="p-3 text-slate-700 font-medium">
                        {row.targetEmails}
                      </td>}
                    {visibleColumns.actualEmails && <td className="p-3 font-semibold text-slate-800">
                        {row.actualEmails} <span className="text-[11px] text-slate-400 font-medium">({Math.round(row.actualEmails / (row.expectedSeconds / 3600) * 10) / 10}/h)</span>
                      </td>}
                    {visibleColumns.emailUtilization && <td className="p-3 font-semibold text-slate-800">
                        {row.emailUtilization}%
                      </td>}
                    {visibleColumns.efficiency && <td className="p-3 font-bold text-slate-900 text-[14px]">
                        {row.efficiency}%
                      </td>}
                  </tr>;
            })}
              {paginatedData.length === 0 && <tr>
                  <td colSpan={14} className="p-8 text-center text-slate-500 font-medium text-sm">
                    No matching KPI records found.
                  </td>
                </tr>}
            </tbody>
          </table>
        </div>
      </div>

        {/* Pagination Control Bar */}
<div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
    {/* Page size */}
    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-sans sm:justify-start">
      <span className="shrink-0">Show</span>

      <select
        value={pageSize}
        onChange={(e) => {
          setPageSize(parseInt(e.target.value));
          setCurrentPage(1);
        }}
        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        {[5, 10, 20, 50].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <span className="shrink-0">per page</span>
    </div>

    {/* Records count */}
    <div className="text-center text-xs text-slate-400 font-mono leading-relaxed">
      Showing{" "}
      <span className="font-bold text-slate-600">
        {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
      </span>{" "}
      to{" "}
      <span className="font-bold text-slate-600">
        {Math.min(currentPage * pageSize, sortedData.length)}
      </span>{" "}
      of{" "}
      <span className="font-bold text-slate-600">{sortedData.length}</span>{" "}
      records
    </div>

    {/* Page controls */}
    <div className="flex items-center justify-center gap-2 sm:justify-end">
      <Button
        variant="outline"
        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
        disabled={currentPage === 1}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white p-0 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="min-w-[78px] text-center text-xs font-mono font-semibold text-slate-700">
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
      {/* Employee Detail Drawer (Slide Out Panel from Right) */}
      {selectedRowEmployee && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end animate-fade-in" onClick={() => setSelectedRowEmployee(null)}>
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left" onClick={e => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="bg-white text-white p-5 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm">
                  {selectedRowEmployee.employeeName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-base font-sans text-slate-900">{selectedRowEmployee.employeeName}</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedRowEmployee.position} • {selectedRowEmployee.team}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedRowEmployee(null)} className="p-2 rounded-lg text-slate-700 transition-colors hover:cursor-pointer hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Daily KPI Summary */}
              <div>
                <h4 className="text-[11px] font-sans font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {selectedRowEmployee.hour !== undefined ? `KPI Summary (${HOURS.find(h => h.value === selectedRowEmployee.hour)?.label || `${selectedRowEmployee.hour}:00`})` : `Daily KPI Summary (${selectedDate})`}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[11px] font-sans text-slate-500 font-semibold uppercase tracking-wider">Logged Time</p>
                    <p className="text-xl font-black text-slate-900 font-sans tracking-tight mt-1">{formatSeconds(selectedRowEmployee.loggedSeconds)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[11px] font-sans text-slate-500 font-semibold uppercase tracking-wider">Handled Calls</p>
                    <p className="text-xl font-black text-slate-900 font-sans tracking-tight mt-1">{selectedRowEmployee.handledCalls}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[11px] font-sans text-slate-500 font-semibold uppercase tracking-wider">Avg Talk Time</p>
                    <p className="text-xl font-black text-slate-900 font-sans tracking-tight mt-1">{selectedRowEmployee.avgTalkTime}s</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[11px] font-sans text-slate-500 font-semibold uppercase tracking-wider">Efficiency</p>
                    <p className="text-xl font-black text-emerald-600 font-sans tracking-tight mt-1">{selectedRowEmployee.efficiency}%</p>
                  </div>
                </div>
              </div>

              {/* Hourly Logs Chart */}
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
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} dy={10} />
                      <YAxis tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
                      <Bar dataKey="calls" fill="url(#barCalls)" radius={[4, 4, 0, 0]} name="Calls Handled">
                        <LabelList dataKey="calls" position="top" offset={10} style={{ fontSize: '12px', fontWeight: '900', fill: '#1e293b', fontFamily: 'sans-serif' }} />
                      </Bar>
                      <Bar dataKey="emails" fill="url(#barEmails)" radius={[4, 4, 0, 0]} name="Emails Sent">
                        <LabelList dataKey="emails" position="top" offset={10} style={{ fontSize: '12px', fontWeight: '900', fill: '#1e293b', fontFamily: 'sans-serif' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </LazyChartMount>
              </div>

              {/* Efficiency Trend Line */}
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
                      <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} dy={10} />
                      <YAxis domain={[50, 100]} tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="efficiency" stroke="url(#lineEff)" strokeWidth={4} name="Efficiency %" dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 7 }}>
                        <LabelList dataKey="efficiency" position="top" offset={15} style={{ fontSize: '13px', fontWeight: '900', fill: '#0f172a', fontFamily: 'sans-serif' }} />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </LazyChartMount>
              </div>

              {/* Historical Performance List */}
              <div>
                <h4 className="sibs-section-label mb-3">Historical Daily Performance</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {historicalDrawerData.map((hist, index) => <div key={index} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors text-[13px] font-sans">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-700">{hist.date}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-slate-500">Calls: <strong className="text-slate-900 font-bold">{hist.calls}</strong></span>
                        <span className="text-slate-500">Emails: <strong className="text-slate-900 font-bold">{hist.emails}</strong></span>
                        <span className="text-slate-500">Occupancy: <strong className="text-slate-900 font-bold">{hist.occupancy}%</strong></span>
                        <span className={`font-black tracking-tight ${hist.efficiency >= 95 ? 'text-emerald-600' : hist.efficiency >= 85 ? 'text-amber-500' : 'text-red-500'}`}>
                          {hist.efficiency}%
                        </span>
                      </div>
                    </div>)}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <Button variant="outline"  onClick={() => setSelectedRowEmployee(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium cursor-pointer">
                Close Drawer
              </Button>
            </div>
          </div>
        </div>}
    </div>;
}
