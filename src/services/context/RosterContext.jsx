import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { INITIAL_EMPLOYEES, INITIAL_SYNC_LOGS } from "../../lib/utils/mockData";

const RosterContext = createContext(undefined);

const EMPLOYEES_STORAGE_KEY = "us_visa_kpi_employees";
const SYNC_LOGS_STORAGE_KEY = "us_visa_kpi_sync_logs";
const KPI_RECORDS_STORAGE_KEY = "us_visa_kpi_records";

const safelyReadLocalStorage = (key, fallbackValue) => {
  try {
    const saved = localStorage.getItem(key);

    if (!saved) return fallbackValue;

    return JSON.parse(saved);
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage`, error);
    return fallbackValue;
  }
};

const safelyWriteLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${key} to localStorage`, error);
  }
};

export const RosterProvider = ({ children }) => {
  const [employees, setEmployees] = useState(() =>
    safelyReadLocalStorage(EMPLOYEES_STORAGE_KEY, INITIAL_EMPLOYEES)
  );

  const [syncLogs, setSyncLogs] = useState(() =>
    safelyReadLocalStorage(SYNC_LOGS_STORAGE_KEY, INITIAL_SYNC_LOGS)
  );

  const [kpiRecords, setKpiRecords] = useState(() =>
    safelyReadLocalStorage(KPI_RECORDS_STORAGE_KEY, [])
  );

  const [userRole, setUserRole] = useState("Administrator");
  const [selectedSimUserEmail, setSelectedSimUserEmail] = useState(
    "jane.smith@usvisa-kpi.com"
  );
  const [selectedSimTeam, setSelectedSimTeam] = useState("Team Alpha");
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    safelyWriteLocalStorage(EMPLOYEES_STORAGE_KEY, employees);
  }, [employees]);

  useEffect(() => {
    safelyWriteLocalStorage(SYNC_LOGS_STORAGE_KEY, syncLogs);
  }, [syncLogs]);

  useEffect(() => {
    safelyWriteLocalStorage(KPI_RECORDS_STORAGE_KEY, kpiRecords);
  }, [kpiRecords]);

  const activeEmployeeUsers = useMemo(() => {
    return (employees || []).filter(
      (employee) =>
        employee.status === "Active" && employee.employment_status === "Active"
    );
  }, [employees]);

  const filteredEmployeesForPerformanceAndDashboard = useMemo(() => {
    if (userRole === "Employee") {
      return (employees || []).map((employee) => {
        if (
          String(employee.email || "").toLowerCase() ===
          selectedSimUserEmail.toLowerCase()
        ) {
          return { ...employee, status: "Active" };
        }

        return { ...employee, status: "Inactive" };
      });
    }

    if (userRole === "Team Leader") {
      return (employees || []).map((employee) => {
        if (employee.team === selectedSimTeam) {
          return employee;
        }

        return { ...employee, status: "Inactive" };
      });
    }

    return employees || [];
  }, [employees, userRole, selectedSimUserEmail, selectedSimTeam]);

  const value = useMemo(
    () => ({
      employees,
      setEmployees,
      syncLogs,
      setSyncLogs,
      kpiRecords,
      setKpiRecords,
      userRole,
      setUserRole,
      selectedSimUserEmail,
      setSelectedSimUserEmail,
      selectedSimTeam,
      setSelectedSimTeam,
      notification,
      setNotification,
      activeEmployeeUsers,
      filteredEmployeesForPerformanceAndDashboard,
    }),
    [
      employees,
      syncLogs,
      kpiRecords,
      userRole,
      selectedSimUserEmail,
      selectedSimTeam,
      notification,
      activeEmployeeUsers,
      filteredEmployeesForPerformanceAndDashboard,
    ]
  );

  return (
    <RosterContext.Provider value={value}>{children}</RosterContext.Provider>
  );
};

export const useRoster = () => {
  const context = useContext(RosterContext);

  if (context === undefined) {
    throw new Error("useRoster must be used within a RosterProvider");
  }

  return context;
};
