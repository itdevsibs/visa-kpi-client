import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  User,
  Database,
} from "lucide-react";
import MobilePerformanceCard from "./MobilePerformanceCard.jsx";
import { PerformanceStatsBar } from "./PerformanceStatsBar.jsx";
import LazyChartMount from "../../../components/ui/LazyChartMount.jsx";
import { useDebounce } from "../../../hooks/useDebounce.js";
import { apiGet } from "../../../lib/axios/api.js";
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

const START_HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: new Date(2000, 0, 1, hour, 0, 0).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }),
}));

const END_TIMES = [
  ...Array.from({ length: 23 }, (_, index) => {
    const hour = index + 1;

    return {
      value: hour,
      label: new Date(2000, 0, 1, hour, 0, 0).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
    };
  }),
  {
    value: 24,
    label: "11:59:59 PM",
  },
];

const FILTER_EDGE = "rounded-[10px]";

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeComparableText(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, " ");
}

function getApiPayload(response) {
  return response?.data?.data ?? response?.data ?? response ?? null;
}

function getApiRows(response) {
  const payload = getApiPayload(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

function normalizeEmployee(employee = {}) {
  const employeeUid = cleanText(
    employee.employeeUid ||
      employee.employee_uid ||
      employee.id ||
      employee.employeeId,
  );

  return {
    ...employee,
    id: employeeUid,
    employeeUid,
    employeeId: cleanText(employee.employeeId || employee.employee_id),
    employeeNumber: cleanText(
      employee.employeeNumber || employee.employee_number,
    ),
    employee_name: cleanText(
      employee.employeeName || employee.employee_name || employee.name,
    ),
    email: cleanText(employee.email),
    position: cleanText(employee.position),
    department: cleanText(employee.department),
    team: cleanText(employee.team),
    supervisor: cleanText(employee.supervisor),
    status: cleanText(employee.status),
    employment_status: cleanText(
      employee.employmentStatus || employee.employment_status,
    ),
  };
}

function normalizeRecord(record = {}) {
  return {
    ...record,
    employeeId: cleanText(
      record.employeeId || record.employee_uid || record.employeeUid,
    ),
    employeeName: cleanText(
      record.employeeName || record.employee_name || record.agent_name,
    ),
    email: cleanText(record.email),
    position: cleanText(record.position),
    team: cleanText(record.team),
    productionDate: cleanText(
      record.productionDate || record.production_date,
    ),
    hour:
      record.hour === null || record.hour === undefined
        ? undefined
        : Number(record.hour),
    expectedSeconds: Number(record.expectedSeconds || 0),
    loggedSeconds: Number(record.loggedSeconds || 0),
    handledCalls: Number(record.handledCalls || 0),
    avgTalkTime: Number(record.avgTalkTime || 0),
    avgHoldTime: Number(record.avgHoldTime || 0),
    availableSeconds: Number(record.availableSeconds || 0),
    phoneOccupancy: Number(record.phoneOccupancy || 0),
    availableEmailCapacity: Number(record.availableEmailCapacity || 0),
    targetEmails: Number(record.targetEmails || 0),
    actualEmails: Number(record.actualEmails || 0),
    emailUtilization: Number(record.emailUtilization || 0),
    efficiency: Number(record.efficiency || 0),
  };
}

function formatHourLabel(hour) {
  const option = START_HOURS.find((item) => item.value === Number(hour));
  return option?.label || `${String(hour).padStart(2, "0")}:00`;
}

function formatSeconds(seconds = 0) {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Number(seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

function DashboardDropdownPortal({
  open,
  anchorRef,
  children,
  onClose,
  maxHeight = 300,
  minWidth = 0,
}) {
  const dropdownRef = useRef(null);
  const [style, setStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight,
  });

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      return undefined;
    }

    function updatePosition() {
      const anchor = anchorRef.current;

      if (!anchor) {
        return;
      }

      const rect = anchor.getBoundingClientRect();
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || 0;
      const gap = 8;
      const safePadding = 8;
      const dropdownWidth = Math.max(rect.width, minWidth);
      const spaceBelow = viewportHeight - rect.bottom - gap - safePadding;
      const spaceAbove = rect.top - gap - safePadding;
      const shouldOpenUp = spaceBelow < 190 && spaceAbove > spaceBelow;
      const availableHeight = shouldOpenUp ? spaceAbove : spaceBelow;
      const cleanMaxHeight = Math.max(
        170,
        Math.min(maxHeight, Math.max(availableHeight, 170)),
      );
      const top = shouldOpenUp
        ? Math.max(safePadding, rect.top - cleanMaxHeight - gap)
        : Math.min(
            rect.bottom + gap,
            viewportHeight - cleanMaxHeight - safePadding,
          );
      const maxLeft = Math.max(
        safePadding,
        viewportWidth - dropdownWidth - safePadding,
      );

      setStyle({
        top,
        left: Math.min(Math.max(safePadding, rect.left), maxLeft),
        width: dropdownWidth,
        maxHeight: cleanMaxHeight,
      });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, maxHeight, minWidth, open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleOutsideClick(event) {
      const clickedAnchor = anchorRef?.current?.contains(event.target);
      const clickedDropdown = dropdownRef.current?.contains(event.target);

      if (!clickedAnchor && !clickedDropdown) {
        onClose?.();
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      ref={dropdownRef}
      onMouseDownCapture={(event) => event.stopPropagation()}
      onTouchStartCapture={(event) => event.stopPropagation()}
      className={`fixed z-[999999] overflow-hidden ${FILTER_EDGE} border border-[#D7DEE8] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)]`}
      style={{
        top: `${style.top}px`,
        left: `${style.left}px`,
        width: `${style.width}px`,
      }}
    >
      <div
        className="sibs-scrollbar overflow-y-auto py-2"
        style={{ maxHeight: `${style.maxHeight}px` }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function DashboardEmployeeDropdown({
  employees = [],
  selectedIds = ["all"],
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const allSelected =
    selectedIds.length === 0 || selectedIds.includes("all");

  const selectedLabel = useMemo(() => {
    if (allSelected) {
      return "All Matched Employees";
    }

    if (selectedIds.length === 1) {
      return (
        employees.find((employee) => employee.id === selectedIds[0])
          ?.employee_name || "Select Employee"
      );
    }

    return `${selectedIds.length} Employees Selected`;
  }, [allSelected, employees, selectedIds]);

  const filteredEmployees = useMemo(() => {
    const query = normalizeComparableText(searchText);
    const selectedSet = new Set(
      allSelected ? [] : selectedIds.filter((id) => id !== "all"),
    );
    const matching = query
      ? employees.filter((employee) =>
          normalizeComparableText(
            [
              employee.employee_name,
              employee.email,
              employee.employeeId,
              employee.employeeNumber,
              employee.team,
            ]
              .filter(Boolean)
              .join(" "),
          ).includes(query),
        )
      : [...employees];

    return matching.sort((firstEmployee, secondEmployee) => {
      const firstSelected = selectedSet.has(firstEmployee.id);
      const secondSelected = selectedSet.has(secondEmployee.id);

      if (firstSelected !== secondSelected) {
        return firstSelected ? -1 : 1;
      }

      return firstEmployee.employee_name.localeCompare(
        secondEmployee.employee_name,
        undefined,
        { sensitivity: "base" },
      );
    });
  }, [allSelected, employees, searchText, selectedIds]);

  function handleAllEmployees() {
    onChange?.(["all"]);
    setSearchText("");
  }

  function handleEmployeeToggle(employeeId) {
    const currentIds = allSelected
      ? []
      : selectedIds.filter((id) => id !== "all");
    const nextIds = currentIds.includes(employeeId)
      ? currentIds.filter((id) => id !== employeeId)
      : [...currentIds, employeeId];

    onChange?.(nextIds.length > 0 ? nextIds : ["all"]);
  }

  return (
    <div className="relative min-w-0 overflow-visible">
      <label className="mb-1 block text-sm font-bold text-[#101828]">
        Employee
      </label>

      <div className="relative overflow-visible">
        <Search
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#667085]"
        />

        <input
          ref={inputRef}
          type="text"
          value={open ? searchText : selectedLabel}
          onChange={(event) => {
            setSearchText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setSearchText("");
              setOpen(true);
            }
          }}
          onClick={() => {
            if (!disabled) {
              setSearchText("");
              setOpen(true);
            }
          }}
          disabled={disabled}
          placeholder="Search matched employees..."
          autoComplete="off"
          className={`h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white pl-11 pr-11 text-sm font-bold text-[#344054] outline-none transition placeholder:font-semibold placeholder:text-[#98A2B3] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10`}
        />

        <ChevronDown
          size={18}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (!disabled) {
              setSearchText("");
              setOpen((currentOpen) => !currentOpen);
            }
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#667085] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />

        <DashboardDropdownPortal
          open={open && !disabled}
          anchorRef={inputRef}
          maxHeight={340}
          minWidth={330}
          onClose={() => {
            setOpen(false);
            setSearchText("");
          }}
        >
          <button
            type="button"
            onClick={handleAllEmployees}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
              allSelected
                ? "bg-[#EAF2FB] font-bold text-[#0D4676]"
                : "text-[#344054] hover:bg-[#F8FAFC]"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected
                  ? "border-[#0D4676] bg-[#0D4676] text-white"
                  : "border-[#D0D5DD] bg-white"
              }`}
            >
              {allSelected ? <Check size={12} strokeWidth={3} /> : null}
            </span>
            <span className="truncate">All Matched Employees</span>
          </button>

          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee) => {
              const checked =
                !allSelected && selectedIds.includes(employee.id);

              return (
                <button
                  key={employee.id}
                  type="button"
                  onClick={() => handleEmployeeToggle(employee.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                    checked
                      ? "bg-[#EAF2FB] font-bold text-[#0D4676]"
                      : "text-[#344054] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? "border-[#0D4676] bg-[#0D4676] text-white"
                        : "border-[#D0D5DD] bg-white"
                    }`}
                  >
                    {checked ? <Check size={12} strokeWidth={3} /> : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {employee.employee_name}
                    </span>
                    <span className="mt-0.5 block truncate text-xs font-semibold text-[#667085]">
                      {employee.email || employee.employeeId || employee.id}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-4 text-sm font-semibold text-[#667085]">
              No matched employees found.
            </div>
          )}
        </DashboardDropdownPortal>
      </div>
    </div>
  );
}

function parseDashboardDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDashboardDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDashboardDateLabel(value) {
  const date = parseDashboardDate(value);

  return date
    ? date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "Select date";
}

function isSameCalendarDay(firstDate, secondDate) {
  return (
    firstDate instanceof Date &&
    secondDate instanceof Date &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

function DashboardDatePicker({ value, onChange }) {
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDashboardDate(value), [value]);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const baseDate = selectedDate || new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });

  useEffect(() => {
    if (open) {
      const baseDate = selectedDate || new Date();
      setVisibleMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    }
  }, [open, selectedDate]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const gridStart = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1 - firstDay.getDay(),
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const today = new Date();

  return (
    <div className="relative min-w-0 overflow-visible">
      <label className="mb-1 block text-sm font-bold text-[#101828]">
        Date
      </label>

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`flex h-11 w-full items-center justify-between ${FILTER_EDGE} border border-[#D0D5DD] bg-white px-4 text-left text-sm font-bold text-[#0D4676] outline-none transition hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10 ${
          open ? "border-[#0D4676] ring-4 ring-[#0D4676]/10" : ""
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <CalendarDays size={17} className="shrink-0" />
          <span className="truncate">{formatDashboardDateLabel(value)}</span>
        </span>
        <ChevronDown
          size={17}
          className={`shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <DashboardDropdownPortal
        open={open}
        anchorRef={buttonRef}
        minWidth={310}
        maxHeight={430}
        onClose={() => setOpen(false)}
      >
        <div className="px-4 pb-2 pt-1 text-[#0D4676]">
          <div className="flex items-center justify-between border-b border-[#E6ECF2] pb-3">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (month) =>
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#EAF2FB]"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-extrabold">
              {visibleMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  (month) =>
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#EAF2FB]"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName) => (
              <div
                key={dayName}
                className="flex h-8 items-center justify-center text-xs font-extrabold"
              >
                {dayName}
              </div>
            ))}

            {calendarDays.map((date) => {
              const isCurrentMonth =
                date.getMonth() === visibleMonth.getMonth();
              const isSelected =
                selectedDate && isSameCalendarDay(date, selectedDate);
              const isToday = isSameCalendarDay(date, today);

              return (
                <button
                  key={formatDashboardDateValue(date)}
                  type="button"
                  onClick={() => {
                    onChange?.(formatDashboardDateValue(date));
                    setOpen(false);
                  }}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold transition ${
                    isSelected
                      ? "bg-[#E7F0FA] text-[#0D4676]"
                      : isCurrentMonth
                        ? "text-[#0D4676] hover:bg-[#EAF2FB]"
                        : "text-[#98A7BA] hover:bg-[#F2F6FA]"
                  } ${
                    isToday && !isSelected ? "ring-1 ring-[#B9CCE0]" : ""
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </DashboardDropdownPortal>
    </div>
  );
}

function DashboardTimeDropdown({
  value,
  options = [],
  onChange,
  placeholder = "Search time...",
}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const selectedOption = useMemo(
    () => options.find((option) => Number(option.value) === Number(value)),
    [options, value],
  );
  const visibleOptions = useMemo(() => {
    const query = normalizeComparableText(searchText);

    return query
      ? options.filter((option) =>
          normalizeComparableText(option.label).includes(query),
        )
      : options;
  }, [options, searchText]);

  return (
    <div className="relative min-w-0 overflow-visible">
      <div className="relative overflow-visible">
        <input
          ref={inputRef}
          type="text"
          value={open ? searchText : selectedOption?.label || ""}
          onChange={(event) => {
            setSearchText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setSearchText("");
            setOpen(true);
          }}
          onClick={() => {
            setSearchText("");
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white px-4 pr-11 text-sm font-bold text-[#174A7C] outline-none transition hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10`}
        />
        <ChevronDown
          size={18}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            setSearchText("");
            setOpen((currentOpen) => !currentOpen);
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#0D4676] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />

        <DashboardDropdownPortal
          open={open}
          anchorRef={inputRef}
          maxHeight={280}
          minWidth={190}
          onClose={() => {
            setOpen(false);
            setSearchText("");
          }}
        >
          {visibleOptions.length > 0 ? (
            visibleOptions.map((option) => {
              const selected = Number(option.value) === Number(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange?.(Number(option.value));
                    setSearchText("");
                    setOpen(false);
                  }}
                  className={`block w-full px-4 py-3 text-left text-sm transition ${
                    selected
                      ? "bg-[#E7F0FA] font-extrabold text-[#0D4676]"
                      : "font-medium text-[#475467] hover:bg-[#F8FAFC] hover:text-[#0D4676]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })
          ) : (
            <div className="px-4 py-4 text-sm font-semibold text-[#667085]">
              No time found.
            </div>
          )}
        </DashboardDropdownPortal>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { userRole, selectedSimUserEmail: currentUserEmail } = useRoster();
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedEmpFilters, setSelectedEmpFilters] = useState(["all"]);
  const [selectedDate, setSelectedDate] = useState("");
  const [fromHour, setFromHour] = useState(0);
  const [toHourExclusive, setToHourExclusive] = useState(24);
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

  const loadBootstrap = useCallback(async () => {
    setIsBootstrapLoading(true);
    setLoadError("");

    try {
      const response = await apiGet("/performance/bootstrap");
      const payload = getApiPayload(response) || {};
      const matchedEmployees = Array.isArray(payload.employees)
        ? payload.employees.map(normalizeEmployee).filter((employee) => employee.id)
        : [];

      setEmployees(matchedEmployees);
      setSelectedDate((currentDate) =>
        currentDate || cleanText(payload.latestProductionDate),
      );
    } catch (error) {
      console.error("[PERFORMANCE BOOTSTRAP ERROR]", error);
      setEmployees([]);
      setLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load matched performance employees.",
      );
    } finally {
      setIsBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  const activeUserEmployee = useMemo(() => {
    if (userRole !== "Employee") {
      return null;
    }

    const normalizedEmail = normalizeComparableText(currentUserEmail);

    return (
      employees.find(
        (employee) =>
          normalizeComparableText(employee.email) === normalizedEmail,
      ) || null
    );
  }, [currentUserEmail, employees, userRole]);

  useEffect(() => {
    if (activeUserEmployee) {
      setSelectedEmpFilters([activeUserEmployee.id]);
      return;
    }

    setSelectedEmpFilters((currentFilters) => {
      const validFilters = currentFilters.filter(
        (id) => id === "all" || employees.some((employee) => employee.id === id),
      );

      return validFilters.length > 0 ? validFilters : ["all"];
    });
  }, [activeUserEmployee, employees]);

  const loadRecords = useCallback(async () => {
    if (!selectedDate) {
      setRecords([]);
      return;
    }

    setIsRecordsLoading(true);
    setLoadError("");

    try {
      const employeeUids = selectedEmpFilters.includes("all")
        ? ""
        : selectedEmpFilters.join(",");
      const response = await apiGet("/performance/records", {
        params: {
          date: selectedDate,
          fromHour,
          toHourExclusive,
          interval: intervalType,
          employeeUids,
        },
      });

      setRecords(getApiRows(response).map(normalizeRecord));
    } catch (error) {
      console.error("[PERFORMANCE RECORDS ERROR]", error);
      setRecords([]);
      setLoadError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load matched performance records.",
      );
    } finally {
      setIsRecordsLoading(false);
    }
  }, [
    fromHour,
    intervalType,
    selectedDate,
    selectedEmpFilters,
    toHourExclusive,
  ]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleSort = useCallback((column) => {
    setSortColumn((currentColumn) => {
      if (currentColumn === column) {
        setSortDirection((direction) =>
          direction === "asc" ? "desc" : "asc",
        );
        return currentColumn;
      }

      setSortDirection("asc");
      return column;
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

    sorted.sort((firstRow, secondRow) => {
      const firstValue = firstRow[sortColumn];
      const secondValue = secondRow[sortColumn];

      if (typeof firstValue === "string" || typeof secondValue === "string") {
        return sortDirection === "asc"
          ? String(firstValue || "").localeCompare(String(secondValue || ""))
          : String(secondValue || "").localeCompare(String(firstValue || ""));
      }

      return sortDirection === "asc"
        ? Number(firstValue || 0) - Number(secondValue || 0)
        : Number(secondValue || 0) - Number(firstValue || 0);
    });

    return sorted;
  }, [searchedData, sortColumn, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [currentPage, pageSize, sortedData]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const statistics = useMemo(() => {
    if (records.length === 0) {
      return {
        totalEmp: 0,
        avgEff: 0,
        avgOccupancy: 0,
        totalCalls: 0,
        totalEmails: 0,
      };
    }

    const uniqueEmployees = new Set(records.map((record) => record.employeeId));
    const efficiencySum = records.reduce(
      (sum, record) => sum + record.efficiency,
      0,
    );
    const occupancySum = records.reduce(
      (sum, record) => sum + record.phoneOccupancy,
      0,
    );

    return {
      totalEmp: uniqueEmployees.size,
      avgEff: Math.round((efficiencySum / records.length) * 10) / 10,
      avgOccupancy: Math.round(occupancySum / records.length),
      totalCalls: records.reduce(
        (sum, record) => sum + record.handledCalls,
        0,
      ),
      totalEmails: records.reduce(
        (sum, record) => sum + record.actualEmails,
        0,
      ),
    };
  }, [records]);

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmpFilters.includes("all")) {
      return "All Matched Employees";
    }

    if (selectedEmpFilters.length === 1) {
      return (
        employees.find((employee) => employee.id === selectedEmpFilters[0])
          ?.employee_name || "Selected Employee"
      );
    }

    return `${selectedEmpFilters.length} Employees Selected`;
  }, [employees, selectedEmpFilters]);

  const openEmployeeDrawer = useCallback(
    async (row) => {
      setSelectedRowEmployee(row);
      setIsDrawerLoading(true);
      setHourlyDrawerData([]);
      setHistoricalDrawerData([]);

      try {
        const [hourlyResponse, historyResponse] = await Promise.all([
          apiGet("/performance/records", {
            params: {
              date: selectedDate,
              fromHour,
              toHourExclusive,
              interval: "Hourly",
              employeeUids: row.employeeId,
            },
          }),
          apiGet("/performance/history", {
            params: {
              employeeUid: row.employeeId,
              dateTo: selectedDate,
              days: 5,
              fromHour,
              toHourExclusive,
            },
          }),
        ]);

        setHourlyDrawerData(
          getApiRows(hourlyResponse).map(normalizeRecord).map((record) => ({
            hour: formatHourLabel(record.hour),
            calls: record.handledCalls,
            logged: Math.round((record.loggedSeconds / 60) * 10) / 10,
            emails: record.actualEmails,
            efficiency: record.efficiency,
          })),
        );
        setHistoricalDrawerData(
          getApiRows(historyResponse).map((history) => ({
            date: cleanText(history.date),
            calls: Number(history.calls || 0),
            emails: Number(history.emails || 0),
            occupancy: Number(history.occupancy || 0),
            efficiency: Number(history.efficiency || 0),
          })),
        );
      } catch (error) {
        console.error("[PERFORMANCE DRAWER ERROR]", error);
      } finally {
        setIsDrawerLoading(false);
      }
    },
    [fromHour, selectedDate, toHourExclusive],
  );

  const handleExport = useCallback(() => {
    const headers = [
      "Employee",
      "Email",
      "Interval",
      "Expected Seconds",
      "Logged Seconds",
      "Handled Calls",
      "Average Talk Seconds",
      "Average Hold Seconds",
      "Available Seconds",
      "Phone Occupancy Percent",
      "Email Capacity",
      "Target Emails",
      "Actual Emails",
      "Email Utilization Percent",
      "Efficiency Percent",
    ];
    const rows = sortedData.map((row) => [
      row.employeeName,
      row.email,
      row.hour === undefined ? "Daily" : formatHourLabel(row.hour),
      row.expectedSeconds,
      row.loggedSeconds,
      row.handledCalls,
      row.avgTalkTime,
      row.avgHoldTime,
      row.availableSeconds,
      row.phoneOccupancy,
      row.availableEmailCapacity,
      row.targetEmails,
      row.actualEmails,
      row.emailUtilization,
      row.efficiency,
    ]);
    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");

    link.href = url;
    link.download = `US_Visa_Matched_Performance_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [selectedDate, sortedData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Employee Performance Records
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Only KPI rows matched to active employees in us_visa_kpi_employees
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadBootstrap();
              loadRecords();
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                isBootstrapLoading || isRecordsLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      <PerformanceStatsBar statistics={statistics} />

      <div className="relative z-[100] w-full overflow-visible rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(290px,1.2fr)_minmax(210px,0.8fr)_minmax(340px,1fr)_minmax(190px,0.7fr)] lg:items-end">
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-bold text-[#101828]">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search name, email, position, team..."
                className={`h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white pl-11 pr-4 text-sm font-bold text-[#344054] outline-none transition placeholder:font-semibold placeholder:text-[#98A2B3] hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10`}
              />
            </div>
          </div>

          <div className="relative z-[80] min-w-0 overflow-visible">
            {isBootstrapLoading ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>
                <div className={`flex h-11 items-center gap-2 ${FILTER_EDGE} border border-[#D0D5DD] bg-gray-50 px-4 text-sm font-semibold text-[#667085]`}>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading matched employees...
                </div>
              </>
            ) : userRole === "Employee" ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>
                <div className={`flex h-11 items-center gap-2 ${FILTER_EDGE} border border-[#D0D5DD] bg-gray-50 px-4 text-sm font-bold text-[#344054]`}>
                  <User className="h-4 w-4" />
                  <span className="truncate">{selectedEmployeeName}</span>
                </div>
              </>
            ) : (
              <DashboardEmployeeDropdown
                employees={employees}
                selectedIds={selectedEmpFilters}
                onChange={(newIds) => {
                  startTransition(() => setSelectedEmpFilters(newIds));
                  setCurrentPage(1);
                }}
                disabled={employees.length === 0}
              />
            )}
          </div>

          <div className="relative z-[70] min-w-0 overflow-visible">
            <DashboardDatePicker
              value={selectedDate}
              onChange={(date) => {
                startTransition(() => setSelectedDate(date));
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="relative z-[60] min-w-0 overflow-visible">
            <label className="mb-1 block text-sm font-bold text-[#101828]">
              Time Range
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <DashboardTimeDropdown
                value={fromHour}
                options={START_HOURS.filter(
                  (option) => option.value < toHourExclusive,
                )}
                onChange={(value) => {
                  startTransition(() => setFromHour(value));
                  setCurrentPage(1);
                }}
                placeholder="From time..."
              />
              <span className="text-sm font-bold text-[#98A2B3]">to</span>
              <DashboardTimeDropdown
                value={toHourExclusive}
                options={END_TIMES.filter(
                  (option) => option.value > fromHour,
                )}
                onChange={(value) => {
                  startTransition(() => setToHourExclusive(value));
                  setCurrentPage(1);
                }}
                placeholder="To time..."
              />
            </div>
          </div>

          <div className="min-w-0">
            <label className="mb-1 block text-sm font-bold text-[#101828]">
              Interval
            </label>
            <div className={`inline-flex h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white p-1`}>
              {["Daily", "Hourly"].map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => {
                    startTransition(() => setIntervalType(interval));
                    setCurrentPage(1);
                  }}
                  className={`flex flex-1 items-center justify-center rounded-md px-3 text-sm font-bold transition ${
                    intervalType === interval
                      ? "bg-[#0D4676] text-white shadow-sm"
                      : "text-[#667085] hover:bg-[#F2F6FA] hover:text-[#0D4676]"
                  }`}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          {loadError}
        </div>
      ) : null}

      <div className="space-y-3 lg:hidden">
        {isRecordsLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
            Loading matched KPI records...
          </div>
        ) : paginatedData.length > 0 ? (
          paginatedData.map((row) => (
            <MobilePerformanceCard
              key={`${row.employeeId}-${row.hour ?? "daily"}`}
              row={row}
              onClick={() => openEmployeeDrawer(row)}
            />
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-10 text-center text-sm font-bold text-slate-500">
            No matched records found.
          </div>
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="relative max-h-[500px] overflow-x-auto overflow-y-auto">
          <table className="min-w-[1500px] table-fixed border-collapse text-left text-[13px]">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                {[
                  ["employeeName", "Employee", 210],
                  ["hour", "Interval", 100],
                  ["expectedSeconds", "Expected", 120],
                  ["loggedSeconds", "Logged", 120],
                  ["handledCalls", "Calls", 90],
                  ["avgTalkTime", "Avg Talk", 105],
                  ["avgHoldTime", "Avg Hold", 105],
                  ["availableSeconds", "Available", 115],
                  ["phoneOccupancy", "Occupancy", 115],
                  ["availableEmailCapacity", "Email Capacity", 130],
                  ["targetEmails", "Target Emails", 110],
                  ["actualEmails", "Actual Emails", 110],
                  ["emailUtilization", "Email Util", 110],
                  ["efficiency", "Efficiency", 110],
                ].map(([column, label, width]) => (
                  <th key={column} className="p-3" style={{ width }}>
                    <button
                      type="button"
                      onClick={() => handleSort(column)}
                      className="flex w-full items-center gap-1.5 text-left uppercase hover:text-slate-900"
                    >
                      <span className="truncate">{label}</span>
                      {sortColumn === column ? (
                        sortDirection === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-blue-500" />
                        )
                      ) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isRecordsLoading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Loading matched KPI records...
                    </span>
                  </td>
                </tr>
              ) : paginatedData.length > 0 ? (
                paginatedData.map((row) => {
                  const rowTone =
                    row.efficiency >= 95
                      ? "bg-emerald-50/20 hover:bg-emerald-50/40"
                      : row.efficiency >= 85
                        ? "bg-amber-50/15 hover:bg-amber-50/30"
                        : "bg-rose-50/20 hover:bg-rose-50/35";
                  const indicator =
                    row.efficiency >= 95
                      ? "bg-emerald-500"
                      : row.efficiency >= 85
                        ? "bg-amber-500"
                        : "bg-rose-500";

                  return (
                    <tr
                      key={`${row.employeeId}-${row.hour ?? "daily"}`}
                      onClick={() => openEmployeeDrawer(row)}
                      className={`${rowTone} cursor-pointer transition`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${indicator}`} />
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900">
                              {row.employeeName}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                              {row.email || row.team || "Matched employee"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-medium">
                        {row.hour === undefined ? "Daily" : formatHourLabel(row.hour)}
                      </td>
                      <td className="p-3">
                        {formatSeconds(row.expectedSeconds)}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {formatSeconds(row.loggedSeconds)}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {row.handledCalls}
                      </td>
                      <td className="p-3">{row.avgTalkTime}s</td>
                      <td className="p-3">{row.avgHoldTime}s</td>
                      <td className="p-3">
                        {formatSeconds(row.availableSeconds)}
                      </td>
                      <td className="p-3 font-bold">{row.phoneOccupancy}%</td>
                      <td className="p-3">{row.availableEmailCapacity}</td>
                      <td className="p-3">{row.targetEmails}</td>
                      <td className="p-3 font-semibold">{row.actualEmails}</td>
                      <td className="p-3 font-semibold">{row.emailUtilization}%</td>
                      <td className="p-3 font-bold text-slate-900">
                        {row.efficiency}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-sm font-bold text-slate-500">
                    No matched records found for the selected date and time range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 sm:justify-start">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>

          <div className="text-center text-xs text-slate-400">
            Showing {sortedData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, sortedData.length)} of{" "}
            {sortedData.length} matched records
          </div>

          <div className="flex items-center justify-center gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[88px] text-center text-xs font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {selectedRowEmployee ? (
        <div
          className="fixed inset-0 z-[9999] flex justify-end bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedRowEmployee(null)}
        >
          <div
            className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0D4676] text-sm font-bold text-white">
                  {selectedRowEmployee.employeeName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((name) => name[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">
                    {selectedRowEmployee.employeeName}
                  </h3>
                  <p className="truncate text-xs text-slate-400">
                    {selectedRowEmployee.position || "No position"} •{" "}
                    {selectedRowEmployee.team || "No team"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRowEmployee(null)}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Logged Time", formatSeconds(selectedRowEmployee.loggedSeconds)],
                  ["Handled Calls", selectedRowEmployee.handledCalls],
                  ["Average Talk", `${selectedRowEmployee.avgTalkTime}s`],
                  ["Efficiency", `${selectedRowEmployee.efficiency}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {isDrawerLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-12 text-sm font-bold text-slate-500">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Loading matched employee details...
                </div>
              ) : (
                <>
                  <div>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Hourly Calls and Emails
                    </h4>
                    <LazyChartMount heightClass="h-56" className="sibs-chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyDrawerData} margin={{ top: 25, right: 10, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                          <YAxis tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Calls">
                            <LabelList dataKey="calls" position="top" style={{ fontSize: 10, fontWeight: 700 }} />
                          </Bar>
                          <Bar dataKey="emails" fill="#6366f1" radius={[4, 4, 0, 0]} name="Emails" />
                        </BarChart>
                      </ResponsiveContainer>
                    </LazyChartMount>
                  </div>

                  <div>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Hourly Efficiency
                    </h4>
                    <LazyChartMount heightClass="h-56" className="sibs-chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hourlyDrawerData} margin={{ top: 25, right: 15, left: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                          <YAxis tickLine={false} axisLine={false} width={30} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Efficiency %" />
                        </LineChart>
                      </ResponsiveContainer>
                    </LazyChartMount>
                  </div>

                  <div>
                    <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Historical Daily Performance
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      {historicalDrawerData.length > 0 ? (
                        historicalDrawerData.map((history) => (
                          <div
                            key={history.date}
                            className="flex flex-col justify-between gap-2 border-b border-slate-100 p-3.5 last:border-b-0 sm:flex-row sm:items-center"
                          >
                            <span className="flex items-center gap-2 font-semibold text-slate-700">
                              <Calendar className="h-4 w-4 text-slate-400" />
                              {history.date}
                            </span>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                              <span>Calls: <strong>{history.calls}</strong></span>
                              <span>Emails: <strong>{history.emails}</strong></span>
                              <span>Occupancy: <strong>{history.occupancy}%</strong></span>
                              <span className="font-black text-slate-900">{history.efficiency}%</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-sm font-bold text-slate-500">
                          No matched history found.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Database className="h-3.5 w-3.5" />
                Matched database records only
              </span>
              <Button
                variant="outline"
                onClick={() => setSelectedRowEmployee(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200"
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
