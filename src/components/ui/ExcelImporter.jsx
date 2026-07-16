import React, { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Check,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function ExcelImporter({
  employees = [],
  setEmployees,
  userRole,
  embedded = false,
  onUploadComplete,
}) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [importLog, setImportLog] = useState([]);
  const [conflictStrategy, setConflictStrategy] = useState("update");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [fileError, setFileError] = useState("");

  const fileInputRef = useRef(null);
  const hasAdminAccess = userRole === "Administrator";

  const isAllowedRosterFile = (file) => {
    if (!file) return false;

    const name = file.name.toLowerCase();

    return (
      name.endsWith(".xlsx") ||
      name.endsWith(".xls") ||
      name.endsWith(".csv")
    );
  };

  const normalizeHeader = (header) => {
    return String(header || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  };

  const findValue = (row, keys, fallback = "") => {
    const normalizedRow = {};

    Object.keys(row || {}).forEach((key) => {
      normalizedRow[normalizeHeader(key)] = row[key];
    });

    for (const key of keys) {
      const normalizedKey = normalizeHeader(key);

      if (
        normalizedRow[normalizedKey] !== undefined &&
        normalizedRow[normalizedKey] !== null &&
        String(normalizedRow[normalizedKey]).trim() !== ""
      ) {
        return String(normalizedRow[normalizedKey]).trim();
      }
    }

    return fallback;
  };

  const parseWorkbookRows = (jsonRows) => {
    const rowsToValidate = [];

    jsonRows.forEach((row, index) => {
      const raw_id = findValue(row, [
        "employee_id",
        "employee id",
        "employee_number",
        "employee number",
        "id",
        "code",
        "number",
      ]);

      const raw_name = findValue(row, [
        "employee_name",
        "employee name",
        "fullname",
        "full name",
        "name",
      ]);

      const raw_email = findValue(row, [
        "email",
        "email_address",
        "email address",
        "mail",
      ]);

      const raw_position = findValue(
        row,
        ["position", "title", "job_title", "job title", "job"],
        "Adjudication Officer"
      );

      const raw_dept = findValue(
        row,
        ["department", "dept"],
        "Operational Operations"
      );

      const raw_team = findValue(row, ["team", "group"], "Team Alpha");

      const raw_supervisor = findValue(
        row,
        ["supervisor", "manager", "boss", "leader"],
        "Supervisor"
      );

      const raw_status = findValue(
        row,
        ["employment_status", "employment status", "status", "active"],
        "Active"
      );

      const errors = [];

      if (!raw_id) errors.push("Missing Employee ID");
      if (!raw_name) errors.push("Missing Employee Name");

      if (!raw_email) {
        errors.push("Missing email address");
      } else if (!raw_email.includes("@")) {
        errors.push("Invalid email format");
      }

      const matchingEmployee = employees.find((e) => {
        const empId = String(e.employee_id || "").toLowerCase();
        const empEmail = String(e.email || "").toLowerCase();

        return (
          empId === raw_id.toLowerCase() ||
          empEmail === raw_email.toLowerCase()
        );
      });

      let finalStatus = "Active";
      const normStatus = raw_status.toLowerCase();

      if (normStatus.includes("leave") || normStatus.includes("susp")) {
        finalStatus = "On Leave";
      } else if (
        normStatus.includes("inact") ||
        normStatus.includes("term") ||
        normStatus.includes("off")
      ) {
        finalStatus = "Inactive";
      }

      rowsToValidate.push({
        employee_id: raw_id || `EMP_MOCK_${100 + index}`,
        employee_name: raw_name,
        email: raw_email,
        position: raw_position,
        department: raw_dept,
        team: raw_team,
        supervisor: raw_supervisor,
        employment_status: finalStatus,
        isValid: errors.length === 0,
        errors,
        isMatch: !!matchingEmployee,
        matchId: matchingEmployee?.id,
      });
    });

    setParsedRows(rowsToValidate);
    setStep(2);
  };

  const readRosterFile = (file) => {
    setFileError("");

    if (!file) return;

    if (!isAllowedRosterFile(file)) {
      setFileError(
        "Invalid file type. Please upload only .xlsx, .xls, or .csv files."
      );
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result;

        const workbook = XLSX.read(arrayBuffer, {
          type: "array",
        });

        const firstSheetName = workbook.SheetNames[0];

        if (!firstSheetName) {
          setFileError("No worksheet or CSV data found in this file.");
          return;
        }

        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });

        if (!jsonRows.length) {
          setFileError("No employee rows found in this file.");
          return;
        }

        parseWorkbookRows(jsonRows);
      } catch (error) {
        console.error(error);
        setFileError(
          "Unable to read this file. Please upload a valid Excel or CSV file."
        );
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    setDragActive(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      readRosterFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (file) {
      readRosterFile(file);
    }
  };

  const triggerImportProcess = () => {
    if (!hasAdminAccess || isProcessing) return;

    setIsProcessing(true);
    setImportLog([]);

    const logs = [];
    logs.push(
      `[Importer] Starting roster import of ${parsedRows.length} row(s)...`
    );

    setTimeout(() => {
      const updatedEmployees = [...employees];

      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      parsedRows.forEach((row) => {
        if (!row.isValid) {
          logs.push(
            `[Skip] Employee ${
              row.employee_name || "Unknown"
            } skipped due to validation errors.`
          );
          skippedCount++;
          return;
        }

        const matchIndex = updatedEmployees.findIndex((e) => {
          const empId = String(e.employee_id || "").toLowerCase();
          const empEmail = String(e.email || "").toLowerCase();

          return (
            empId === row.employee_id.toLowerCase() ||
            empEmail === row.email.toLowerCase()
          );
        });

        if (matchIndex >= 0) {
          if (conflictStrategy === "update") {
            const current = updatedEmployees[matchIndex];

            updatedEmployees[matchIndex] = {
              ...current,
              employee_name: row.employee_name,
              email: row.email,
              position: row.position,
              department: row.department,
              team: row.team,
              supervisor: row.supervisor,
              employment_status: row.employment_status,
              status:
                row.employment_status === "Active" ? "Active" : "Inactive",
              updated_at: new Date().toISOString(),
            };

            logs.push(
              `[Update] Existing profile synced: ${row.employee_name} (${row.employee_id})`
            );
            updatedCount++;
          } else {
            logs.push(`[Ignore] Existing record retained: ${row.employee_name}`);
            skippedCount++;
          }
        } else {
          const newEmp = {
            id: `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            employee_id: row.employee_id,
            employee_number:
              row.employee_id.replace(/\D/g, "") ||
              String(10000 + updatedEmployees.length),
            employee_name: row.employee_name,
            email: row.email,
            position: row.position,
            department: row.department,
            team: row.team,
            supervisor: row.supervisor,
            employment_status: row.employment_status,
            account_name: "US Visa",
            last_synced_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            assigned_sub_account: null,
            sub_account_assigned_at: null,
            include_dashboard: true,
            include_reports: true,
            kpi_tracking_enabled: true,
            status:
              row.employment_status === "Active" ? "Active" : "Inactive",
          };

          updatedEmployees.push(newEmp);

          logs.push(
            `[Add New] Added new team member: ${row.employee_name} (${row.employee_id})`
          );
          addedCount++;
        }
      });

      logs.push(
        `[Completed] Processed ${parsedRows.length} rows. Added: ${addedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}.`
      );

      setEmployees(updatedEmployees);
      setImportLog(logs);
      setIsProcessing(false);
      setStep(3);

      onUploadComplete?.({
        fileName: fileName || "Roster Upload",
        status: skippedCount > 0 ? "Warning" : "Success",
        records: parsedRows.length,
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount,
      });
    }, 1200);
  };

  const handleDownloadSample = () => {
    const csvContent =
      "employee_id,employee_name,email,position,department,team,supervisor,employment_status\n" +
      "EMP101,John Doe,john.doe@usvisa-kpi.com,Adjudication Officer,US Visa Operations,Team Alpha,Jane Smith,Active\n" +
      "EMP102,Alice Cooper,alice.c@usvisa-kpi.com,Support Specialist,Client Services,Team Beta,Marcus Jenkins,Active\n" +
      "EMP103,Robert Paulson,robert.p@usvisa-kpi.com,Case Processor,Verification Division,Team Alpha,Jane Smith,Inactive";

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "US_Visa_Employee_Roster_Template.csv";

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  };

  const resetImporter = () => {
    setFileName(null);
    setParsedRows([]);
    setImportLog([]);
    setConflictStrategy("update");
    setIsProcessing(false);
    setStep(1);
    setFileError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const content = (
  <div className="flex h-full min-h-0 flex-col">
    {!embedded && (
      <div className="bg-slate-50 border-b border-slate-200/60 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-bold text-slate-800">
            Excel / CSV Employee KPI Roster Uploader
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              step === 1 ? "bg-blue-500" : "bg-slate-300"
            }`}
          />
          <span
            className={`h-2 w-2 rounded-full ${
              step === 2 ? "bg-amber-500" : "bg-slate-300"
            }`}
          />
          <span
            className={`h-2 w-2 rounded-full ${
              step === 3 ? "bg-emerald-500" : "bg-slate-300"
            }`}
          />
        </div>
      </div>
    )}

    <div
  className={`${
    embedded ? "p-0" : "p-5"
  } flex min-h-0 flex-1 flex-col justify-start`}
>
        {step === 1 && (
  <div className="flex min-h-0 flex-1 flex-col">
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload an Excel or CSV roster file to update employee KPI tracking
              profiles. Only <strong>.xlsx</strong>, <strong>.xls</strong>, and{" "}
              <strong>.csv</strong> files are accepted.
            </p>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`interactive-press mt-4 flex min-h-[280px] flex-1 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed px-8 py-7 text-center transition-all ${
  dragActive
    ? "border-blue-500 bg-blue-50/50"
    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

             <div>
  <Upload className="h-9 w-9 text-slate-400 mx-auto mb-2" />

  <p className="text-xs font-bold text-slate-700">
    Drag & drop your Excel or CSV file here
  </p>

  <p className="text-[10px] text-slate-400 mt-1">
    or click to browse your local computer
  </p>

  <p className="text-[10px] text-slate-400 mt-2 font-semibold">
    Accepted formats: .xlsx, .xls, .csv
  </p>
</div>
</div>

            {fileError && (
              <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[11px] font-medium leading-normal">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

           <div className="mt-4 flex items-center justify-between">
  <button
    type="button"
    onClick={handleDownloadSample}
    className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
  >
    Download Sample CSV Template
  </button>
</div>

            {!hasAdminAccess && (
              <div className="flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[11px] font-medium leading-normal mt-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Roster imports are restricted to Administrators.</span>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h4 className="text-xs font-black text-slate-800">
                  Roster Data Preview & Audit
                </h4>

                <p className="text-[10px] text-slate-400 mt-0.5">
                  Parsed <strong>{parsedRows.length}</strong> records from{" "}
                  <strong>{fileName}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={resetImporter}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Clear / Re-upload
              </button>
            </div>

            {parsedRows.some((r) => !r.isValid) && (
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5 leading-normal">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Some rows contain missing details. Invalid rows will be skipped
                  automatically.
                </span>
              </div>
            )}

            <div className="thin-scroll border border-slate-200 rounded-xl overflow-auto max-h-56 bg-slate-50/50">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-500 font-mono sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 border-b border-slate-200">
                      ID
                    </th>
                    <th className="px-3 py-1.5 border-b border-slate-200">
                      Name
                    </th>
                    <th className="px-3 py-1.5 border-b border-slate-200">
                      Email
                    </th>
                    <th className="px-3 py-1.5 border-b border-slate-200">
                      Team / Role
                    </th>
                    <th className="px-3 py-1.5 border-b border-slate-200 text-center">
                      Audit
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {parsedRows.map((row, idx) => (
                    <tr
                      key={`${row.employee_id}-${idx}`}
                      className="hover:bg-slate-50 bg-white"
                    >
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">
                        {row.employee_id}
                      </td>

                      <td className="px-3 py-2 font-semibold text-slate-700">
                        {row.employee_name || (
                          <span className="text-rose-500">Missing</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-slate-500">
                        {row.email || (
                          <span className="text-rose-500">Missing</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-slate-500 leading-snug">
                        <span className="block font-medium text-slate-700">
                          {row.team}
                        </span>
                        <span className="block text-[9px] font-mono">
                          {row.position}
                        </span>
                      </td>

                      <td className="px-3 py-2 text-center">
                        {row.isValid ? (
                          row.isMatch ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              Match
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                              New
                            </span>
                          )
                        ) : (
                          <span
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100"
                            title={row.errors.join(", ")}
                          >
                            Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedRows.some((r) => r.isMatch) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="block text-[10px] font-bold font-mono text-slate-400 uppercase">
                    Match Strategy
                  </span>

                  <span className="block text-xs font-semibold text-slate-700 mt-0.5">
                    Existing IDs / Emails matched in database:
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setConflictStrategy("update")}
                    className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                      conflictStrategy === "update"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    Overwrite/Update
                  </button>

                  <button
                    type="button"
                    onClick={() => setConflictStrategy("skip")}
                    className={`px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${
                      conflictStrategy === "skip"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    Skip Duplicates
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={triggerImportProcess}
              disabled={isProcessing || !hasAdminAccess}
              className={`interactive-press w-full flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border border-emerald-200 shadow-xs transition-all ${
                isProcessing
                  ? "bg-emerald-50 text-emerald-500 cursor-not-allowed border-emerald-100"
                  : !hasAdminAccess
                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md hover:border-emerald-700"
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing operational updates...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Approve & Write KPI Roster Updates</span>
                </>
              )}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center py-3">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Batch Import Execution Completed
              </h4>

              <p className="text-xs text-slate-500 mt-1">
                Roster update processed successfully and local state is synced.
              </p>
            </div>

            <div className="thin-scroll bg-slate-900 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10px] text-emerald-400 text-left space-y-1 border border-slate-800">
              {importLog.map((line, idx) => (
                <p key={`${line}-${idx}`} className="leading-relaxed">
                  &gt; {line}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={resetImporter}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
            >
              <span>Import another Excel or CSV file</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) {
    return <div className="h-full">{content}</div>;
  }

  return (
    <div className="sibs-card overflow-hidden h-full flex flex-col justify-between">
      {content}
    </div>
  );
}