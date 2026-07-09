import { useRoster } from "../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from "../../components/ui/button.jsx";

import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Clock, Phone, ArrowUpRight, ArrowDownRight, RefreshCw, FileText, Download, Printer, User, Mail, Award, Percent, Zap, BarChart3, HelpCircle } from 'lucide-react';
import { AnimatedNumber } from "../../components/ui/motion.jsx";
import EmployeeFilterDropdown from "../../components/ui/EmployeeFilterDropdown.jsx";
import LazyChartMount from "../../components/ui/LazyChartMount.jsx";
import { getUsVisaKpiDashboard } from "../../services/api/usVisaKpiApi.js";
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
  label: '03:05 PM'
},
// Keep standard label
{
  value: 16,
  label: '04:00 PM'
}, {
  value: 17,
  label: '05:00 PM'
}];

// Normalize HOURS labels if needed
HOURS[7].label = '03:00 PM'; // Fix any typo safely

const EMPTY_SUMMARY_METRICS = {
  loggedTime: 0,
  expectedHours: 0,
  loggedFormatted: '0h 0m',
  loggedAchievement: 0,
  handledCalls: 0,
  callsTarget: 0,
  callsAchievement: 0,
  avgTalkTime: 0,
  talkTarget: 180,
  avgHoldTime: 0,
  holdTarget: 30,
  phoneOccupancy: 0,
  availableEmailCapacity: 0,
  targetEmails: 0,
  actualEmails: 0,
  emailUtilization: 0,
  actualEfficiency: 0,
  trends: {
    loggedTime: 0,
    handledCalls: 0,
    avgTalkTime: 0,
    avgHoldTime: 0,
    phoneOccupancy: 0,
    emailCapacity: 0,
    emailUtilization: 0,
    efficiency: 0,
  },
};

