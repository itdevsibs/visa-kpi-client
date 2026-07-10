import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  LoaderCircle,
  MoveHorizontal,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import { apiGet } from "../../lib/axios/api.js";
import { useDebounce } from "../../hooks/useDebounce.js";

/* =========================================
   TABLE COLUMNS
========================================= */

const KRONOS_COLUMNS = [
  {
    key: "sibsId",
    label: "SIBS ID",
    minWidth: 110,
  },
  {
    key: "fullName",
    label: "Employee Name",
    minWidth: 220,
  },
  {
    key: "email",
    label: "Email",
    minWidth: 240,
  },
  {
    key: "contactNumber",
    label: "Contact Number",
    minWidth: 150,
  },
  {
    key: "gender",
    label: "Gender",
    minWidth: 100,
  },
  {
    key: "birthdate",
    label: "Birthdate",
    minWidth: 130,
    type: "date",
  },
  {
    key: "civilStatus",
    label: "Civil Status",
    minWidth: 130,
  },
  {
    key: "hireDate",
    label: "Hire Date",
    minWidth: 130,
    type: "date",
  },
  {
    key: "nhodate",
    label: "NHO Date",
    minWidth: 130,
    type: "date",
  },
  {
    key: "account",
    label: "Account",
    minWidth: 180,
  },
  {
    key: "department",
    label: "Department",
    minWidth: 180,
  },
  {
    key: "site",
    label: "Site",
    minWidth: 140,
  },
  {
    key: "assignedLoc",
    label: "Assigned Location",
    minWidth: 170,
  },
  {
    key: "status",
    label: "Status",
    minWidth: 120,
    type: "status",
  },
  {
    key: "accountManager",
    label: "Account Manager",
    minWidth: 190,
  },
  {
    key: "supervisor",
    label: "Supervisor",
    minWidth: 190,
  },
];

/* =========================================
   HELPERS
========================================= */

function cleanValue(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "—";
    }
  }

  return String(value);
}

function formatDate(value) {
  if (!value || value === "0000-00-00") {
    return "—";
  }

  const rawValue = String(value).trim();
  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) {
    return rawValue;
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function getOptionValue(option) {
  if (typeof option === "string") {
    return option;
  }

  return (
    option?.value ||
    option?.id ||
    option?.name ||
    option?.label ||
    ""
  );
}

function getOptionLabel(option) {
  if (typeof option === "string") {
    return option;
  }

  return (
    option?.label ||
    option?.name ||
    option?.value ||
    option?.id ||
    ""
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to retrieve Kronos employees."
  );
}

function StatusBadge({ value }) {
  const status = String(value || "").trim();
  const normalizedStatus = status.toLowerCase();

  let className =
    "border-slate-200 bg-slate-50 text-slate-600";

  if (
    normalizedStatus === "active" ||
    normalizedStatus === "regular"
  ) {
    className =
      "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (
    normalizedStatus === "inactive" ||
    normalizedStatus === "resigned" ||
    normalizedStatus === "terminated"
  ) {
    className =
      "border-rose-200 bg-rose-50 text-rose-700";
  } else if (
    normalizedStatus === "probationary" ||
    normalizedStatus === "pending"
  ) {
    className =
      "border-amber-200 bg-amber-50 text-amber-700";
  }

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status || "—"}
    </span>
  );
}

/* =========================================
   PAGE
========================================= */

