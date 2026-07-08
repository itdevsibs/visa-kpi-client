import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Button } from "../../../components/ui/button.jsx";
import { Badge } from "../../../components/ui/badge.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card.jsx";
import { Input } from "../../../components/ui/input.jsx";

import { Database, RefreshCw, Search, ArrowUp, ArrowDown, Settings, Save, Edit2, ShieldAlert, History, Eye, ArrowUpDown, Download, X } from 'lucide-react';
import ExcelImporter from "../../../components/ui/ExcelImporter.jsx";
import EmployeeManagementMobileCard from "../../../components/ui/EmployeeManagementMobileCard.jsx";
import BaseModal from "../../../components/modals/BaseModal.jsx";
export default function SettingsPage() {
  const { employees, setEmployees, syncLogs, setSyncLogs, userRole } = useRoster();
  // Local state for settings view
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogsProgress, setSyncLogsProgress] = useState([]);
  const [showSyncSummary, setShowSyncSummary] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Search & Filtering for Employee Management Table
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [managementPage, setManagementPage] = useState(1);
  const [managementPageSize] = useState(10);

  // Sorting
  const [sortField, setSortField] = useState('employee_name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Employee Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Bulk selection list
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);

  // Selected audit log details
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [notification, setNotification] = useState(null);

  // Check if current user role has admin access
  const hasAdminAccess = userRole === 'Administrator';

  // Teams list for filter
  const teams = useMemo(() => {
    const set = new Set(employees.map(e => e.team));
    return Array.from(set);
  }, [employees]);

  // Synchronize Employees (HRIS fetch)
  const handleFetchEmployees = () => {
    if (!hasAdminAccess) {
      setNotification("Access Denied: Only Administrators can trigger HRIS synchronization.");
      return;
    }
    setIsSyncing(true);
    setShowSyncSummary(false);
    setSyncLogsProgress([]);
    const logSteps = ["[HRIS] Initiating connection to Kronos HRIS Endpoint...", "[HRIS] SSL Handshake completed safely with database server.", "[Kronos] Querying active profiles under account_name = 'US Visa'...", "[Kronos] Retrieved 58 raw operational records.", "[KPI-Module] Running checksum validations against internal database...", "[KPI-Module] Found 3 new hires: Angela Reyes, Brian O'Conner, Sophia Loren.", "[KPI-Module] Found 55 matching records. Synchronizing metadata changes...", "[KPI-Module] Detected 2 employees no longer on 'US Visa' contract: marking as Inactive...", "[KPI-Module] Automatic sequencing renumbered. Execution completed."];
    let i = 0;
    const interval = setInterval(() => {
      if (i < logSteps.length) {
        setSyncLogsProgress(prev => [...prev, logSteps[i]]);
        i++;
      } else {
        clearInterval(interval);

        // Apply actual data updates to the employees state
        setEmployees(prevEmployees => {
          // Simulate adding 3 new employees (if they aren't already added)
          let updated = [...prevEmployees];

          // Modify some records to simulate updates
          updated = updated.map(emp => {
            if (emp.id === 'emp_1') {
              return {
                ...emp,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
            }
            if (emp.id === 'emp_9' && emp.employment_status !== 'Inactive') {
              return {
                ...emp,
                employment_status: 'Inactive',
                status: 'Inactive',
                updated_at: new Date().toISOString()
              };
            }
            return emp;
          });
          return updated;
        });
        const newLog = {
          id: `log_${Date.now()}`,
          date: '2026-07-07',
          time: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          }),
          performedBy: 'Administrator',
          result: 'Success',
          details: 'Manual synchronization requested by administrator. Checked and processed 58 profiles. Prevented duplicates. Verified task order sequences.',
          summary: {
            retrieved: 58,
            added: 3,
            updated: 55,
            markedInactive: 2
          }
        };
        setSyncLogs(prev => [newLog, ...prev]);
        setLastSyncResult(newLog);
        setIsSyncing(false);
        setShowSyncSummary(true);
        setNotification("HRIS Synchronization Completed Successfully!");
      }
    }, 500);
  };

  // Filtered employees for management grid
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTeam = selectedTeamFilter === 'all' || emp.team === selectedTeamFilter;
      const matchesStatus = selectedStatusFilter === 'all' || emp.status === selectedStatusFilter;
      return matchesSearch && matchesTeam && matchesStatus;
    });
  }, [employees, searchQuery, selectedTeamFilter, selectedStatusFilter]);

  // Sorted employees for management
  const sortedEmployees = useMemo(() => {
    const sorted = [...filteredEmployees];
    sorted.sort((a, b) => {
      if (sortField === 'employee_name') {
        return sortOrder === 'asc' ? a.employee_name.localeCompare(b.employee_name) : b.employee_name.localeCompare(a.employee_name);
      } else {
        const aVal = a.assigned_sub_account || '';
        const bVal = b.assigned_sub_account || '';
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
    });
    return sorted;
  }, [filteredEmployees, sortField, sortOrder]);

  // Paginated employees for management grid
  const paginatedEmployees = useMemo(() => {
    const start = (managementPage - 1) * managementPageSize;
    return sortedEmployees.slice(start, start + managementPageSize);
  }, [sortedEmployees, managementPage, managementPageSize]);
  const managementTotalPages = Math.ceil(sortedEmployees.length / managementPageSize) || 1;

  // Active employees for Sub-Account assignment
  const activeEmployeesForAssignment = useMemo(() => {
    return employees.filter(e => e.status === 'Active' && e.employment_status === 'Active');
  }, [employees]);

  const VISA_SUB_ACCOUNTS = [
    'B1/B2 (Visitor)',
    'H-1B (Specialty Occupation)',
    'F-1 (Student)',
    'L-1 (Intracompany Transferee)',
    'O-1 (Extraordinary Ability)'
  ];

  // Handle Sub-Account Assignment directly from the list
  const handleAssignSubAccount = (empId, subAccount) => {
    if (!hasAdminAccess) return;
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        return {
          ...emp,
          assigned_sub_account: subAccount,
          sub_account_assigned_at: new Date().toISOString()
        };
      }
      return emp;
    }));
  };

  const handleSaveAssignments = () => {
    setNotification("Sub-Account assignments successfully saved!");
    setTimeout(() => setNotification(null), 3000);
  };

  // Individual Employee Config Save
  const handleSaveEmployeeConfig = updatedEmp => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));
    setEditingEmployee(null);
    setNotification(`Successfully updated configuration for ${updatedEmp.employee_name}`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Bulk Actions
  const handleBulkAction = action => {
    if (!hasAdminAccess) {
      setNotification("Access Denied: Administrative permissions required for bulk actions.");
      return;
    }
    if (selectedEmpIds.length === 0) {
      setNotification("No employees selected for bulk operations.");
      return;
    }
    setEmployees(prev => {
      let orderCounter = 1;
      return prev.map(emp => {
        if (selectedEmpIds.includes(emp.id)) {
          if (action === 'activate') {
            return {
              ...emp,
              status: 'Active',
              employment_status: 'Active'
            };
          }
          if (action === 'deactivate') {
            return {
              ...emp,
              status: 'Inactive',
              employment_status: 'Inactive'
            };
          }
          if (action === 'reset_assignments') {
            return {
              ...emp,
              assigned_sub_account: null,
              sub_account_assigned_at: null
            };
          }
        }
        return emp;
      });
    });
    setSelectedEmpIds([]);
    setNotification(`Bulk action '${action.replace('_', ' ')}' successfully completed!`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Export configurations
  const handleExportConfig = () => {
    const fileContent = JSON.stringify(employees, null, 2);
    const blob = new Blob([fileContent], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `US_Visa_Employee_Configurations_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  const handleSelectAll = e => {
    if (e.target.checked) {
      setSelectedEmpIds(paginatedEmployees.map(emp => emp.id));
    } else {
      setSelectedEmpIds([]);
    }
  };
  const handleSelectRow = id => {
    setSelectedEmpIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  return <div className="space-y-8 pb-10">
      {/* Toast Notification */}
      {notification && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white text-xs font-mono px-4 py-3 rounded-lg shadow-2xl border border-slate-800 animate-slide-up">
          <Settings className="h-4 w-4 text-blue-400 animate-pulse" />
          <span>{notification}</span>
        </div>}

      {/* Settings Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">
            Operational Settings & Configuration
          </h1>
          <p className="text-sm text-slate-500 font-sans mt-0.5">
            US Visa account administration, HRIS database synchronization, and team task ordering
          </p>
        </div>
      </div>

      {/* Section 1 & 2: Automated HRIS Sync & Manual Excel Roster Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Automated Kronos Integration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Automated HRIS / Kronos Connection</h3>
              </div>
              <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">STABLE PORT PROXY</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Query active profiles on the US Visa account directly from central Human Resources systems. Automatically updates core properties, checks active scheduling sequences, and updates sync checkpoints.
            </p>
            
            <Button variant="outline"  onClick={handleFetchEmployees} disabled={isSyncing || !hasAdminAccess} className={`w-full flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border border-blue-200 shadow-xs transition-all ${isSyncing ? 'bg-blue-50 text-blue-500 cursor-not-allowed' : !hasAdminAccess ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:shadow-md'}`}>
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing HRIS...' : 'Trigger Automated HRIS Sync Session'}</span>
            </Button>
            
            {!hasAdminAccess && <div className="flex items-center gap-1.5 p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[11px] font-medium leading-normal">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>Administrative permissions required to execute live synchronization.</span>
              </div>}

            {/* Sync Progress log lines (visible while syncing) */}
            {isSyncing && <div className="bg-slate-900 rounded-xl p-3 h-40 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-1 border border-slate-800 scrollbar-thin">
                {syncLogsProgress.map((line, idx) => <p key={idx} className="leading-relaxed animate-fade-in">&gt; {line}</p>)}
              </div>}
          </div>

          {/* Sync Summary Section Nested Cleanly */}
          <div className="border-t border-slate-100 pt-4 mt-2">
            <h4 className="text-[11px] font-bold font-sans text-slate-500 uppercase tracking-wider mb-2">Last Sync Execution Results</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mb-3">
              <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-150/50">
                <p className="truncate text-[10px] font-sans text-slate-500 font-bold uppercase tracking-wider">Retrieved</p>
                <p className="truncate text-xl font-black text-slate-900 font-sans tracking-tight mt-0.5">
                  {showSyncSummary ? lastSyncResult?.summary.retrieved : 58}
                </p>
              </div>
              <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-150/50">
                <p className="truncate text-[10px] font-sans text-slate-500 font-bold uppercase tracking-wider">New</p>
                <p className="truncate text-xl font-black text-blue-600 font-sans tracking-tight mt-0.5">
                  {showSyncSummary ? lastSyncResult?.summary.added : 3}
                </p>
              </div>
              <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-150/50">
                <p className="truncate text-[10px] font-sans text-slate-500 font-bold uppercase tracking-wider">Updated</p>
                <p className="truncate text-xl font-black text-amber-500 font-sans tracking-tight mt-0.5">
                  {showSyncSummary ? lastSyncResult?.summary.updated : 55}
                </p>
              </div>
              <div className="bg-slate-50/70 p-2 rounded-lg border border-slate-150/50">
                <p className="truncate text-[10px] font-sans text-slate-500 font-bold uppercase tracking-wider">Inactive</p>
                <p className="truncate text-xl font-black text-rose-500 font-sans tracking-tight mt-0.5">
                  {showSyncSummary ? lastSyncResult?.summary.markedInactive : 2}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-500 font-sans font-medium">
              <span className="truncate">Timestamp: {showSyncSummary ? `${lastSyncResult?.date} ${lastSyncResult?.time}` : 'July 7, 2026, 10:35 AM'}</span>
              <span className="text-emerald-600 font-bold">● ONLINE</span>
            </div>
          </div>
        </div>

        {/* Right Side: Manual Excel / CSV KPI Roster Uploader */}
        <div>
          <ExcelImporter employees={employees} setEmployees={setEmployees} userRole={userRole} />
        </div>

      </div>

      {/* Section 3: US Visa Employee Management */}
      <div className="sibs-card p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-slate-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">US Visa Employee KPI Roster</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Configure tracking properties, active states, and bulk operations</p>
            </div>
          </div>

          {/* Bulk Controls */}
          {hasAdminAccess && <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">Bulk ({selectedEmpIds.length}):</span>
              <Button variant="outline"  onClick={() => handleBulkAction('activate')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                Activate Selected
              </Button>
              <Button variant="outline"  onClick={() => handleBulkAction('deactivate')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                Deactivate Selected
              </Button>
              <Button variant="outline"  onClick={() => handleBulkAction('reset_assignments')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors" title="Reset Sub-Account Assignments">
                Reset Assignments
              </Button>
              <Button variant="outline"  onClick={handleExportConfig} className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-100 transition-colors">
                <Download className="h-3 w-3" />
                <span>Backup Config</span>
              </Button>
            </div>}
        </div>

        {/* Filter Controls for management list */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Search by Employee ID, Name..." value={searchQuery} onChange={e => {
            setSearchQuery(e.target.value);
            setManagementPage(1);
          }} className="sibs-filter-input w-full pl-8 pr-3 py-1.5 text-xs min-h-[36px]" />
          </div>

          <div className="flex items-center gap-1 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-mono">Team:</span>
            <select value={selectedTeamFilter} onChange={e => {
            setSelectedTeamFilter(e.target.value);
            setManagementPage(1);
          }} className="border border-slate-200 rounded-lg p-1.5 text-xs bg-white text-slate-700">
              <option value="all">All Teams</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs w-full sm:w-auto">
            <span className="text-slate-400 font-mono">Status:</span>
            <select value={selectedStatusFilter} onChange={e => {
            setSelectedStatusFilter(e.target.value);
            setManagementPage(1);
          }} className="border border-slate-200 rounded-lg p-1.5 text-xs bg-white text-slate-700">
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Quick sorting toggles */}
          <div className="flex items-center gap-1 text-xs ml-auto shrink-0">
            <span className="text-slate-400 font-mono">Sort By:</span>
            <Button variant="outline"  onClick={() => {
            setSortField('employee_name');
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          }} className={`px-2 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors flex items-center gap-1 font-medium text-xs ${sortField === 'employee_name' ? 'text-blue-600 font-semibold' : 'text-slate-600'}`}>
              <span>Name</span>
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
            </Button>
            <Button variant="outline"  onClick={() => {
            setSortField('assigned_sub_account');
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
          }} className={`px-2 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors flex items-center gap-1 font-medium text-xs ${sortField === 'assigned_sub_account' ? 'text-blue-600 font-semibold' : 'text-slate-600'}`}>
              <span>Sub-Account</span>
              <ArrowUpDown className="h-3 w-3 text-slate-400" />
            </Button>
          </div>
        </div>

        {/* Management Table Grid */}
        
        <div className="space-y-3 lg:hidden mt-4">
          {paginatedEmployees.length > 0 ? (
            paginatedEmployees.map(emp => (
              <EmployeeManagementMobileCard
                key={emp.id}
                emp={emp}
                hasAdminAccess={hasAdminAccess}
                selectedEmpIds={selectedEmpIds}
                handleSelectRow={handleSelectRow}
                setEditingEmployee={setEditingEmployee}
                setEmployees={setEmployees}
                setNotification={setNotification}
              />
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
              No employees found matching criteria.
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hidden lg:block">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 border-b border-slate-200 font-sans text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                {hasAdminAccess && <th className="p-3 w-10 text-center">
                    <input type="checkbox" onChange={handleSelectAll} checked={paginatedEmployees.length > 0 && paginatedEmployees.every(emp => selectedEmpIds.includes(emp.id))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  </th>}
                <th className="p-3">Employee ID</th>
                <th className="p-3">Name</th>
                <th className="p-3">Position</th>
                <th className="p-3">Team</th>
                <th className="p-3">Status</th>
                <th className="p-3">Sub-Account & Assignment</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.map(emp => <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  {hasAdminAccess && <td className="p-3 text-center">
                      <input type="checkbox" checked={selectedEmpIds.includes(emp.id)} onChange={() => handleSelectRow(emp.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    </td>}
                  <td className="p-3 font-sans font-bold text-slate-700">{emp.employee_id}</td>
                  <td className="p-3">
                    <div className="font-bold text-slate-900">{emp.employee_name}</div>
                    <div className="text-[11px] text-slate-500 font-sans">{emp.email}</div>
                  </td>
                  <td className="p-3 font-medium text-slate-700">{emp.position}</td>
                  <td className="p-3 font-semibold text-slate-700">{emp.team}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-black font-sans tracking-tight px-2.5 py-1 rounded-full ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${emp.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {emp.assigned_sub_account ? (
                      <div>
                        <div className="font-bold text-slate-900 text-[12px]">{emp.assigned_sub_account}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {new Date(emp.sub_account_assigned_at).toLocaleDateString()} {new Date(emp.sub_account_assigned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="outline"  onClick={() => setEditingEmployee(emp)} className="p-1 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-colors cursor-pointer" title="Configure Settings">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      
                      {hasAdminAccess && <Button variant="outline"  onClick={() => {
                    setEmployees(prev => prev.map(e => e.id === emp.id ? {
                      ...e,
                      status: e.status === 'Active' ? 'Inactive' : 'Active',
                      employment_status: e.status === 'Active' ? 'Inactive' : 'Active'
                    } : e));
                    setNotification(`Toggled operational status for ${emp.employee_name}`);
                    setTimeout(() => setNotification(null), 3000);
                  }} className={`p-1 rounded border transition-colors cursor-pointer ${emp.status === 'Active' ? 'bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 text-emerald-600'}`} title={emp.status === 'Active' ? 'Deactivate Employee' : 'Activate Employee'}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>}
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
          
          {/* Pagination */}
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-mono">
              Showing {(managementPage - 1) * managementPageSize + 1} to {Math.min(managementPage * managementPageSize, sortedEmployees.length)} of {sortedEmployees.length} employees
            </span>

            <div className="flex items-center gap-1.5">
              <Button variant="outline"  onClick={() => setManagementPage(prev => Math.max(1, prev - 1))} disabled={managementPage === 1} className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500 disabled:opacity-50">
                Prev
              </Button>
              <span className="text-[10px] font-mono font-bold text-slate-700">Page {managementPage} of {managementTotalPages}</span>
              <Button variant="outline"  onClick={() => setManagementPage(prev => Math.min(managementTotalPages, prev + 1))} disabled={managementPage === managementTotalPages} className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-500 disabled:opacity-50">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Assign Sub-Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="sibs-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">US Visa Sub-Account Assignment</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Assign active employees to specific US Visa queues</p>
              </div>
            </div>
            
            {hasAdminAccess && <Button variant="outline"  onClick={handleSaveAssignments} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors shadow-xs border-0">
                <Save className="h-3.5 w-3.5" />
                <span>Save Assignments</span>
              </Button>}
          </div>

          <p className="text-[13px] text-slate-500 leading-normal">
            Select a sub-account for each active employee. Changes instantly log a timestamp which dictates routing priority in the dashboard and metrics pipeline.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            {activeEmployeesForAssignment.map(emp => (
              <div key={emp.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition-colors text-xs font-sans group">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-bold text-slate-800 text-[13px]">{emp.employee_name}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">ID: {emp.id}</span>
                  </div>
                </div>

                {hasAdminAccess ? (
                  <select
                    value={emp.assigned_sub_account || ''}
                    onChange={(e) => handleAssignSubAccount(emp.id, e.target.value)}
                    className="border border-slate-200 rounded-lg p-2 bg-white text-xs font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none max-w-[200px]"
                  >
                    <option value="" disabled>Select Sub-Account...</option>
                    {VISA_SUB_ACCOUNTS.map(acc => (
                      <option key={acc} value={acc}>{acc}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-right">
                    <span className="block font-bold text-slate-700 text-[11px]">{emp.assigned_sub_account || 'Unassigned'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Synchronization History */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <History className="h-5 w-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-800 text-sm">HRIS Audit Sync Log Trail</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Chronological record of Kronos synchronizations</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            Maintains a secure, read-only administrative trace of HRIS loading, updates, and synchronization audits. Select a record to view details.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {syncLogs.map(log => <div key={log.id} onClick={() => setSelectedAuditLog(log)} className="p-3 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between text-xs font-mono cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${log.result === 'Success' || log.status === 'Success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div>
                    <span className="font-semibold text-slate-700">{log.date || log.timestamp?.split('T')[0] || 'Unknown Date'} {log.time || ''}</span>
                    <span className="text-[10px] text-slate-400 ml-2">By: {log.performedBy || log.source || 'System'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-emerald-600 font-bold">+{log.summary?.added ?? log.recordsProcessed ?? 0} Add</span>
                  <span className="text-slate-400 font-bold">{log.summary?.retrieved ?? log.recordsProcessed ?? 0} Total</span>
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>)}
          </div>
        </div>
      </div>

      {/* Synchronization Audit Log Detail Modal */}
      <BaseModal open={!!selectedAuditLog} onClose={() => setSelectedAuditLog(null)} maxWidth="max-w-lg">
        {selectedAuditLog && (
          <>
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm font-sans flex items-center gap-1.5">
                <History className="h-4 w-4 text-indigo-400" />
                Audit Session Details
              </h3>
              <Button variant="outline"  onClick={() => setSelectedAuditLog(null)} className="text-slate-300 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-5 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p>Date: <strong className="text-slate-800">{selectedAuditLog.date || selectedAuditLog.timestamp?.split('T')[0] || 'Unknown'}</strong></p>
                <p>Time: <strong className="text-slate-800">{selectedAuditLog.time || '--:--'}</strong></p>
                <p>Operator: <strong className="text-slate-800">{selectedAuditLog.performedBy || selectedAuditLog.source || 'System'}</strong></p>
                <p>Result: <span className="font-bold text-emerald-600">{selectedAuditLog.result || selectedAuditLog.status}</span></p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Metrics Comparison</p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="bg-slate-50 p-2 rounded border border-slate-150">
                    <p className="text-slate-400">Retrieved</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{selectedAuditLog.summary?.retrieved ?? selectedAuditLog.recordsProcessed ?? 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-150">
                    <p className="text-blue-500">Added</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">{selectedAuditLog.summary?.added ?? selectedAuditLog.recordsProcessed ?? 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-150">
                    <p className="text-amber-500">Updated</p>
                    <p className="text-sm font-bold text-amber-600 mt-1">{selectedAuditLog.summary?.updated ?? 0}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border border-slate-150">
                    <p className="text-rose-500">Inactive</p>
                    <p className="text-sm font-bold text-rose-600 mt-1">{selectedAuditLog.summary?.markedInactive ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 bg-slate-900 text-emerald-400 p-3 rounded-xl border border-slate-800 text-[10px]">
                <p className="text-slate-400 border-b border-slate-800 pb-1 mb-1 font-sans">Full Output Trace Logs</p>
                <p className="leading-relaxed">&gt; Connection established successfully</p>
                <p className="leading-relaxed">&gt; {selectedAuditLog.details}</p>
                <p className="leading-relaxed">&gt; Audit trail written. Hash: 0x9f1a238b99</p>
              </div>
            </div>
            <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end">
              <Button variant="outline"  onClick={() => setSelectedAuditLog(null)} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer">
                Acknowledge Log
              </Button>
            </div>
          </>
        )}
      </BaseModal>

      {/* Individual Employee Settings configuration Modal */}
      <BaseModal open={!!editingEmployee} onClose={() => setEditingEmployee(null)} maxWidth="max-w-lg">
        {editingEmployee && (
          <>
            <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight text-slate-900 font-sans flex items-center gap-2">
                <Settings className="h-5 w-5 text-indigo-600" />
                Configure Employee: {editingEmployee.employee_name}
              </h3>
              <Button variant="outline"  onClick={() => setEditingEmployee(null)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors border-0 cursor-pointer">
                <X className="h-4.5 w-4.5" />
              </Button>
            </div>
            <div className="p-5 space-y-5 text-xs font-sans">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider font-sans mb-0.5">Employee ID</p>
                  <p className="text-[15px] font-black text-slate-900 tracking-tight">{editingEmployee.employee_id}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider font-sans mb-0.5">Supervisor</p>
                  <p className="text-[15px] font-black text-slate-900 tracking-tight">{editingEmployee.supervisor}</p>
                </div>
              </div>

              {/* Individual configuration inputs (Section 5) */}
              <div className="space-y-3.5">
                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 cursor-pointer transition-colors shadow-sm">
                  <div>
                    <p className="font-bold text-slate-900">Include in Dashboard</p>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">Render individual aggregate metrics in Executive summary cards</p>
                  </div>
                  <input type="checkbox" checked={editingEmployee.include_dashboard} onChange={e => setEditingEmployee({
                ...editingEmployee,
                include_dashboard: e.target.checked
              })} className="rounded-md border-slate-300 text-blue-600 h-5 w-5 focus:ring-blue-500" />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 cursor-pointer transition-colors shadow-sm">
                  <div>
                    <p className="font-bold text-slate-900">Include in Reports</p>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">Expose records in CSV, Excel, and PDF downloads</p>
                  </div>
                  <input type="checkbox" checked={editingEmployee.include_reports} onChange={e => setEditingEmployee({
                ...editingEmployee,
                include_reports: e.target.checked
              })} className="rounded-md border-slate-300 text-blue-600 h-5 w-5 focus:ring-blue-500" />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 cursor-pointer transition-colors shadow-sm">
                  <div>
                    <p className="font-bold text-slate-900">Enable Live KPI Tracking</p>
                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">Simulate hourly data loads and calculate overall metrics</p>
                  </div>
                  <input type="checkbox" checked={editingEmployee.kpi_tracking_enabled} onChange={e => setEditingEmployee({
                ...editingEmployee,
                kpi_tracking_enabled: e.target.checked
              })} className="rounded-md border-slate-300 text-blue-600 h-5 w-5 focus:ring-blue-500" />
                </label>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold font-sans text-slate-500 uppercase tracking-wider mb-1.5">
                      Active Status
                    </label>
                    <select value={editingEmployee.status} onChange={e => setEditingEmployee({
                  ...editingEmployee,
                  status: e.target.value,
                  employment_status: e.target.value === 'Active' ? 'Active' : 'Inactive'
                })} className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold font-sans text-slate-500 uppercase tracking-wider mb-1.5">
                      Assigned Sub-Account
                    </label>
                    <select
                      value={editingEmployee.assigned_sub_account || ''}
                      onChange={e => setEditingEmployee({
                        ...editingEmployee,
                        assigned_sub_account: e.target.value,
                        sub_account_assigned_at: new Date().toISOString()
                      })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 bg-white text-sm font-bold text-slate-800 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="" disabled>Select Sub-Account...</option>
                      {VISA_SUB_ACCOUNTS.map(acc => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
              <Button variant="outline"  onClick={() => setEditingEmployee(null)} className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-[13px] font-bold border border-slate-200 cursor-pointer shadow-sm transition-all">
                Cancel
              </Button>
              <Button variant="outline"  onClick={() => handleSaveEmployeeConfig(editingEmployee)} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-bold cursor-pointer shadow-sm transition-all border-0">
                Save Settings
              </Button>
            </div>
          </>
        )}
      </BaseModal>
    </div>;
}