import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { INITIAL_EMPLOYEES, INITIAL_SYNC_LOGS } from "../../lib/utils/mockData";

const RosterContext = createContext();

export const RosterProvider = ({ children }) => {
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('us_visa_kpi_employees');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_EMPLOYEES;
  });

  const [syncLogs, setSyncLogs] = useState(() => {
    const saved = localStorage.getItem('us_visa_kpi_sync_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return INITIAL_SYNC_LOGS;
  });

  useEffect(() => {
    localStorage.setItem('us_visa_kpi_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('us_visa_kpi_sync_logs', JSON.stringify(syncLogs));
  }, [syncLogs]);

  const [userRole, setUserRole] = useState("Administrator");
  const [selectedSimUserEmail, setSelectedSimUserEmail] = useState("jane.smith@usvisa-kpi.com");
  const [selectedSimTeam, setSelectedSimTeam] = useState("Team Alpha");
  const [notification, setNotification] = useState(null);

  const activeEmployeeUsers = useMemo(() => {
    return employees.filter(e => e.status === 'Active' && e.employment_status === 'Active');
  }, [employees]);

  const filteredEmployeesForPerformanceAndDashboard = useMemo(() => {
    if (userRole === 'Employee') {
      return employees.map(emp => {
        if (emp.email.toLowerCase() === selectedSimUserEmail.toLowerCase()) {
          return { ...emp, status: 'Active' };
        }
        return { ...emp, status: 'Inactive' };
      });
    }

    if (userRole === 'Team Leader') {
      return employees.map(emp => {
        if (emp.team === selectedSimTeam) {
          return emp;
        }
        return { ...emp, status: 'Inactive' };
      });
    }

    return employees;
  }, [employees, userRole, selectedSimUserEmail, selectedSimTeam]);

  return (
    <RosterContext.Provider
      value={{
        employees,
        setEmployees,
        syncLogs,
        setSyncLogs,
        userRole,
        setUserRole,
        selectedSimUserEmail,
        setSelectedSimUserEmail,
        selectedSimTeam,
        setSelectedSimTeam,
        notification,
        setNotification,
        activeEmployeeUsers,
        filteredEmployeesForPerformanceAndDashboard
      }}
    >
      {children}
    </RosterContext.Provider>
  );
};

export const useRoster = () => {
  const context = useContext(RosterContext);
  if (context === undefined) {
    throw new Error("useRoster must be used within a RosterProvider");
  }
  return context;
};