export default function DashboardPage() {
  const { userRole, selectedSimUserEmail: currentUserEmail } = useRoster();

  const [selectedEmpIds, setSelectedEmpIds] = useState(['all']);
  const [selectedDate, setSelectedDate] = useState('2026-06-30');
  const [isPending, startTransition] = useTransition();
  const [fromHour, setFromHour] = useState(8);
  const [toHour, setToHour] = useState(17);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(false);

  const employees = dashboardData?.agents || [];

  const fetchDashboardData = useCallback(async () => {
    try {
      setDashboardLoading(true);
      setDashboardError('');

      const data = await getUsVisaKpiDashboard({
        date: selectedDate,
        fromHour,
        toHour,
        employeeIds: selectedEmpIds,
      });

      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load US Visa KPI dashboard:', error);
      setDashboardError(error.message || 'Failed to load dashboard data.');
    } finally {
      setDashboardLoading(false);
    }
  }, [selectedDate, fromHour, toHour, selectedEmpIds]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // If the user's role is Employee, restrict them to viewing only their own KPIs.
  // Backend KPI agents currently do not include email, so this safely falls back to normal filtering.
  const activeUserEmployee = useMemo(() => {
    if (userRole === 'Employee') {
      return (
        employees.find(
          (e) =>
            e.email &&
            currentUserEmail &&
            e.email.toLowerCase() === currentUserEmail.toLowerCase()
        ) || null
      );
    }

    return null;
  }, [userRole, employees, currentUserEmail]);

  useEffect(() => {
    if (activeUserEmployee) {
      setSelectedEmpIds([activeUserEmployee.id]);
      return;
    }

    const validIds = selectedEmpIds.filter(
      (id) =>
        id === 'all' ||
        employees.some(
          (e) =>
            e.id === id &&
            e.status === 'Active' &&
            e.employment_status === 'Active'
        )
    );

    if (validIds.length === 0) {
      setSelectedEmpIds(['all']);
    } else if (JSON.stringify(validIds) !== JSON.stringify(selectedEmpIds)) {
      setSelectedEmpIds(validIds);
    }
  }, [activeUserEmployee, employees, selectedEmpIds]);

  const activeEmployees = useMemo(() => {
    return employees.filter(
      (e) => e.status === 'Active' && e.employment_status === 'Active'
    );
  }, [employees]);

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmpIds.includes('all') || selectedEmpIds.length === 0) {
      return 'All Employees';
    }

    if (selectedEmpIds.length === 1) {
      return (
        employees.find((e) => e.id === selectedEmpIds[0])?.employee_name ||
        'Select Employee'
      );
    }

    return `${selectedEmpIds.length} Employees Selected`;
  }, [selectedEmpIds, employees]);

  const summaryMetrics = useMemo(() => {
    return dashboardData?.summaryMetrics || EMPTY_SUMMARY_METRICS;
  }, [dashboardData]);

  const hourlyChartData = useMemo(() => {
    return dashboardData?.hourlyChartData || [];
  }, [dashboardData]);

  const teamInsights = useMemo(() => {
    return dashboardData?.teamInsights || null;
  }, [dashboardData]);

  // Helper for rendering trend indicators
  const renderTrend = (value, inverse = false) => {
    const isPositive = value >= 0;
    const isGood = inverse ? !isPositive : isPositive;
    const color = isGood ? 'text-emerald-600' : 'text-rose-600';
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
    return (
      <span className={`${color} font-mono flex items-center gap-0.5`}>
        <Icon className="h-3 w-3" /> {Math.abs(value)}%
      </span>
    );
  };


  // Donut chart phone occupancy parts
  const donutData = useMemo(() => {
    const occupied = summaryMetrics.phoneOccupancy;
    const available = Math.round((100 - occupied) * 0.7); // Let's say available is 70% of non-occupied
    const idle = Math.max(0, 100 - occupied - available); // Rest is idle
    return [{
      name: 'Occupied',
      value: occupied,
      color: '#0ea5e9'
    },
    // Sky-500
    {
      name: 'Available',
      value: available,
      color: '#10b981'
    },
    // Emerald-500
    {
      name: 'Idle',
      value: idle,
      color: '#f59e0b'
    } // Amber-500
    ];
  }, [summaryMetrics.phoneOccupancy]);


  // Dynamic sparkline data derived from hourlyChartData
  const sparklineDataMap = useMemo(() => {
    const keys = [
      'Logged Time',
      'Calls Actual',
      'Avg Talk Time (s)',
      'Avg Hold Time (s)',
      'Occupied %',
      'Email Capacity',
      'Actual Emails',
      'Efficiency %',
    ];

    return keys.reduce((acc, key) => {
      acc[key] = hourlyChartData.map((d) => ({
        val: d[key] ?? 0,
        idx: d.hour,
      }));

      return acc;
    }, {});
  }, [hourlyChartData]);

  const getSparklineData = useCallback(
    (key) => sparklineDataMap[key] || [],
    [sparklineDataMap]
  );
  const triggerRefresh = async () => {
    setIsRefreshing(true);

    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: 'Refreshing backend KPI data...',
      })
    );

    await fetchDashboardData();

    setIsRefreshing(false);

    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: 'Dashboard data refreshed successfully.',
      })
    );

    setTimeout(
      () => window.dispatchEvent(new CustomEvent('show-toast', { detail: null })),
      3000
    );
  };
  const handleExport = async (format) => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: `Preparing US Visa KPI report in ${format} format...` }));
    
    // Simulate non-blocking async work
    await new Promise(r => setTimeout(r, 1000));
    await new Promise(r => requestAnimationFrame(r));

    // Mock File Download trigger
    const element = document.createElement("a");
    const file = new Blob([`US Visa KPI Report\nDate: ${selectedDate}\nPeriod: ${HOURS.find(h => h.value === fromHour)?.label || ''} to ${HOURS.find(h => h.value === toHour)?.label || ''}\nTarget Employee: ${selectedEmployeeName}\n\nMetrics:\nActual Logged Time: ${summaryMetrics.loggedFormatted} (Achievement: ${summaryMetrics.loggedAchievement}%)\nHandled Calls: ${summaryMetrics.handledCalls}\nAverage Talk Time: ${summaryMetrics.avgTalkTime}s\nAverage Hold Time: ${summaryMetrics.avgHoldTime}s\nPhone Occupancy: ${summaryMetrics.phoneOccupancy}%\nActual Efficiency: ${summaryMetrics.actualEfficiency}%`], {
      type: 'text/plain'
    });
    element.href = URL.createObjectURL(file);
    element.download = `US_Visa_KPI_${selectedEmployeeName.replace(/\s+/g, '_')}_${selectedDate}.${format === 'Excel' ? 'csv' : 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    window.dispatchEvent(new CustomEvent('show-toast', { detail: `Report successfully compiled & downloaded!` }));
    setTimeout(() => window.dispatchEvent(new CustomEvent('show-toast', { detail: null })), 4000);
  };
  const handlePrint = () => {
    window.print();
  };
  return <div className="space-y-6" id="dashboard-container">

      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 animate-slide-up-fade relative z-40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans" id="dashboard-title">
            US Visa KPI Dashboard
          </h1>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            Real-Time Productivity & Performance Monitoring
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button variant="outline"  onClick={triggerRefresh} className="sibs-action-btn bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs border-slate-200" title="Refresh Dashboard Data">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          
          <Button variant="outline"  onClick={() => handleExport('PDF')} className="sibs-action-btn bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs border-slate-200">
            <FileText className="h-3.5 w-3.5 text-red-500" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>

          <Button variant="outline"  onClick={() => handleExport('Excel')} className="sibs-action-btn bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs border-slate-200">
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>

          <Button variant="outline"  onClick={handlePrint} className="sibs-action-btn bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs border-slate-200">
            <Printer className="h-3.5 w-3.5 text-blue-500" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {dashboardError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {dashboardError}
        </div>
      )}

      {dashboardLoading && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-600">
          Loading backend KPI data...
        </div>
      )}

      {/* Dashboard Filters Group */}
<div className="flex flex-col md:flex-row items-end gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative z-50 mb-6 w-full">
  {/* Employee */}
  <div className="flex flex-col gap-1.5 w-full md:flex-[1.35] shrink-0">
    {userRole === "Employee" ? (
      <>
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">
          Employee
        </label>
        <div className="flex items-center gap-2 bg-slate-50 text-slate-700 text-xs px-3 py-2 rounded-lg border border-slate-200 cursor-not-allowed min-h-[38px]">
          <User className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold truncate">{selectedEmployeeName}</span>
        </div>
      </>
    ) : (
      <EmployeeFilterDropdown
        label="EMPLOYEE"
        employees={activeEmployees}
        selectedIds={selectedEmpIds}
        onChange={(newIds) => {
          startTransition(() => setSelectedEmpIds(newIds));
        }}
        placeholder="Search team members..."
        selectionMode="immediate"
      />
    )}
  </div>

  {/* Date */}
  <div className="flex flex-col gap-1.5 w-full md:flex-1 shrink-0">
    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">
      Date
    </label>
    <input
      type="date"
      value={selectedDate}
      onChange={(e) => startTransition(() => setSelectedDate(e.target.value))}
      className="sibs-filter-input w-full bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200 text-center cursor-pointer"
    />
  </div>

  {/* Time Range */}
  <div className="flex flex-col gap-1.5 w-full md:flex-1 shrink-0">
    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">
      Time Range
    </label>

    <div className="flex items-center gap-2">
      <select
        value={fromHour}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          if (val < toHour) startTransition(() => setFromHour(val));
        }}
        className="sibs-filter-input flex-1 bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200 cursor-pointer"
      >
        {HOURS.map((h) => (
          <option key={`from-${h.value}`} value={h.value} disabled={h.value >= toHour}>
            {h.label}
          </option>
        ))}
      </select>

      <span className="text-slate-400 font-medium text-sm">-</span>

      <select
        value={toHour}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          if (val > fromHour) startTransition(() => setToHour(val));
        }}
        className="sibs-filter-input flex-1 bg-slate-50 hover:bg-slate-100 text-xs min-h-[38px] rounded-lg border-slate-200 cursor-pointer"
      >
        {HOURS.map((h) => (
          <option key={`to-${h.value}`} value={h.value} disabled={h.value <= fromHour}>
            {h.label}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>

      {/* KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-cards-grid">
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '0ms' }}>
          <div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Clock className="h-4.5 w-4.5" />
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                  {summaryMetrics.loggedAchievement}% Achieved
                </span>
              </div>
            </div>
            <div className="mt-3 min-w-0 flex-1">
              <h3 className="sibs-section-label truncate">Actual Logged Time</h3>
              <p className="sibs-metric-value text-2xl truncate">
                {summaryMetrics.loggedFormatted}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
                <span className="truncate">Target: {summaryMetrics.expectedHours}h</span>
                {renderTrend(summaryMetrics.trends.loggedTime)}
              </div>
            </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Logged Time')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark0" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#spark0)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 2: Handled Calls */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '60ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <Phone className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                {summaryMetrics.callsAchievement}% Achieved
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Handled Calls</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              <AnimatedNumber value={summaryMetrics.handledCalls} /> Calls
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Target: {summaryMetrics.callsTarget}</span>
              {renderTrend(summaryMetrics.trends.handledCalls)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Calls Actual')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#spark1)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 3: Average Talk Time */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '120ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-violet-50 text-violet-600 rounded-lg group-hover:bg-violet-100 transition-colors">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${summaryMetrics.avgTalkTime <= summaryMetrics.talkTarget ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {summaryMetrics.avgTalkTime <= summaryMetrics.talkTarget ? 'Optimal' : 'Above Target'}
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Average Talk Time</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              {summaryMetrics.avgTalkTime}s
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Target: {summaryMetrics.talkTarget}s</span>
              {renderTrend(summaryMetrics.trends.avgTalkTime, true)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Avg Talk Time (s)')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#spark2)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 4: Average Hold Time */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '180ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
              <HelpCircle className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${summaryMetrics.avgHoldTime <= summaryMetrics.holdTarget ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {summaryMetrics.avgHoldTime <= summaryMetrics.holdTarget ? 'Within limit' : 'Critical'}
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Average Hold Time</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              {summaryMetrics.avgHoldTime}s
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Target: {summaryMetrics.holdTarget}s</span>
              {renderTrend(summaryMetrics.trends.avgHoldTime, true)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Avg Hold Time (s)')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#spark3)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 5: Phone Occupancy */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '240ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg group-hover:bg-sky-100 transition-colors">
              <Percent className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600">
                Target 80%
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Phone Occupancy</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              {summaryMetrics.phoneOccupancy}%
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Avg Working Hours</span>
              {renderTrend(summaryMetrics.trends.phoneOccupancy)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Occupied %')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#spark4)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 6: Available Email Capacity */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '300ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">
                Tracked Live
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Available Email Capacity</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              <AnimatedNumber value={summaryMetrics.availableEmailCapacity} /> Emails
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Daily Total Slots</span>
              {renderTrend(summaryMetrics.trends.emailCapacity)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Email Capacity')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark5" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#spark5)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 7: Email Utilization */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '360ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg group-hover:bg-pink-100 transition-colors">
              <Mail className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-600">
                {summaryMetrics.emailUtilization}% Utilization
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Email Utilization</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              {summaryMetrics.actualEmails} / {summaryMetrics.targetEmails}
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Target: {summaryMetrics.targetEmails}</span>
              {renderTrend(summaryMetrics.trends.emailUtilization)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Actual Emails')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark6" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#spark6)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>

        {/* KPI 8: Actual Efficiency */}
        <div className="sibs-page-card-in h-full" style={{ animationDelay: '420ms' }}><div className="sibs-stat-card group relative overflow-hidden h-full flex flex-col hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
              <Award className="h-4.5 w-4.5" />
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${summaryMetrics.actualEfficiency >= 95 ? 'bg-emerald-50 text-emerald-600' : summaryMetrics.actualEfficiency >= 80 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                {summaryMetrics.actualEfficiency}%
              </span>
            </div>
          </div>
          <div className="mt-3 min-w-0 flex-1">
            <h3 className="truncate text-[11px] text-slate-500 font-bold font-sans uppercase tracking-wider">Actual Efficiency</h3>
            <p className="truncate text-2xl font-black text-slate-900 tracking-tight mt-1 font-sans">
              {summaryMetrics.actualEfficiency}%
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-sans">
              <span className="truncate">Target: 95%</span>
              {renderTrend(summaryMetrics.trends.efficiency)}
            </div>
          </div>
          <div className="mt-4 h-12 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getSparklineData('Efficiency %')} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spark7" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#spark7)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div></div>
      </div>

      {/* Dashboard Charts Rows */}
      <div className="space-y-6" id="dashboard-charts-container">
        {/* Row 1: Area Chart & Vertical Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Actual Logged Time vs Expected Hours Area Chart */}
          <div className="sibs-chart-container">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 font-sans flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-blue-500" />
              Actual Logged Time vs Expected Hours (Hours)
            </h3>
            <LazyChartMount heightClass="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData} margin={{
                top: 25,
                right: 20,
                left: 5,
                bottom: 5
              }}>
                  <defs>
                    <linearGradient id="loggedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expectedColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} minTickGap={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <YAxis tickLine={false} axisLine={false} width={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <Tooltip contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                }} labelStyle={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'sans-serif'
                }} itemStyle={{
                  fontSize: '12px',
                  fontFamily: 'sans-serif',
                  color: '#fff'
                }} />
                  <Area type="monotone" dataKey="Expected Hours" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#expectedColor)" />
                  <Area type="monotone" dataKey="Logged Time" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#loggedColor)" dot={{ r: 4, strokeWidth: 2 }}>
                    <LabelList dataKey="Logged Time" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#2563eb' }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </LazyChartMount>
          </div>

          {/* Handled Calls Vertical Bar Chart */}
          <div className="sibs-chart-container">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 font-sans flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-emerald-500" />
              Handled Calls (Actual vs Target)
            </h3>
            <LazyChartMount heightClass="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData} margin={{
                top: 25,
                right: 20,
                left: 5,
                bottom: 5
              }}>
                  <defs>
                    <linearGradient id="callsTargetColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#cbd5e1" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="callsActualColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} minTickGap={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <YAxis tickLine={false} axisLine={false} width={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <Tooltip contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                }} labelStyle={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'sans-serif'
                }} itemStyle={{
                  fontSize: '12px',
                  fontFamily: 'sans-serif',
                  color: '#fff'
                }} />
                  <Bar dataKey="Calls Target" fill="url(#callsTargetColor)" radius={[4, 4, 0, 0]} barSize={12} name="Target Calls" />
                  <Bar dataKey="Calls Actual" fill="url(#callsActualColor)" radius={[4, 4, 0, 0]} barSize={12} name="Actual Calls">
                    <LabelList dataKey="Calls Actual" position="top" offset={5} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#10b981' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </LazyChartMount>
          </div>
        </div>

        {/* Row 2: Dual Line Chart & Phone Occupancy Donut Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Average Talk Time vs Average Hold Time */}
          <div className="sibs-chart-container">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 font-sans flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-violet-500" />
              Average Talk Time vs Average Hold Time (Seconds)
            </h3>
            <LazyChartMount heightClass="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyChartData} margin={{
                top: 35,
                right: 35,
                left: 5,
                bottom: 25
              }}>
                  <defs>
                    <linearGradient id="talkTimeColor" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={1} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="holdTimeColor" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tickLine={false} axisLine={false} minTickGap={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <YAxis tickLine={false} axisLine={false} width={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <Tooltip contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                }} labelStyle={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'sans-serif'
                }} itemStyle={{
                  fontSize: '12px',
                  fontFamily: 'sans-serif'
                }} />
                  <Line type="monotone" dataKey="Avg Talk Time (s)" stroke="url(#talkTimeColor)" strokeWidth={4} dot={{ r: 5, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 7 }} name="Talk Time">
                    <LabelList dataKey="Avg Talk Time (s)" position="top" offset={10} style={{ fontSize: '11px', fontWeight: '700', fill: '#0f172a', fontFamily: 'sans-serif' }} />
                  </Line>
                  <Line type="monotone" dataKey="Avg Hold Time (s)" stroke="url(#holdTimeColor)" strokeWidth={4} dot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }} activeDot={{ r: 7 }} name="Hold Time">
                    <LabelList dataKey="Avg Hold Time (s)" position="bottom" offset={10} style={{ fontSize: '11px', fontWeight: '700', fill: '#0f172a', fontFamily: 'sans-serif' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </LazyChartMount>
          </div>

          {/* Phone Occupancy Donut Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 font-sans flex items-center gap-1.5">
              <Percent className="h-4 w-4 text-sky-500" />
              Phone Occupancy State Allocation
            </h3>
            <div className="relative flex items-center justify-center h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={donutData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={75} 
                    outerRadius={95} 
                    paddingAngle={3} 
                    cornerRadius={10}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Central Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className="text-4xl font-extrabold font-mono text-slate-600 tracking-tighter">{summaryMetrics.phoneOccupancy}%</span>
                <span className="text-[10px] font-bold px-3 py-1 rounded-full mt-1.5 shadow-sm transition-colors bg-sky-100 text-sky-700 ring-1 ring-sky-200 uppercase">
                  Occupied
                </span>
              </div>
            </div>
            {/* Custom Legend */}
            <div className="grid grid-cols-3 gap-1 pt-4 border-t border-slate-100 text-center text-[10px] font-medium tracking-wide">
              {donutData.map((item, index) => (
                <div key={index} className="flex flex-col items-center justify-center gap-1" style={{ color: item.color }}>
                  <span className="h-1.5 w-8 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                  <div className="flex flex-col items-center leading-[1.2]">
                    <span>{item.name}</span>
                    <span className="font-bold">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Email Performance Horizontal Bar & Efficiency Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Performance Horizontal Bar Chart */}
          <div className="sibs-chart-container">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 font-sans flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-indigo-500" />
              Email Processing & Remaining Capacity (Totals)
            </h3>
            <LazyChartMount heightClass="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData} layout="vertical" margin={{
                top: 10,
                right: 25,
                left: 5,
                bottom: 5
              }}>
                  <defs>
                    <linearGradient id="emailActualGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={1} />
                    </linearGradient>
                    <linearGradient id="emailCapacityGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#e2e8f0" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#f8fafc" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} axisLine={false} minTickGap={30} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <YAxis dataKey="hour" type="category" tickLine={false} axisLine={false} width={80} tick={{
                  fontSize: 10,
                  fill: '#64748b'
                }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }} labelStyle={{
                  fontWeight: 'bold',
                  fontSize: '12px',
                  fontFamily: 'sans-serif'
                }} itemStyle={{
                  fontSize: '12px',
                  fontFamily: 'sans-serif',
                  color: '#fff'
                }} />
                  <Bar dataKey="Actual Emails" fill="url(#emailActualGradient)" stackId="a" radius={[0, 0, 0, 0]} name="Processed">
                    <LabelList dataKey="Actual Emails" position="center" style={{ fill: '#fff', fontSize: '11px', fontWeight: 'bold' }} />
                  </Bar>
                  <Bar dataKey="Email Capacity" fill="url(#emailCapacityGradient)" stackId="a" radius={[0, 6, 6, 0]} name="Capacity Left" />
                </BarChart>
              </ResponsiveContainer>
            </LazyChartMount>
          </div>

          {/* Actual Efficiency Gauge Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between group/gauge">
            <h3 className="text-sm font-semibold text-slate-800 mb-2 font-sans flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              Actual Productive Efficiency
            </h3>
            <div className="flex flex-col items-center justify-center pt-2 pb-2 w-full">
              {(() => {
                const eff = Math.min(100, Math.max(0, summaryMetrics.actualEfficiency));
                let trackColor = '#ef4444'; // Red < 80
                if (eff >= 95) trackColor = '#10b981'; // Green >= 95
                else if (eff >= 80) trackColor = '#f59e0b'; // Yellow 80-94

                const chartData = [
                  { name: "Score", value: eff, fill: trackColor },
                  { name: "Remaining", value: 100 - eff, fill: "#f1f5f9" }
                ];

                return (
                  <LazyChartMount heightClass="h-[100px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="100%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={75}
                          outerRadius={95}
                          paddingAngle={0}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={10}
                          isAnimationActive={false}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </LazyChartMount>
                );
              })()}
              
              <div className="flex flex-col items-center -mt-8 z-10">
                <span className="text-4xl font-extrabold font-mono text-slate-600 tracking-tighter">{summaryMetrics.actualEfficiency}%</span>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full mt-1.5 shadow-sm transition-colors ${summaryMetrics.actualEfficiency >= 95 ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : summaryMetrics.actualEfficiency >= 80 ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-red-100 text-red-700 ring-1 ring-red-200'}`}>
                  {summaryMetrics.actualEfficiency >= 95 ? 'EXCELLENT' : summaryMetrics.actualEfficiency >= 80 ? 'NEEDS ATTENTION' : 'ACTION REQUIRED'}
                </span>
              </div>
            </div>

            {/* Gauge Ranges Guide */}
            <div className="grid grid-cols-3 gap-1 pt-4 border-t border-slate-100 text-center text-[10px] font-medium tracking-wide">
              <div className="flex flex-col items-center justify-center gap-1 text-red-600">
                <span className="h-1.5 w-8 rounded-full bg-red-500 shadow-sm"></span>
                <span>less than 80%</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 text-amber-500">
                <span className="h-1.5 w-8 rounded-full bg-amber-500 shadow-sm"></span>
                <span>80-94%</span>
              </div>
              <div className="flex flex-col items-center justify-center gap-1 text-emerald-600">
                <span className="h-1.5 w-8 rounded-full bg-emerald-500 shadow-sm"></span>
                <span>95-100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Insights Bottom Section */}
      {teamInsights && <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200" id="team-insights-container">
          <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-slate-500" />
            Automated Operational Team Insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm min-w-0">
              <p className="truncate text-[10px] font-sans text-slate-400 font-medium">Highest Performing</p>
              <p className="text-xs font-bold text-slate-800 truncate mt-1">{teamInsights.highestEffName}</p>
              <p className="truncate text-lg font-bold font-mono text-emerald-600 mt-1">{teamInsights.highestEffVal}%</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm min-w-0">
              <p className="truncate text-[10px] font-sans text-slate-400 font-medium">Most Calls Handled</p>
              <p className="text-xs font-bold text-slate-800 truncate mt-1">{teamInsights.mostCallsName}</p>
              <p className="truncate text-lg font-bold font-mono text-blue-600 mt-1">{teamInsights.mostCallsVal} Calls</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm min-w-0">
              <p className="truncate text-[10px] font-sans text-slate-400 font-medium">Highest Occupancy</p>
              <p className="truncate text-xs font-bold text-slate-800 mt-1">Peak Occupancy</p>
              <p className="truncate text-lg font-bold font-mono text-indigo-600 mt-1">{teamInsights.highestOccupancy}%</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm min-w-0">
              <p className="truncate text-[10px] font-sans text-slate-400 font-medium">Lowest Efficiency</p>
              <p className="truncate text-xs font-bold text-slate-800 mt-1">Needs Coaching</p>
              <p className="truncate text-lg font-bold font-mono text-red-500 mt-1">{teamInsights.lowestEfficiency}%</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 shadow-sm sm:col-span-2 lg:col-span-1 min-w-0">
              <p className="truncate text-[10px] font-sans text-slate-400 font-medium">Team Avg Efficiency</p>
              <p className="truncate text-xs font-bold text-slate-800 mt-1">Operational Benchmark</p>
              <p className="truncate text-lg font-bold font-mono text-slate-700 mt-1">{teamInsights.teamAverage}%</p>
            </div>
          </div>
        </div>}
    </div>;
}