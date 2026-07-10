import { useRoster } from "../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "../../components/ui/button.jsx";

import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { Clock, Phone, ArrowUpRight, ArrowDownRight, RefreshCw, FileText, Download, Printer, User, Mail, Award, Percent, Zap, BarChart3, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Search, CalendarDays, Check } from 'lucide-react';
import { AnimatedNumber } from "../../components/ui/motion.jsx";
import { aggregateKPIRecords, generateHourlyRecord } from '../../lib/utils/mockData.js';
import LazyChartMount from "../../components/ui/LazyChartMount.jsx";
import { apiGet } from "../../lib/axios/api.js";
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

const KRONOS_ACCOUNT = 'US Visa';
const KRONOS_PAGE_LIMIT = 500;
const KRONOS_FETCH_CONCURRENCY = 6;
const KRONOS_CACHE_TTL_MS = 10 * 60 * 1000;
const KRONOS_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const KRONOS_CACHE_KEY = 'sibs-us-visa-kronos-employees-v3';

let kronosEmployeesMemoryCache = null;
let kronosEmployeesMemoryCacheSavedAt = 0;
let kronosEmployeesInFlightPromise = null;

function cleanText(value) {
  return String(value ?? '').trim();
}

function normalizeComparableText(value) {
  return cleanText(value).toLowerCase().replace(/\s+/g, ' ');
}

function getKronosResponseRows(response) {
  const candidates = [
    response?.data,
    response?.data?.data,
    response?.data?.employees,
    response?.employees,
    response?.rows,
  ];

  return candidates.find(Array.isArray) || [];
}

function getKronosPagination(response) {
  return response?.pagination || response?.data?.pagination || {};
}

function normalizeKronosEmployee(employee = {}, rowIndex = 0) {
  const sibsId = cleanText(
    employee.sibsId ||
      employee.sibs_id ||
      employee.employeeId ||
      employee.employee_id ||
      employee.id
  );

  const fullName = cleanText(
    employee.fullName ||
      employee.full_name ||
      employee.employeeName ||
      employee.employee_name ||
      employee.name
  );

  const email = cleanText(
    employee.email || employee.emailAddress || employee.email_address
  );

  const account = cleanText(
    employee.account || employee.accountName || employee.account_name
  );

  const rawStatus = cleanText(
    employee.status ||
      employee.employmentStatus ||
      employee.employment_status
  );

  const normalizedStatus = normalizeComparableText(rawStatus);
  const inactiveStatuses = new Set([
    'inactive',
    'resigned',
    'terminated',
    'separated',
    'awol',
  ]);
  const isActive = !inactiveStatuses.has(normalizedStatus);

  const id = cleanText(
    employee.id ||
      employee.employeeId ||
      employee.employee_id ||
      sibsId ||
      email ||
      `kronos-${rowIndex}`
  );

  return {
    ...employee,
    id,
    employeeId: id,
    employee_id: id,
    sibsId,
    sibs_id: sibsId,
    fullName: fullName || sibsId || email || 'Unnamed Employee',
    employee_name: fullName || sibsId || email || 'Unnamed Employee',
    name: fullName || sibsId || email || 'Unnamed Employee',
    email,
    account,
    kronos_status: rawStatus,
    status: isActive ? 'Active' : rawStatus || 'Inactive',
    employment_status: isActive ? 'Active' : rawStatus || 'Inactive',
  };
}

function isUsVisaEmployee(employee = {}) {
  const account =
    employee.account || employee.accountName || employee.account_name;

  return (
    normalizeComparableText(account) ===
    normalizeComparableText(KRONOS_ACCOUNT)
  );
}

function sortAndDeduplicateKronosEmployees(rows = []) {
  const normalizedEmployees = rows
    .filter(isUsVisaEmployee)
    .map(normalizeKronosEmployee)
    .filter((employee) => employee.id && employee.employee_name);

  return Array.from(
    new Map(
      normalizedEmployees.map((employee) => [employee.id, employee])
    ).values()
  ).sort((firstEmployee, secondEmployee) =>
    firstEmployee.employee_name.localeCompare(
      secondEmployee.employee_name,
      undefined,
      { sensitivity: 'base' }
    )
  );
}

