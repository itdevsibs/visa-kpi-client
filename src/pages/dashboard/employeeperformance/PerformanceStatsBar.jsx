import React from "react";
import { User, Award, Activity, Phone, Mail } from "lucide-react";
import { KPI_HEADERS } from "../../../constants/kpiHeaders.js";

const statCards = [
  {
    key: "totalEmp",
    label: "Total Employees",
    icon: User,
    iconClass: "bg-blue-50 text-blue-600",
    suffix: "",
  },
  {
    key: "avgEff",
    label: KPI_HEADERS.actualEfficiency,
    icon: Award,
    iconClass: "bg-amber-50 text-amber-600",
    suffix: "%",
  },
  {
    key: "avgOccupancy",
    label: KPI_HEADERS.phoneOccupancy,
    icon: Activity,
    iconClass: "bg-sky-50 text-sky-600",
    suffix: "%",
  },
  {
    key: "totalCalls",
    label: KPI_HEADERS.handledCalls,
    icon: Phone,
    iconClass: "bg-emerald-50 text-emerald-600",
    suffix: "",
  },
  {
    key: "totalEmails",
    label: KPI_HEADERS.actualEmails,
    icon: Mail,
    iconClass: "bg-indigo-50 text-indigo-600",
    suffix: "",
  },
];

function StatCard({ card, value }) {
  const Icon = card.icon;

  return (
    <div className="sibs-page-card-in h-full">
      <div className="sibs-stat-card group relative flex h-full items-center gap-3 overflow-hidden hover:-translate-y-0.5 hover:shadow-md">
        <div className={`shrink-0 rounded-lg p-2.5 ${card.iconClass}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="sibs-section-label line-clamp-2 min-h-[2rem] leading-tight">
            {card.label}
          </p>
          <p className="sibs-metric-value mt-0.5 truncate text-2xl">
            {value}
            {card.suffix}
          </p>
        </div>
      </div>
    </div>
  );
}

const MemoStatCard = React.memo(StatCard);

export const PerformanceStatsBar = React.memo(function PerformanceStatsBar({
  statistics,
}) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
      id="stats-bar"
    >
      {statCards.map((card) => (
        <MemoStatCard
          key={card.key}
          card={card}
          value={statistics?.[card.key] ?? 0}
        />
      ))}
    </div>
  );
});