export default function KronosEmployeesPage() {
  const tableScrollRef = useRef(null);

  const tableDragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });

  const [employees, setEmployees] = useState([]);

  const [
    departmentOptions,
    setDepartmentOptions,
  ] = useState([]);

  const [
    accountOptions,
    setAccountOptions,
  ] = useState([]);

  const [searchInput, setSearchInput] =
    useState("");

  const [
    selectedDepartment,
    setSelectedDepartment,
  ] = useState("All");

  const [
    selectedAccount,
    setSelectedAccount,
  ] = useState("All");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [pageLimit, setPageLimit] =
    useState(10);

  const [pagination, setPagination] =
    useState({
      currentPage: 1,
      totalPages: 1,
      total: 0,
      limit: 10,
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    isTableDragging,
    setIsTableDragging,
  ] = useState(false);

  const debouncedSearch = useDebounce(
    searchInput,
    400
  );

  /* =========================================
     LOAD EMPLOYEES
  ========================================= */

  const loadEmployees = useCallback(
    async ({ manualRefresh = false } = {}) => {
      try {
        setError("");

        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await apiGet(
          "/users/kronos-employees",
          {
            params: {
              page: currentPage,
              limit: pageLimit,
              search: debouncedSearch,
              department: selectedDepartment,
              account: selectedAccount,
              includeDepartments: 1,
              includeAccounts: 1,
            },
          }
        );

        const employeeRows = Array.isArray(
          response?.data
        )
          ? response.data
          : [];

        setEmployees(employeeRows);

        setDepartmentOptions(
          Array.isArray(
            response?.departmentOptions
          )
            ? response.departmentOptions
            : []
        );

        setAccountOptions(
          Array.isArray(
            response?.accountOptions
          )
            ? response.accountOptions
            : []
        );

        setPagination({
          currentPage:
            Number(
              response?.pagination?.currentPage
            ) || 1,

          totalPages:
            Number(
              response?.pagination?.totalPages
            ) || 1,

          total:
            Number(
              response?.pagination?.total
            ) || 0,

          limit:
            Number(
              response?.pagination?.limit
            ) || pageLimit,
        });
      } catch (requestError) {
        console.error(
          "[KRONOS EMPLOYEES PAGE]",
          requestError
        );

        setEmployees([]);
        setError(
          getErrorMessage(requestError)
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      currentPage,
      pageLimit,
      debouncedSearch,
      selectedDepartment,
      selectedAccount,
    ]
  );

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  /* =========================================
     DISPLAY RANGE
  ========================================= */

  const displayRange = useMemo(() => {
    if (pagination.total === 0) {
      return {
        start: 0,
        end: 0,
      };
    }

    const start =
      (pagination.currentPage - 1) *
        pagination.limit +
      1;

    const end = Math.min(
      pagination.currentPage *
        pagination.limit,
      pagination.total
    );

    return {
      start,
      end,
    };
  }, [pagination]);

  /* =========================================
     FILTER HANDLERS
  ========================================= */

  function handleSearchChange(event) {
    setSearchInput(event.target.value);
    setCurrentPage(1);
  }

  function handleDepartmentChange(event) {
    setSelectedDepartment(
      event.target.value
    );

    setSelectedAccount("All");
    setCurrentPage(1);
  }

  function handleAccountChange(event) {
    setSelectedAccount(
      event.target.value
    );

    setCurrentPage(1);
  }

  function handleLimitChange(event) {
    setPageLimit(
      Number(event.target.value)
    );

    setCurrentPage(1);
  }

  function handlePreviousPage() {
    setCurrentPage((previousPage) =>
      Math.max(previousPage - 1, 1)
    );
  }

  function handleNextPage() {
    setCurrentPage((previousPage) =>
      Math.min(
        previousPage + 1,
        pagination.totalPages
      )
    );
  }

  /* =========================================
     TABLE DRAG SCROLL
  ========================================= */

  function handleTablePointerDown(event) {
    const container =
      tableScrollRef.current;

    if (!container) {
      return;
    }

    if (
      event.pointerType !== "mouse" ||
      event.button !== 0
    ) {
      return;
    }

    const interactiveElement =
      event.target.closest(
        "button, a, input, select, textarea"
      );

    if (interactiveElement) {
      return;
    }

    tableDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft:
        container.scrollLeft,
    };

    container.setPointerCapture?.(
      event.pointerId
    );

    setIsTableDragging(true);
    event.preventDefault();
  }

  function handleTablePointerMove(event) {
    const container =
      tableScrollRef.current;

    const dragState =
      tableDragRef.current;

    if (
      !container ||
      !dragState.active ||
      dragState.pointerId !==
        event.pointerId
    ) {
      return;
    }

    if ((event.buttons & 1) !== 1) {
      stopTableDragging(event);
      return;
    }

    const movement =
      event.clientX -
      dragState.startX;

    container.scrollLeft =
      dragState.startScrollLeft -
      movement;

    event.preventDefault();
  }

  function stopTableDragging(event) {
    const container =
      tableScrollRef.current;

    const pointerId =
      event?.pointerId ??
      tableDragRef.current.pointerId;

    if (
      container &&
      pointerId !== null &&
      container.hasPointerCapture?.(
        pointerId
      )
    ) {
      container.releasePointerCapture(
        pointerId
      );
    }

    tableDragRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
    };

    setIsTableDragging(false);
  }

  /* =========================================
     TABLE CELL
  ========================================= */

  function renderCell(employee, column) {
    const value =
      employee?.[column.key];

    if (column.type === "date") {
      return formatDate(value);
    }

    if (column.type === "status") {
      return (
        <StatusBadge value={value} />
      );
    }

    if (column.key === "fullName") {
      return (
        <div>
          <p className="font-semibold text-slate-900">
            {cleanValue(value)}
          </p>

          <p className="mt-0.5 text-xs text-slate-400">
            {cleanValue(
              employee?.sibsId
            )}
          </p>
        </div>
      );
    }

    return cleanValue(value);
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Database className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Kronos Employees
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Employee records retrieved
              from the Kronos employee list
              API.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadEmployees({
              manualRefresh: true,
            })
          }
          disabled={refreshing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh Data"}
        </button>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Total Employees
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-900">
                {pagination.total.toLocaleString()}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Current Page
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {pagination.currentPage}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            of{" "}
            {pagination.totalPages}{" "}
            pages
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Department
          </p>

          <p className="mt-2 truncate text-lg font-bold text-slate-900">
            {selectedDepartment === "All"
              ? "All Departments"
              : selectedDepartment}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Account
          </p>

          <p className="mt-2 truncate text-lg font-bold text-slate-900">
            {selectedAccount === "All"
              ? "All Accounts"
              : selectedAccount}
          </p>
        </div>
      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1fr)_220px_220px_120px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={searchInput}
              onChange={
                handleSearchChange
              }
              placeholder="Search SIBS ID, name, email, account..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <select
            value={
              selectedDepartment
            }
            onChange={
              handleDepartmentChange
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="All">
              All Departments
            </option>

            {departmentOptions.map(
              (option, index) => {
                const value =
                  getOptionValue(option);

                const label =
                  getOptionLabel(option);

                if (!value || !label) {
                  return null;
                }

                return (
                  <option
                    key={`${value}-${index}`}
                    value={value}
                  >
                    {label}
                  </option>
                );
              }
            )}
          </select>

          <select
            value={selectedAccount}
            onChange={
              handleAccountChange
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value="All">
              All Accounts
            </option>

            {accountOptions.map(
              (option, index) => {
                const value =
                  getOptionValue(option);

                const label =
                  getOptionLabel(option);

                if (!value || !label) {
                  return null;
                }

                return (
                  <option
                    key={`${value}-${index}`}
                    value={value}
                  >
                    {label}
                  </option>
                );
              }
            )}
          </select>

          <select
            value={pageLimit}
            onChange={
              handleLimitChange
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
          >
            <option value={5}>
              5 rows
            </option>

            <option value={10}>
              10 rows
            </option>

            <option value={25}>
              25 rows
            </option>

            <option value={50}>
              50 rows
            </option>
          </select>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              Unable to load Kronos
              employees
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">
              Employee Records
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Showing{" "}
              {displayRange.start} to{" "}
              {displayRange.end} of{" "}
              {pagination.total.toLocaleString()}{" "}
              records
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 sm:self-auto">
            <MoveHorizontal className="h-4 w-4" />
            Drag table left or right
          </div>
        </div>

        {/* TABLE VIEWPORT */}

        <div className="relative">
          {/* CENTERED LOADING OVERLAY */}

          {loading && (
            <div className="pointer-events-none absolute inset-x-0 top-[41px] z-20 flex h-[260px] items-center justify-center bg-white/95">
              <div className="flex flex-col items-center justify-center gap-3 text-center text-slate-500">
                <LoaderCircle className="h-7 w-7 animate-spin text-blue-600" />

                <p className="text-sm font-medium">
                  Loading Kronos
                  employees...
                </p>
              </div>
            </div>
          )}

          {/* CENTERED EMPTY STATE */}

          {!loading &&
            employees.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-[41px] z-20 flex h-[260px] items-center justify-center bg-white">
                <div className="flex flex-col items-center justify-center px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <Users className="h-6 w-6" />
                  </div>

                  <p className="mt-4 font-semibold text-slate-700">
                    No employees found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your
                    search or filters.
                  </p>
                </div>
              </div>
            )}

          <div
            ref={tableScrollRef}
            onPointerDown={
              handleTablePointerDown
            }
            onPointerMove={
              handleTablePointerMove
            }
            onPointerUp={
              stopTableDragging
            }
            onPointerCancel={
              stopTableDragging
            }
            onLostPointerCapture={
              stopTableDragging
            }
            onDragStart={(event) =>
              event.preventDefault()
            }
            className={`overflow-x-auto overscroll-x-contain ${
              isTableDragging
                ? "cursor-grabbing select-none"
                : "cursor-grab"
            }`}
          >
            <table className="w-full min-w-max border-collapse text-left">
              <thead className="bg-slate-50">
                <tr>
                  {KRONOS_COLUMNS.map(
                    (column) => (
                      <th
                        key={column.key}
                        style={{
                          minWidth:
                            column.minWidth,
                        }}
                        className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500"
                      >
                        {column.label}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ||
                employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        KRONOS_COLUMNS.length
                      }
                      className="h-[260px] p-0"
                    />
                  </tr>
                ) : (
                  employees.map(
                    (
                      employee,
                      rowIndex
                    ) => {
                      const rowKey =
                        employee?.sibsId ||
                        employee?.id ||
                        employee?._rowNumber ||
                        rowIndex;

                      return (
                        <tr
                          key={rowKey}
                          className="transition hover:bg-blue-50/40"
                        >
                          {KRONOS_COLUMNS.map(
                            (column) => (
                              <td
                                key={`${rowKey}-${column.key}`}
                                className="whitespace-nowrap px-4 py-3 text-sm text-slate-600"
                              >
                                {renderCell(
                                  employee,
                                  column
                                )}
                              </td>
                            )
                          )}
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Page{" "}
            <span className="font-semibold text-slate-800">
              {pagination.currentPage}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-800">
              {pagination.totalPages}
            </span>
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                handlePreviousPage
              }
              disabled={
                loading ||
                pagination.currentPage <=
                  1
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />

              Previous
            </button>

            <button
              type="button"
              onClick={
                handleNextPage
              }
              disabled={
                loading ||
                pagination.currentPage >=
                  pagination.totalPages
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next

              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}