function readKronosEmployeeCache() {
  const now = Date.now();

  if (
    Array.isArray(kronosEmployeesMemoryCache) &&
    kronosEmployeesMemoryCache.length > 0 &&
    now - kronosEmployeesMemoryCacheSavedAt <= KRONOS_CACHE_MAX_AGE_MS
  ) {
    return {
      employees: kronosEmployeesMemoryCache,
      savedAt: kronosEmployeesMemoryCacheSavedAt,
      isFresh:
        now - kronosEmployeesMemoryCacheSavedAt <= KRONOS_CACHE_TTL_MS,
    };
  }

  if (typeof window === 'undefined') {
    return { employees: [], savedAt: 0, isFresh: false };
  }

  try {
    const cachedValue = window.sessionStorage.getItem(KRONOS_CACHE_KEY);

    if (!cachedValue) {
      return { employees: [], savedAt: 0, isFresh: false };
    }

    const parsedCache = JSON.parse(cachedValue);
    const savedAt = Number(parsedCache?.savedAt || 0);
    const cachedEmployees = Array.isArray(parsedCache?.employees)
      ? parsedCache.employees
      : [];

    if (
      cachedEmployees.length === 0 ||
      !savedAt ||
      now - savedAt > KRONOS_CACHE_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(KRONOS_CACHE_KEY);
      return { employees: [], savedAt: 0, isFresh: false };
    }

    kronosEmployeesMemoryCache = cachedEmployees;
    kronosEmployeesMemoryCacheSavedAt = savedAt;

    return {
      employees: cachedEmployees,
      savedAt,
      isFresh: now - savedAt <= KRONOS_CACHE_TTL_MS,
    };
  } catch (error) {
    console.warn(
      '[US VISA KPI DASHBOARD] Unable to read the Kronos employee cache:',
      error
    );

    return { employees: [], savedAt: 0, isFresh: false };
  }
}

function writeKronosEmployeeCache(employees = []) {
  if (!Array.isArray(employees) || employees.length === 0) {
    return;
  }

  const savedAt = Date.now();

  kronosEmployeesMemoryCache = employees;
  kronosEmployeesMemoryCacheSavedAt = savedAt;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(
      KRONOS_CACHE_KEY,
      JSON.stringify({ savedAt, employees })
    );
  } catch (error) {
    console.warn(
      '[US VISA KPI DASHBOARD] Unable to save the Kronos employee cache:',
      error
    );
  }
}

function getTotalKronosPages(pagination = {}, firstPageRows = []) {
  const explicitTotalPages = Number(
    pagination?.totalPages ||
      pagination?.total_pages ||
      pagination?.lastPage ||
      pagination?.last_page ||
      0
  );

  if (Number.isFinite(explicitTotalPages) && explicitTotalPages > 0) {
    return Math.max(1, Math.ceil(explicitTotalPages));
  }

  const totalRows = Number(
    pagination?.total ||
      pagination?.totalRows ||
      pagination?.total_rows ||
      pagination?.count ||
      0
  );

  const pageSize = Number(
    pagination?.limit ||
      pagination?.pageSize ||
      pagination?.page_size ||
      KRONOS_PAGE_LIMIT
  );

  if (
    Number.isFinite(totalRows) &&
    totalRows > 0 &&
    Number.isFinite(pageSize) &&
    pageSize > 0
  ) {
    return Math.max(1, Math.ceil(totalRows / pageSize));
  }

  return firstPageRows.length >= KRONOS_PAGE_LIMIT ? 2 : 1;
}

async function requestKronosEmployeePage(page) {
  return apiGet('/users/kronos-employees', {
    params: {
      page,
      limit: KRONOS_PAGE_LIMIT,
      search: '',
      department: 'All',
      account: KRONOS_ACCOUNT,
      includeDepartments: 0,
      includeAccounts: 0,
    },
  });
}

async function fetchUsVisaKronosEmployees() {
  if (kronosEmployeesInFlightPromise) {
    return kronosEmployeesInFlightPromise;
  }

  kronosEmployeesInFlightPromise = (async () => {
    const firstResponse = await requestKronosEmployeePage(1);
    const firstRows = getKronosResponseRows(firstResponse);
    const firstPagination = getKronosPagination(firstResponse);
    const totalPages = getTotalKronosPages(firstPagination, firstRows);
    const allRows = [...firstRows];

    if (totalPages > 1) {
      const remainingPages = Array.from(
        { length: totalPages - 1 },
        (_, index) => index + 2
      );

      for (
        let index = 0;
        index < remainingPages.length;
        index += KRONOS_FETCH_CONCURRENCY
      ) {
        const pageBatch = remainingPages.slice(
          index,
          index + KRONOS_FETCH_CONCURRENCY
        );

        const pageResponses = await Promise.all(
          pageBatch.map(requestKronosEmployeePage)
        );

        pageResponses.forEach((response) => {
          allRows.push(...getKronosResponseRows(response));
        });
      }
    }

    const uniqueEmployees = sortAndDeduplicateKronosEmployees(allRows);
    writeKronosEmployeeCache(uniqueEmployees);

    return uniqueEmployees;
  })();

  try {
    return await kronosEmployeesInFlightPromise;
  } finally {
    kronosEmployeesInFlightPromise = null;
  }
}


