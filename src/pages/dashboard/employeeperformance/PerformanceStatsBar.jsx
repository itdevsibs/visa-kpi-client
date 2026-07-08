import React from 'react';
import { User, Award, Activity, Phone, Mail } from 'lucide-react';

export const PerformanceStatsBar = React.memo(({ statistics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" id="stats-bar">
      <div className="sibs-stat-card bg-gradient-to-br from-slate-50 to-slate-100 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
          <User className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="sibs-section-label truncate">Total Employees</p>
          <p className="sibs-metric-value text-2xl truncate mt-0.5">{statistics.totalEmp}</p>
        </div>
      </div>

      <div className="sibs-stat-card bg-gradient-to-br from-slate-50 to-slate-100 flex items-center gap-3">
        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
          <Award className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="sibs-section-label truncate">Avg Efficiency</p>
          <p className="sibs-metric-value text-2xl truncate mt-0.5">{statistics.avgEff}%</p>
        </div>
      </div>

      <div className="sibs-stat-card bg-gradient-to-br from-slate-50 to-slate-100 flex items-center gap-3">
        <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg shrink-0">
          <Activity className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="sibs-section-label truncate">Phone Occupancy</p>
          <p className="sibs-metric-value text-2xl truncate mt-0.5">{statistics.avgOccupancy}%</p>
        </div>
      </div>

      <div className="sibs-stat-card bg-gradient-to-br from-slate-50 to-slate-100 flex items-center gap-3">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
          <Phone className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="sibs-section-label truncate">Total Calls</p>
          <p className="sibs-metric-value text-2xl truncate mt-0.5">{statistics.totalCalls}</p>
        </div>
      </div>

      <div className="sibs-stat-card bg-gradient-to-br from-slate-50 to-slate-100 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
          <Mail className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="sibs-section-label truncate">Total Emails</p>
          <p className="sibs-metric-value text-2xl truncate mt-0.5">{statistics.totalEmails}</p>
        </div>
      </div>
    </div>
  );
});
