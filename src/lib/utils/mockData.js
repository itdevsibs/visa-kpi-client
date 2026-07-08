export const INITIAL_EMPLOYEES = [
  {
    id: "EMP-001",
    kronos_id: "K-1001",
    employee_name: "Jane Smith",
    email: "jane.smith@usvisa-kpi.com",
    department: "Customer Service",
    team: "Team Alpha",
    role: "CSR",
    employment_status: "Active",
    status: "Active",
    assigned_sub_account: "H-1B (Specialty Occupation)",
    sub_account_assigned_at: new Date().toISOString()
  },
  {
    id: "EMP-002",
    kronos_id: "K-1002",
    employee_name: "John Doe",
    email: "john.doe@usvisa-kpi.com",
    department: "Customer Service",
    team: "Team Beta",
    role: "CSR",
    employment_status: "Active",
    status: "Active",
    assigned_sub_account: "B1/B2 (Visitor)",
    sub_account_assigned_at: new Date().toISOString()
  },
  {
    id: "EMP-003",
    kronos_id: "K-1003",
    employee_name: "Alice Johnson",
    email: "alice.johnson@usvisa-kpi.com",
    department: "Customer Service",
    team: "Team Alpha",
    role: "CSR",
    employment_status: "Active",
    status: "Active",
    assigned_sub_account: "F-1 (Student)",
    sub_account_assigned_at: new Date().toISOString()
  },
  {
    id: "EMP-004",
    kronos_id: "K-1004",
    employee_name: "Bob Williams",
    email: "bob.williams@usvisa-kpi.com",
    department: "Technical Support",
    team: "Team Beta",
    role: "CSR",
    employment_status: "Active",
    status: "Active",
    assigned_sub_account: "L-1 (Intracompany Transferee)",
    sub_account_assigned_at: new Date().toISOString()
  }
];

export const INITIAL_SYNC_LOGS = [
  {
    id: "SYNC-001",
    date: new Date().toISOString().split('T')[0],
    time: "08:00 AM",
    performedBy: "System Auto-Sync",
    result: "Success",
    details: "Initial sync completed successfully from Kronos HRIS.",
    summary: {
      retrieved: 4,
      added: 4,
      updated: 0,
      markedInactive: 0
    }
  }
];

// Helper to pseudo-randomly generate a seeded number
const seededRandom = (seed) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const generateHourlyRecord = (employeeId, dateStr, hour) => {
  const seed = parseInt(employeeId.replace(/\D/g, "")) + parseInt(dateStr.replace(/\D/g, "")) + hour;
  const rand = seededRandom(seed);
  
  const expectedSeconds = 3600; // 1 hour
  const loggedSeconds = Math.floor(expectedSeconds * (0.8 + rand * 0.2)); // 80-100% of hour
  
  const handledCalls = Math.floor(4 + rand * 4); // 4-8 calls per hour
  const totalTalkSeconds = handledCalls * Math.floor(150 + rand * 60); // 150-210s per call
  const totalHoldSeconds = handledCalls * Math.floor(10 + rand * 30); // 10-40s per call
  
  const actualEmails = Math.floor(2 + rand * 5);
  const targetEmails = 10;
  const availableEmailCapacity = 10;
  
  const occupiedSeconds = totalTalkSeconds + totalHoldSeconds;
  const efficiency = Math.min(100, Math.floor(70 + rand * 30));

  return {
    employeeId,
    date: dateStr,
    hour,
    expectedSeconds,
    loggedSeconds,
    handledCalls,
    totalTalkSeconds,
    totalHoldSeconds,
    actualEmails,
    targetEmails,
    availableEmailCapacity,
    occupiedSeconds,
    efficiency
  };
};

export const aggregateKPIRecords = (employees, dateStr, fromHour, toHour) => {
  return employees.map(emp => {
    let expectedSeconds = 0;
    let loggedSeconds = 0;
    let handledCalls = 0;
    let totalTalkSeconds = 0;
    let totalHoldSeconds = 0;
    let actualEmails = 0;
    let targetEmails = 0;
    let availableEmailCapacity = 0;
    let occupiedSeconds = 0;
    let efficiencySum = 0;
    let workingHoursCount = 0;

    for (let h = fromHour; h <= toHour; h++) {
      const hr = generateHourlyRecord(emp.id, dateStr, h);
      expectedSeconds += hr.expectedSeconds;
      loggedSeconds += hr.loggedSeconds;
      handledCalls += hr.handledCalls;
      totalTalkSeconds += hr.totalTalkSeconds;
      totalHoldSeconds += hr.totalHoldSeconds;
      actualEmails += hr.actualEmails;
      targetEmails += hr.targetEmails;
      availableEmailCapacity += hr.availableEmailCapacity;
      occupiedSeconds += hr.occupiedSeconds;
      
      if (hr.expectedSeconds > 0) {
        efficiencySum += hr.efficiency;
        workingHoursCount++;
      }
    }

    const avgTalkTime = handledCalls > 0 ? Math.round(totalTalkSeconds / handledCalls) : 0;
    const avgHoldTime = handledCalls > 0 ? Math.round(totalHoldSeconds / handledCalls) : 0;
    const phoneOccupancy = loggedSeconds > 0 ? Math.round((occupiedSeconds / loggedSeconds) * 100) : 0;
    const efficiency = workingHoursCount > 0 ? Math.round(efficiencySum / workingHoursCount) : 0;

    return {
      employeeId: emp.id,
      employeeName: emp.employee_name,
      expectedSeconds,
      loggedSeconds,
      handledCalls,
      avgTalkTime,
      avgHoldTime,
      actualEmails,
      targetEmails,
      availableEmailCapacity,
      phoneOccupancy,
      efficiency
    };
  });
};