const FILTER_EDGE = 'rounded-[10px]';

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

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
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
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorRef, onClose, open]);

  if (!open || typeof document === 'undefined') {
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
  selectedIds = ['all'],
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const allSelected =
    selectedIds.length === 0 || selectedIds.includes('all');

  const selectedLabel = useMemo(() => {
    if (allSelected) {
      return 'All Employees';
    }

    if (selectedIds.length === 1) {
      return (
        employees.find((employee) => employee.id === selectedIds[0])
          ?.employee_name || 'Select Employee'
      );
    }

    return `${selectedIds.length} Employees Selected`;
  }, [allSelected, employees, selectedIds]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = normalizeComparableText(searchText);
    const selectedIdSet = new Set(
      allSelected ? [] : selectedIds.filter((id) => id !== 'all'),
    );

    const matchingEmployees = normalizedSearch
      ? employees.filter((employee) => {
          const searchableText = normalizeComparableText(
            [
              employee.employee_name,
              employee.email,
              employee.sibsId,
              employee.sibs_id,
            ]
              .filter(Boolean)
              .join(' '),
          );

          return searchableText.includes(normalizedSearch);
        })
      : [...employees];

    return matchingEmployees.sort((firstEmployee, secondEmployee) => {
      const firstSelected = selectedIdSet.has(firstEmployee.id);
      const secondSelected = selectedIdSet.has(secondEmployee.id);

      if (firstSelected !== secondSelected) {
        return firstSelected ? -1 : 1;
      }

      return String(firstEmployee.employee_name || '').localeCompare(
        String(secondEmployee.employee_name || ''),
        undefined,
        { sensitivity: 'base' },
      );
    });
  }, [allSelected, employees, searchText, selectedIds]);

  const selectedEmployeeCount = allSelected
    ? 0
    : selectedIds.filter((id) => id !== 'all').length;

  function openDropdown() {
    if (disabled) {
      return;
    }

    setSearchText('');
    setOpen(true);
  }

  function handleAllEmployees() {
    onChange?.(['all']);
    setSearchText('');
  }

  function handleEmployeeToggle(employeeId) {
    const currentIds = allSelected
      ? []
      : selectedIds.filter((id) => id !== 'all');

    const nextIds = currentIds.includes(employeeId)
      ? currentIds.filter((id) => id !== employeeId)
      : [...currentIds, employeeId];

    onChange?.(nextIds.length > 0 ? nextIds : ['all']);
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
          onFocus={openDropdown}
          onClick={openDropdown}
          disabled={disabled}
          placeholder="Search US Visa employees..."
          autoComplete="off"
          className={`h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white pl-11 pr-11 text-sm font-bold text-[#344054] outline-none transition placeholder:font-semibold placeholder:text-[#98A2B3] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 hover:border-sibs-primary-1/30 hover:bg-[#F8FAFC] focus:border-sibs-primary-1 focus:ring-4 focus:ring-sibs-primary-1/10`}
        />

        <ChevronDown
          size={18}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) {
              return;
            }

            setSearchText('');
            setOpen((currentOpen) => !currentOpen);
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#667085] transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />

        <DashboardDropdownPortal
          open={open && !disabled}
          anchorRef={inputRef}
          maxHeight={320}
          minWidth={320}
          onClose={() => {
            setOpen(false);
            setSearchText('');
          }}
        >
          <button
            type="button"
            onClick={handleAllEmployees}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
              allSelected
                ? 'bg-[#EAF2FB] font-bold text-sibs-primary-1'
                : 'text-[#344054] hover:bg-[#F8FAFC]'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                allSelected
                  ? 'border-sibs-primary-1 bg-sibs-primary-1 text-white'
                  : 'border-[#D0D5DD] bg-white'
              }`}
            >
              {allSelected ? <Check size={12} strokeWidth={3} /> : null}
            </span>

            <span className="truncate">All Employees</span>
          </button>

          {selectedEmployeeCount > 0 && !searchText ? (
            <div className="sticky top-0 z-10 border-y border-[#D9E2EC] bg-[#F8FAFC] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#667085]">
              Selected Employees ({selectedEmployeeCount})
            </div>
          ) : null}

          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((employee, employeeIndex) => {
              const checked =
                !allSelected && selectedIds.includes(employee.id);

              const previousEmployee = filteredEmployees[employeeIndex - 1];
              const previousWasSelected = previousEmployee
                ? !allSelected && selectedIds.includes(previousEmployee.id)
                : false;
              const startsUnselectedSection =
                selectedEmployeeCount > 0 &&
                !searchText &&
                !checked &&
                previousWasSelected;

              return (
                <React.Fragment key={employee.id}>
                  {startsUnselectedSection ? (
                    <div className="border-y border-[#D9E2EC] bg-[#F8FAFC] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#667085]">
                      Other Employees
                    </div>
                  ) : null}

                <button
                  key={employee.id}
                  type="button"
                  onClick={() => handleEmployeeToggle(employee.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                    checked
                      ? 'bg-[#EAF2FB] font-bold text-sibs-primary-1'
                      : 'text-[#344054] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked
                        ? 'border-sibs-primary-1 bg-sibs-primary-1 text-white'
                        : 'border-[#D0D5DD] bg-white'
                    }`}
                  >
                    {checked ? <Check size={12} strokeWidth={3} /> : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {employee.employee_name}
                    </span>

                    {employee.email || employee.sibsId ? (
                      <span className="mt-0.5 block truncate text-xs font-semibold text-[#667085]">
                        {employee.email || employee.sibsId}
                      </span>
                    ) : null}
                  </span>
                </button>
                </React.Fragment>
              );
            })
          ) : (
            <div className="px-4 py-4 text-sm font-semibold text-[#667085]">
              No employees found.
            </div>
          )}
        </DashboardDropdownPortal>
      </div>
    </div>
  );
}


function parseDashboardDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDashboardDateValue(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDashboardDateLabel(value) {
  const date = parseDashboardDate(value);

  if (!date) {
    return 'Select date';
  }

  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
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
    const baseDate = parseDashboardDate(value) || new Date();
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const baseDate = selectedDate || new Date();
    setVisibleMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  }, [open, selectedDate]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [visibleMonth]);

  const today = new Date();

  function selectDate(date) {
    onChange?.(formatDashboardDateValue(date));
    setOpen(false);
  }

  return (
    <div className="relative min-w-0 overflow-visible">
      <label className="mb-1 block text-sm font-bold text-[#101828]">
        Date
      </label>

      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`flex h-11 w-full items-center justify-between ${FILTER_EDGE} border border-[#D0D5DD] bg-white px-4 text-left text-sm font-bold text-[#0D4676] outline-none transition hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10 ${
          open ? 'border-[#0D4676] ring-4 ring-[#0D4676]/10' : ''
        }`}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <CalendarDays size={17} className="shrink-0 text-[#0D4676]" />
          <span className="truncate">{formatDashboardDateLabel(value)}</span>
        </span>

        <ChevronDown
          size={17}
          className={`ml-2 shrink-0 text-[#0D4676] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
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
        <div role="dialog" aria-label="Choose date" className="px-4 pb-2 pt-1 text-[#0D4676]">
          <div className="flex items-center justify-between border-b border-[#E6ECF2] pb-3">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setVisibleMonth(
                  (currentMonth) =>
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() - 1,
                      1,
                    ),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#EAF2FB]"
            >
              <ChevronLeft size={18} />
            </button>

            <p className="text-sm font-extrabold text-[#0D4676]">
              {visibleMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>

            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setVisibleMonth(
                  (currentMonth) =>
                    new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth() + 1,
                      1,
                    ),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#EAF2FB]"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((dayName) => (
              <div
                key={dayName}
                className="flex h-8 items-center justify-center text-xs font-extrabold text-[#174A7C]"
              >
                {dayName}
              </div>
            ))}

            {calendarDays.map((date) => {
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = selectedDate && isSameCalendarDay(date, selectedDate);
              const isToday = isSameCalendarDay(date, today);

              return (
                <button
                  key={formatDashboardDateValue(date)}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold transition ${
                    isSelected
                      ? 'bg-[#E7F0FA] text-[#0D4676]'
                      : isCurrentMonth
                        ? 'text-[#0D4676] hover:bg-[#EAF2FB]'
                        : 'text-[#98A7BA] hover:bg-[#F2F6FA]'
                  } ${isToday && !isSelected ? 'ring-1 ring-[#B9CCE0]' : ''}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#E6ECF2] pt-3">
            <button
              type="button"
              onClick={() => {
                onChange?.('');
                setOpen(false);
              }}
              className="rounded-lg px-3 py-2 text-xs font-extrabold text-[#0D4676] transition hover:bg-[#F2F6FA]"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="rounded-lg px-3 py-2 text-xs font-extrabold text-[#0D4676] transition hover:bg-[#F2F6FA]"
            >
              Today
            </button>
          </div>
        </div>
      </DashboardDropdownPortal>
    </div>
  );
}


function DashboardTimeDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Search time...',
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedOption = useMemo(
    () => options.find((option) => Number(option.value) === Number(value)),
    [options, value],
  );

  const visibleOptions = useMemo(() => {
    const query = normalizeComparableText(searchText);

    if (!query) {
      return options;
    }

    return options.filter((option) =>
      normalizeComparableText(option.label).includes(query),
    );
  }, [options, searchText]);

  function openDropdown() {
    if (disabled) return;
    setSearchText('');
    setOpen(true);
  }

  function selectOption(option) {
    onChange?.(Number(option.value));
    setSearchText('');
    setOpen(false);
  }

  return (
    <div className="relative min-w-0 overflow-visible">
      {label ? (
        <label className="mb-1 block text-sm font-bold text-[#101828]">
          {label}
        </label>
      ) : null}

      <div className="relative overflow-visible">
        <input
          ref={inputRef}
          type="text"
          value={open ? searchText : selectedOption?.label || ''}
          onChange={(event) => {
            setSearchText(event.target.value);
            setOpen(true);
          }}
          onFocus={openDropdown}
          onClick={openDropdown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={`h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white px-4 pr-11 text-sm font-bold text-[#174A7C] outline-none transition placeholder:font-bold placeholder:text-[#174A7C] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400 hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10`}
        />

        <ChevronDown
          size={18}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) return;
            setSearchText('');
            setOpen((currentOpen) => !currentOpen);
          }}
          className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-[#0D4676] transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />

        <DashboardDropdownPortal
          open={open && !disabled}
          anchorRef={inputRef}
          maxHeight={255}
          minWidth={190}
          onClose={() => {
            setOpen(false);
            setSearchText('');
          }}
        >
          {visibleOptions.length > 0 ? (
            visibleOptions.map((option) => {
              const selected = Number(option.value) === Number(value);

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option)}
                  className={`block w-full px-4 py-3 text-left text-sm transition ${
                    selected
                      ? 'bg-[#E7F0FA] font-extrabold text-[#0D4676]'
                      : 'font-medium text-[#475467] hover:bg-[#F8FAFC] hover:text-[#0D4676]'
                  }`}
                >
                  <span className="block truncate">{option.label}</span>
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

export default function DashboardPage() {
  const {
    userRole,
    selectedSimUserEmail: currentUserEmail,
  } = useRoster();

  const initialKronosCacheRef = useRef(null);

  if (initialKronosCacheRef.current === null) {
    initialKronosCacheRef.current = readKronosEmployeeCache();
  }

  const kronosRequestSequence = useRef(0);
  const [employees, setEmployees] = useState(
    () => initialKronosCacheRef.current.employees
  );
  const [isKronosEmployeesLoading, setIsKronosEmployeesLoading] = useState(
    () => initialKronosCacheRef.current.employees.length === 0
  );
  const [kronosEmployeesError, setKronosEmployeesError] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState(['all']);
  const [selectedDate, setSelectedDate] = useState('2026-07-07');
  const [isPending, startTransition] = useTransition();
  const [fromHour, setFromHour] = useState(8);
  const [toHour, setToHour] = useState(17);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadKronosEmployees = useCallback(
    async ({ background = false, force = false } = {}) => {
      const requestSequence = kronosRequestSequence.current + 1;
      kronosRequestSequence.current = requestSequence;

      const cachedResult = readKronosEmployeeCache();

      if (
        !force &&
        cachedResult.isFresh &&
        cachedResult.employees.length > 0
      ) {
        setEmployees(cachedResult.employees);
        setIsKronosEmployeesLoading(false);
        setKronosEmployeesError('');
        return cachedResult.employees;
      }

      if (!background && cachedResult.employees.length === 0) {
        setIsKronosEmployeesLoading(true);
      }

      setKronosEmployeesError('');

      try {
        const uniqueEmployees = await fetchUsVisaKronosEmployees();

        if (kronosRequestSequence.current === requestSequence) {
          setEmployees(uniqueEmployees);
        }

        return uniqueEmployees;
      } catch (error) {
        console.error(
          '[US VISA KPI DASHBOARD] Unable to load Kronos employees:',
          error
        );

        if (kronosRequestSequence.current === requestSequence) {
          if (cachedResult.employees.length === 0) {
            setEmployees([]);
          }

          setKronosEmployeesError(
            error?.response?.data?.message ||
              error?.message ||
              'Unable to load US Visa employees from Kronos.'
          );
        }

        throw error;
      } finally {
        if (kronosRequestSequence.current === requestSequence) {
          setIsKronosEmployeesLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    const cachedResult = readKronosEmployeeCache();

    loadKronosEmployees({
      background: cachedResult.employees.length > 0,
      force: false,
    }).catch(() => {
      // The error message is already displayed in the employee filter.
    });
  }, [loadKronosEmployees]);

  // If the user's role is Employee, restrict them to viewing only their own KPIs.
  const activeUserEmployee = useMemo(() => {
    if (userRole !== 'Employee') {
      return null;
    }

    const normalizedCurrentUserEmail = normalizeComparableText(currentUserEmail);

    if (!normalizedCurrentUserEmail) {
      return null;
    }

    return (
      employees.find(
        (employee) =>
          normalizeComparableText(employee.email) === normalizedCurrentUserEmail
      ) || null
    );
  }, [userRole, employees, currentUserEmail]);

  const activeEmployees = useMemo(() => {
    return employees.filter(
      (employee) =>
        employee.status === 'Active' &&
        employee.employment_status === 'Active'
    );
  }, [employees]);

  useEffect(() => {
    if (activeUserEmployee) {
      setSelectedEmpIds([activeUserEmployee.id]);
      return;
    }

    setSelectedEmpIds((currentSelectedIds) => {
      const validIds = currentSelectedIds.filter(
        (id) =>
          id === 'all' ||
          activeEmployees.some((employee) => employee.id === id)
      );

      if (validIds.length === 0) {
        return ['all'];
      }

      return validIds;
    });
  }, [activeUserEmployee, activeEmployees]);

  const selectedEmployeeName = useMemo(() => {
    if (selectedEmpIds.includes('all') || selectedEmpIds.length === 0) {
      return 'All Employees';
    }

    if (selectedEmpIds.length === 1) {
      return (
        employees.find((employee) => employee.id === selectedEmpIds[0])
          ?.employee_name || 'Select Employee'
      );
    }

    return `${selectedEmpIds.length} Employees Selected`;
  }, [selectedEmpIds, employees]);

  // Build the complete KPI set only once, then reuse it for cards and insights.
  const allAggregatedKPIs = useMemo(() => {
    return aggregateKPIRecords(
      activeEmployees,
      selectedDate,
      fromHour,
      toHour
    );
  }, [activeEmployees, selectedDate, fromHour, toHour]);

  const currentKPIs = useMemo(() => {
    if (selectedEmpIds.includes('all') || selectedEmpIds.length === 0) {
      return allAggregatedKPIs;
    }

    const selectedIdSet = new Set(selectedEmpIds);

    return allAggregatedKPIs.filter((kpi) =>
      selectedIdSet.has(kpi.employeeId)
    );
  }, [allAggregatedKPIs, selectedEmpIds]);

  // Aggregate values across filtered employees for the summary cards
  const summaryMetrics = useMemo(() => {
    if (currentKPIs.length === 0) {
      return {
        loggedTime: 0,
        expectedHours: 0,
        loggedFormatted: '0h 0m',
        loggedAchievement: 0,
        handledCalls: 0,
        callsTarget: 0,
        callsAchievement: 0,
        avgTalkTime: 0,
        talkTarget: 180,
        // standard target
        avgHoldTime: 0,
        holdTarget: 30,
        // standard target
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
          efficiency: 0
        }
      };
    }
    let totalLogged = 0;
    let totalExpected = 0;
    let totalCalls = 0;
    let totalTalkSeconds = 0;
    let totalHoldSeconds = 0;
    let occupancySum = 0;
    let emailCapacitySum = 0;
    let targetEmailsSum = 0;
    let actualEmailsSum = 0;
    let efficiencySum = 0;
    currentKPIs.forEach(kpi => {
      totalLogged += kpi.loggedSeconds;
      totalExpected += kpi.expectedSeconds;
      totalCalls += kpi.handledCalls;
      totalTalkSeconds += kpi.avgTalkTime * kpi.handledCalls;
      totalHoldSeconds += kpi.avgHoldTime * kpi.handledCalls;
      occupancySum += kpi.phoneOccupancy;
      emailCapacitySum += kpi.availableEmailCapacity;
      targetEmailsSum += kpi.targetEmails;
      actualEmailsSum += kpi.actualEmails;
      efficiencySum += kpi.efficiency;
    });
    const count = currentKPIs.length;
    const avgTalkTime = totalCalls > 0 ? Math.round(totalTalkSeconds / totalCalls) : 0;
    const avgHoldTime = totalCalls > 0 ? Math.round(totalHoldSeconds / totalCalls) : 0;
    const loggedHours = Math.floor(totalLogged / 3600);
    const loggedMins = Math.round(totalLogged % 3600 / 60);
    const targetCalls = count * 45; // average daily target of 45 calls per employee

    return {
      loggedTime: totalLogged,
      expectedHours: totalExpected / 3600,
      loggedFormatted: `${loggedHours}h ${loggedMins}m`,
      loggedAchievement: totalExpected > 0 ? Math.round(totalLogged / totalExpected * 100) : 0,
      handledCalls: totalCalls,
      callsTarget: targetCalls,
      callsAchievement: targetCalls > 0 ? Math.min(100, Math.round(totalCalls / targetCalls * 100)) : 0,
      avgTalkTime,
      talkTarget: 180,
      avgHoldTime,
      holdTarget: 30,
      phoneOccupancy: Math.round(occupancySum / count),
      availableEmailCapacity: Math.round(emailCapacitySum),
      targetEmails: targetEmailsSum,
      actualEmails: actualEmailsSum,
      emailUtilization: targetEmailsSum > 0 ? Math.round(actualEmailsSum / targetEmailsSum * 100) : 0,
      actualEfficiency: Math.round(efficiencySum / count * 10) / 10,
      // Dynamic pseudo-trends based on aggregated data properties
      trends: {
        loggedTime: (totalLogged % 11) - 4,
        handledCalls: (totalCalls % 15) - 3,
        avgTalkTime: (avgTalkTime % 9) - 4,
        avgHoldTime: (avgHoldTime % 11) - 5,
        phoneOccupancy: (Math.round(occupancySum) % 7) - 2,
        emailCapacity: (Math.round(emailCapacitySum) % 25) - 15,
        emailUtilization: (actualEmailsSum % 13) - 3,
        efficiency: (Math.round(efficiencySum) % 6) - 2
      }
    };
  }, [currentKPIs]);

  // Helper for rendering trend indicators
  const renderTrend = (value, inverse = false) => {
    const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
    const isPositive = safeValue >= 0;
    const isGood = inverse ? !isPositive : isPositive;
    const color = isGood ? 'text-emerald-600' : 'text-rose-600';
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight;

    return (
      <span className={`${color} font-mono flex items-center gap-0.5`}>
        <Icon className="h-3 w-3" /> {Math.abs(safeValue)}%
      </span>
    );
  };

  // Hourly chart data series (aggregated hourly across all filtered employees)
  const hourlyChartData = useMemo(() => {
    const data = [];
    const activeFilterEmployees = selectedEmpIds.includes('all') || selectedEmpIds.length === 0 ? activeEmployees : activeEmployees.filter(e => selectedEmpIds.includes(e.id));
    for (let h = fromHour; h <= toHour; h++) {
      let expected = 0;
      let logged = 0;
      let calls = 0;
      let talkSum = 0;
      let holdSum = 0;
      let callsWithDuration = 0;
      let actualEmails = 0;
      let targetEmails = 0;
      let emailCapacity = 0;
      let occupiedSec = 0;
      let efficiencySum = 0;
      let workingAgentsCount = 0;
      activeFilterEmployees.forEach(emp => {
        const hr = generateHourlyRecord(emp.id, selectedDate, h);
        expected += hr.expectedSeconds;
        logged += hr.loggedSeconds;
        calls += hr.handledCalls;
        actualEmails += hr.actualEmails;
        targetEmails += hr.targetEmails;
        emailCapacity += hr.availableEmailCapacity;
        occupiedSec += hr.occupiedSeconds;
        if (hr.handledCalls > 0) {
          const avgT = hr.totalTalkSeconds / hr.handledCalls;
          const avgH = hr.totalHoldSeconds / hr.handledCalls;
          talkSum += avgT;
          holdSum += avgH;
          callsWithDuration++;
        }
        if (hr.expectedSeconds > 0) {
          efficiencySum += hr.efficiency;
          workingAgentsCount++;
        }
      });
      const avgTalk = callsWithDuration > 0 ? Math.round(talkSum / callsWithDuration) : 0;
      const avgHold = callsWithDuration > 0 ? Math.round(holdSum / callsWithDuration) : 0;
      const occupancy = logged > 0 ? Math.round(occupiedSec / logged * 100) : 0;
      const efficiency = workingAgentsCount > 0 ? Math.round(efficiencySum / workingAgentsCount) : 0;
      const hourObj = HOURS.find(item => item.value === h);
      const hourLabel = hourObj ? hourObj.label : `${h}:00`;
      data.push({
        hour: hourLabel,
        'Expected Hours': Math.round(expected / 3600 * 10) / 10,
        'Logged Time': Math.round(logged / 3600 * 10) / 10,
        'Calls Actual': calls,
        'Calls Target': activeFilterEmployees.length * 5,
        // 5 calls target per working hour
        'Avg Talk Time (s)': avgTalk,
        'Avg Hold Time (s)': avgHold,
        'Occupied %': occupancy,
        'Available %': Math.max(0, 100 - occupancy),
        'Actual Emails': actualEmails,
        'Target Emails': targetEmails,
        'Email Capacity': emailCapacity,
        'Efficiency %': efficiency
      });
    }
    return data;
  }, [selectedEmpIds, activeEmployees, selectedDate, fromHour, toHour]);

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

  // Team Insights Generation
  const teamInsights = useMemo(() => {
    if (allAggregatedKPIs.length === 0) return null;

    const allAggregated = allAggregatedKPIs;

    // Filter by team if Employee belongs to a team or we are just summarizing
    let highestEff = {
      name: 'N/A',
      val: 0
    };
    let mostCalls = {
      name: 'N/A',
      val: 0
    };
    let highestOcc = 0;
    let lowestEff = 100;
    let efficiencySum = 0;
    allAggregated.forEach(kpi => {
      efficiencySum += kpi.efficiency;
      if (kpi.efficiency > highestEff.val) {
        highestEff = {
          name: kpi.employeeName,
          val: kpi.efficiency
        };
      }
      if (kpi.handledCalls > mostCalls.val) {
        mostCalls = {
          name: kpi.employeeName,
          val: kpi.handledCalls
        };
      }
      if (kpi.phoneOccupancy > highestOcc) {
        highestOcc = kpi.phoneOccupancy;
      }
      if (kpi.efficiency < lowestEff) {
        lowestEff = kpi.efficiency;
      }
    });
    return {
      highestEffName: highestEff.name,
      highestEffVal: highestEff.val,
      mostCallsName: mostCalls.name,
      mostCallsVal: mostCalls.val,
      highestOccupancy: highestOcc,
      lowestEfficiency: lowestEff === 100 ? 0 : lowestEff,
      teamAverage: Math.round(efficiencySum / allAggregated.length)
    };
  }, [allAggregatedKPIs]);

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
        detail: 'Refreshing US Visa employees from Kronos...',
      })
    );

    try {
      await loadKronosEmployees({ background: true, force: true });
      await new Promise((resolve) => setTimeout(resolve, 300));

      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: 'US Visa employee list and KPI aggregates updated successfully.',
        })
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent('show-toast', {
          detail: 'Unable to refresh US Visa employees from Kronos.',
        })
      );
    } finally {
      setIsRefreshing(false);
      setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent('show-toast', { detail: null })
          ),
        3500
      );
    }
  };
  const handleExport = async (format) => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: `Preparing US Visa KPI report in ${format} format...` }));
    
    // Simulate non-blocking async work
    await new Promise(r => setTimeout(r, 1000));
    await new Promise(r => requestAnimationFrame(r));

    // Mock File Download trigger
    const element = document.createElement("a");
    const file = new Blob([`US Visa KPI Report\nDate: ${selectedDate}\nPeriod: ${HOURS.find(h => h.value === fromHour)?.label || ''} to ${HOURS.find(h => h.value === toHour)?.label || ''}\nTarget Employee: ${selectedEmployeeName}\n\nMetrics:\nActual Logged Time: ${summaryMetrics.loggedFormatted} (Achievement: ${summaryMetrics.loggedAchievement}%)\nHandled Calls: ${summaryMetrics.handledCalls}\nAverage Talk Time: $<AnimatedNumber value={summaryMetrics.avgTalkTime} />s\nAverage Hold Time: $<AnimatedNumber value={summaryMetrics.avgHoldTime} />s\nPhone Occupancy: $<AnimatedNumber value={summaryMetrics.phoneOccupancy} />%\nActual Efficiency: $<AnimatedNumber value={summaryMetrics.actualEfficiency} />%`], {
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

      {/* Dashboard Filters Group */}
      <div className="relative z-[100] mb-6 w-full overflow-visible rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(280px,1.35fr)_minmax(210px,0.8fr)_minmax(330px,1fr)] md:items-end">
          <div className="relative z-[80] min-w-0 overflow-visible">
            {isKronosEmployeesLoading ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>

                <div className={`flex h-11 items-center gap-2 ${FILTER_EDGE} border border-[#D0D5DD] bg-gray-50 px-4 text-sm font-semibold text-[#667085]`}>
                  <RefreshCw className="h-4 w-4 animate-spin text-sibs-primary-1" />
                  <span className="truncate">Loading US Visa employees...</span>
                </div>
              </>
            ) : kronosEmployeesError ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>

                <button
                  type="button"
                  onClick={() =>
                    loadKronosEmployees({ force: true }).catch(() => {})
                  }
                  className={`flex h-11 w-full items-center gap-2 ${FILTER_EDGE} border border-rose-200 bg-rose-50 px-4 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-100`}
                  title={kronosEmployeesError}
                >
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    Failed to load employees. Click to retry.
                  </span>
                </button>
              </>
            ) : userRole === 'Employee' ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>

                <div className={`flex h-11 items-center gap-2 ${FILTER_EDGE} border border-[#D0D5DD] bg-gray-50 px-4 text-sm font-bold text-[#344054]`}>
                  <User className="h-4 w-4 text-[#667085]" />
                  <span className="truncate">{selectedEmployeeName}</span>
                </div>
              </>
            ) : activeEmployees.length === 0 ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>

                <div className={`flex h-11 items-center gap-2 ${FILTER_EDGE} border border-[#D0D5DD] bg-gray-50 px-4 text-sm font-semibold text-[#667085]`}>
                  <User className="h-4 w-4" />
                  <span className="truncate">
                    No active US Visa employees found
                  </span>
                </div>
              </>
            ) : (
              <DashboardEmployeeDropdown
                employees={activeEmployees}
                selectedIds={selectedEmpIds}
                onChange={(newIds) => {
                  startTransition(() => setSelectedEmpIds(newIds));
                }}
              />
            )}
          </div>

          <div className="relative z-[70] min-w-0 overflow-visible">
            <DashboardDatePicker
              value={selectedDate}
              onChange={(nextDate) =>
                startTransition(() => setSelectedDate(nextDate))
              }
            />
          </div>

          <div className="relative z-[60] min-w-0 overflow-visible">
            <label className="mb-1 block text-sm font-bold text-[#101828]">
              Time Range
            </label>

            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <DashboardTimeDropdown
                value={fromHour}
                options={HOURS.filter((hour) => hour.value < toHour)}
                onChange={(nextHour) => {
                  if (nextHour < toHour) {
                    startTransition(() => setFromHour(nextHour));
                  }
                }}
                placeholder="Search start time..."
              />

              <span className="text-sm font-bold text-[#98A2B3]">to</span>

              <DashboardTimeDropdown
                value={toHour}
                options={HOURS.filter((hour) => hour.value > fromHour)}
                onChange={(nextHour) => {
                  if (nextHour > fromHour) {
                    startTransition(() => setToHour(nextHour));
                  }
                }}
                placeholder="Search end time..."
              />
            </div>
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
                {renderTrend(summaryMetrics.trends?.loggedTime ?? 0)}
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
              {renderTrend(summaryMetrics.trends?.handledCalls ?? 0)}
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
              {renderTrend(summaryMetrics.trends?.avgTalkTime ?? 0, true)}
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
              {renderTrend(summaryMetrics.trends?.avgHoldTime ?? 0, true)}
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
              {renderTrend(summaryMetrics.trends?.phoneOccupancy ?? 0)}
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
              {renderTrend(summaryMetrics.trends?.emailCapacity ?? 0)}
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
              {renderTrend(summaryMetrics.trends?.emailUtilization ?? 0)}
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
              {renderTrend(summaryMetrics.trends?.efficiency ?? 0)}
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