import { useRoster } from "../../../services/context/RosterContext.jsx";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "../../../components/ui/button.jsx";

import { X, Search, ChevronDown, ChevronUp, SlidersHorizontal, Download, FileSpreadsheet, FileText, Printer, Calendar, CalendarDays, ChevronLeft, ChevronRight, Check, RefreshCw, User } from 'lucide-react';
import MobilePerformanceCard from "./MobilePerformanceCard.jsx";
import { PerformanceStatsBar } from "./PerformanceStatsBar.jsx";
import LazyChartMount from "../../../components/ui/LazyChartMount.jsx";
import { aggregateKPIRecords, generateHourlyRecord } from '../../../lib/utils/mockData.js';
import { useDebounce } from "../../../hooks/useDebounce.js";
import { apiGet } from "../../../lib/axios/api.js";
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

export default function PerformancePage() {
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
    () => initialKronosCacheRef.current.employees,
  );
  const [isKronosEmployeesLoading, setIsKronosEmployeesLoading] = useState(
    () => initialKronosCacheRef.current.employees.length === 0,
  );
  const [kronosEmployeesError, setKronosEmployeesError] = useState('');

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
          '[US VISA PERFORMANCE] Unable to load Kronos employees:',
          error,
        );

        if (kronosRequestSequence.current === requestSequence) {
          if (cachedResult.employees.length === 0) {
            setEmployees([]);
          }

          setKronosEmployeesError(
            error?.response?.data?.message ||
              error?.message ||
              'Unable to load US Visa employees from Kronos.',
          );
        }

        throw error;
      } finally {
        if (kronosRequestSequence.current === requestSequence) {
          setIsKronosEmployeesLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const cachedResult = readKronosEmployeeCache();

    loadKronosEmployees({
      background: cachedResult.employees.length > 0,
      force: false,
    }).catch(() => {});
  }, [loadKronosEmployees]);

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
      return employees.find((e) => normalizeComparableText(e.email) === normalizeComparableText(currentUserEmail)) || null;
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
      <div className="relative z-[100] w-full overflow-visible rounded-xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
        <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1.1fr)_minmax(300px,1.25fr)_minmax(220px,0.8fr)_minmax(340px,1fr)_minmax(190px,0.7fr)] lg:items-end">
          <div className="min-w-0">
            <label className="mb-1 block text-sm font-bold text-[#101828]">
              Search
            </label>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085]" />

              <input
                type="text"
                placeholder="Search name, position, team..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className={`h-11 w-full ${FILTER_EDGE} border border-[#D0D5DD] bg-white pl-11 pr-4 text-sm font-bold text-[#344054] outline-none transition placeholder:font-semibold placeholder:text-[#98A2B3] hover:border-[#0D4676]/30 hover:bg-[#F8FAFC] focus:border-[#0D4676] focus:ring-4 focus:ring-[#0D4676]/10`}
              />
            </div>
          </div>

          <div className="relative z-[80] min-w-0 overflow-visible">
            {isKronosEmployeesLoading ? (
              <>
                <label className="mb-1 block text-sm font-bold text-[#101828]">
                  Employee
                </label>

                <div className={`flex h-11 items-center gap-2 ${FILTER_EDGE} border border-[#D0D5DD] bg-gray-50 px-4 text-sm font-semibold text-[#667085]`}>
                  <RefreshCw className="h-4 w-4 animate-spin text-[#0D4676]" />
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
                selectedIds={selectedEmpFilters}
                onChange={(newIds) => {
                  startTransition(() => setSelectedEmpFilters(newIds));
                  setCurrentPage(1);
                }}
              />
            )}
          </div>

          <div className="relative z-[70] min-w-0 overflow-visible">
            <DashboardDatePicker
              value={selectedDate}
              onChange={(nextDate) => {
                startTransition(() => setSelectedDate(nextDate));
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
                options={HOURS.filter((hour) => hour.value < toHour)}
                onChange={(value) => {
                  startTransition(() => setFromHour(value));
                  setCurrentPage(1);
                }}
                placeholder="From time..."
              />

              <span className="text-sm font-bold text-[#98A2B3]">to</span>

              <DashboardTimeDropdown
                value={toHour}
                options={HOURS.filter((hour) => hour.value > fromHour)}
                onChange={(value) => {
                  startTransition(() => setToHour(value));
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
              <button
                type="button"
                onClick={() => {
                  startTransition(() => setIntervalType('Daily'));
                  setCurrentPage(1);
                }}
                className={`flex flex-1 items-center justify-center rounded-md px-3 text-sm font-bold transition ${
                  intervalType === 'Daily'
                    ? 'bg-[#0D4676] text-white shadow-sm'
                    : 'text-[#667085] hover:bg-[#F2F6FA] hover:text-[#0D4676]'
                }`}
              >
                Daily
              </button>

              <button
                type="button"
                onClick={() => {
                  startTransition(() => setIntervalType('Hourly'));
                  setCurrentPage(1);
                }}
                className={`flex flex-1 items-center justify-center rounded-md px-3 text-sm font-bold transition ${
                  intervalType === 'Hourly'
                    ? 'bg-[#0D4676] text-white shadow-sm'
                    : 'text-[#667085] hover:bg-[#F2F6FA] hover:text-[#0D4676]'
                }`}
              >
                Hourly
              </button>
            </div>
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
