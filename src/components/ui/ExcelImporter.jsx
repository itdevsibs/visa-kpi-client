const _jsxFileName = ""; function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
 Play, Check, ArrowRight, RefreshCw
} from 'lucide-react';

























export default function ExcelImporter({ employees, setEmployees, userRole }) {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [pasteData, setPasteData] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [importLog, setImportLog] = useState([]);
  const [conflictStrategy, setConflictStrategy] = useState('update');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Validate, 3: Success

  const fileInputRef = useRef(null);

  const hasAdminAccess = userRole === 'Administrator';

  // Helper to parse CSV/TSV contents
  const parseDelimiterData = (text) => {
    if (!text.trim()) return;

    const lines = text.split(/\r?\n/);
    if (lines.length === 0 || !lines[0].trim()) {
      alert("No data found in the uploaded content.");
      return;
    }

    // Determine separator: CSV (comma) vs TSV (tab) vs Semicolon
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) {
      separator = '\t';
    } else if (firstLine.includes(';')) {
      separator = ';';
    }

    // Split headers
    const rawHeaders = firstLine.split(separator).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    // Auto-map headers
    const headerMap = {};
    rawHeaders.forEach((header, index) => {
      if (header.includes('id') || header.includes('code') || header.includes('number')) {
        if (!headerMap['employee_id']) headerMap['employee_id'] = index;
      } else if (header.includes('name') || header.includes('fullname')) {
        headerMap['employee_name'] = index;
      } else if (header.includes('email') || header.includes('mail')) {
        headerMap['email'] = index;
      } else if (header.includes('position') || header.includes('title') || header.includes('job')) {
        headerMap['position'] = index;
      } else if (header.includes('dept') || header.includes('department')) {
        headerMap['department'] = index;
      } else if (header.includes('team') || header.includes('group')) {
        headerMap['team'] = index;
      } else if (header.includes('supervisor') || header.includes('manager') || header.includes('boss') || header.includes('leader')) {
        headerMap['supervisor'] = index;
      } else if (header.includes('status') || header.includes('active')) {
        headerMap['employment_status'] = index;
      }
    });

    // Fallbacks if mapping fails (fallback to index sequence)
    const getIndex = (key, defaultIdx) => {
      return headerMap[key] !== undefined ? headerMap[key] : defaultIdx;
    };

    const idx_id = getIndex('employee_id', 0);
    const idx_name = getIndex('employee_name', 1);
    const idx_email = getIndex('email', 2);
    const idx_position = getIndex('position', 3);
    const idx_dept = getIndex('department', 4);
    const idx_team = getIndex('team', 5);
    const idx_supervisor = getIndex('supervisor', 6);
    const idx_status = getIndex('employment_status', 7);

    const rowsToValidate = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting with quote awareness
      let parts = [];
      if (separator === ',') {
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        parts = matches.map(p => p.trim().replace(/^["']|["']$/g, ''));
      } else {
        parts = line.split(separator).map(p => p.trim().replace(/^["']|["']$/g, ''));
      }

      const raw_id = parts[idx_id] || '';
      const raw_name = parts[idx_name] || '';
      const raw_email = parts[idx_email] || '';
      const raw_position = parts[idx_position] || 'Adjudication Officer';
      const raw_dept = parts[idx_dept] || 'Operational Operations';
      const raw_team = parts[idx_team] || 'Team Alpha';
      const raw_supervisor = parts[idx_supervisor] || 'Supervisor';
      const raw_status = parts[idx_status] || 'Active';

      // Basic validations
      const errors = [];
      if (!raw_id) errors.push('Missing Employee ID');
      if (!raw_name) errors.push('Missing Employee Name');
      if (!raw_email) {
        errors.push('Missing email address');
      } else if (!raw_email.includes('@')) {
        errors.push('Invalid email format');
      }

      // Check for conflict match with existing roster
      const matchingEmployee = employees.find(
        e => e.employee_id.toLowerCase() === raw_id.toLowerCase() || 
             e.email.toLowerCase() === raw_email.toLowerCase()
      );

      // Clean status mapping
      let finalStatus = 'Active';
      const normStatus = raw_status.toLowerCase();
      if (normStatus.includes('leave') || normStatus.includes('susp')) {
        finalStatus = 'On Leave';
      } else if (normStatus.includes('inact') || normStatus.includes('term') || normStatus.includes('off')) {
        finalStatus = 'Inactive';
      }

      rowsToValidate.push({
        employee_id: raw_id || `EMP_MOCK_${100 + i}`,
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
        matchId: _optionalChain([matchingEmployee, 'optionalAccess', _ => _.id])
      });
    }

    setParsedRows(rowsToValidate);
    setStep(2);
  };

  // Handle Drag & Drop events
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = _optionalChain([event, 'access', _2 => _2.target, 'optionalAccess', _3 => _3.result]) ;
        parseDelimiterData(text);
      };
      reader.readAsText(file);
    }
  };

  // Handle manual file selection
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = _optionalChain([event, 'access', _4 => _4.target, 'optionalAccess', _5 => _5.result]) ;
        parseDelimiterData(text);
      };
      reader.readAsText(file);
    }
  };

  const handlePasteSubmit = () => {
    if (!pasteData.trim()) return;
    setFileName("Pasted Raw Clipboard Roster");
    parseDelimiterData(pasteData);
  };

  // Run actual insertion into the main employees list
  const triggerImportProcess = () => {
    if (!hasAdminAccess) return;
    setIsProcessing(true);
    setImportLog([]);

    const logs = [];
    logs.push(`[Importer] Starting batch roster import of ${parsedRows.length} items...`);

    setTimeout(() => {
      setEmployees(prevEmployees => {
        const updatedEmployees = [...prevEmployees];
        let addedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        parsedRows.forEach(row => {
          if (!row.isValid) {
            logs.push(`[Skip] Employee ${row.employee_name || 'Unknown'} skipped due to validation errors.`);
            skippedCount++;
            return;
          }

          // Locate match
          const matchIndex = updatedEmployees.findIndex(
            e => e.employee_id.toLowerCase() === row.employee_id.toLowerCase() || 
                 e.email.toLowerCase() === row.email.toLowerCase()
          );

          if (matchIndex >= 0) {
            // Conflict
            if (conflictStrategy === 'update') {
              const current = updatedEmployees[matchIndex];
              updatedEmployees[matchIndex] = {
                ...current,
                employee_name: row.employee_name,
                position: row.position,
                department: row.department,
                team: row.team,
                supervisor: row.supervisor,
                employment_status: row.employment_status,
                status: row.employment_status === 'Active' ? 'Active' : 'Inactive',
                updated_at: new Date().toISOString()
              };
              logs.push(`[Update] Existing profile synced & overwritten: ${row.employee_name} (${row.employee_id})`);
              updatedCount++;
            } else {
              logs.push(`[Ignore] Retained existing record, skipped import: ${row.employee_name}`);
              skippedCount++;
            }
          } else {
            // New Employee
            const newEmp = {
              id: `emp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              employee_id: row.employee_id,
              employee_number: row.employee_id.replace(/\D/g, '') || String(10000 + updatedEmployees.length),
              employee_name: row.employee_name,
              email: row.email,
              position: row.position,
              department: row.department,
              team: row.team,
              supervisor: row.supervisor,
              employment_status: row.employment_status,
              account_name: 'US Visa',
              last_synced_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              assigned_sub_account: null,
              sub_account_assigned_at: null,
              include_dashboard: true,
              include_reports: true,
              kpi_tracking_enabled: true,
              status: row.employment_status === 'Active' ? 'Active' : 'Inactive'
            };
            updatedEmployees.push(newEmp);
            logs.push(`[Add New] Added new team member to US Visa roster: ${row.employee_name} (${row.employee_id})`);
            addedCount++;
          }
        });

        logs.push(`[Completed] Processed ${parsedRows.length} lines. Added: ${addedCount}, Overwritten: ${updatedCount}, Skipped: ${skippedCount}.`);
        return updatedEmployees;
      });

      setImportLog(logs);
      setIsProcessing(false);
      setStep(3);
    }, 1200);
  };

  const handleDownloadSample = () => {
    const csvContent = "employee_id,employee_name,email,position,department,team,supervisor,employment_status\nEMP101,John Doe,john.doe@usvisa-kpi.com,Adjudication Officer,US Visa Operations,Team Alpha,Jane Smith,Active\nEMP102,Alice Cooper,alice.c@usvisa-kpi.com,Support Specialist,Client Services,Team Beta,Marcus Jenkins,Active\nEMP103,Robert Paulson,robert.p@usvisa-kpi.com,Case Processor,Verification Division,Team Alpha,Jane Smith,Inactive";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "US_Visa_Employee_Roster_Template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetImporter = () => {
    setFileName(null);
    setPasteData('');
    setParsedRows([]);
    setImportLog([]);
    setStep(1);
  };

  return (
    React.createElement('div', { className: "bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden h-full flex flex-col justify-between"         , __self: this, __source: {fileName: _jsxFileName, lineNumber: 337}}
      /* Step Header Indicator */
      , React.createElement('div', { className: "bg-slate-50 border-b border-slate-200/60 px-5 py-4 flex items-center justify-between"       , __self: this, __source: {fileName: _jsxFileName, lineNumber: 339}}
        , React.createElement('div', { className: "flex items-center gap-2"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 340}}
          , React.createElement(FileSpreadsheet, { className: "h-5 w-5 text-emerald-600"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 341}} )
          , React.createElement('span', { className: "text-sm font-bold text-slate-800"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 342}}, "Excel / CSV Employee KPI Roster Uploader"      )
        )
        , React.createElement('div', { className: "flex items-center gap-1.5"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 344}}
          , React.createElement('span', { className: `h-2 w-2 rounded-full ${step === 1 ? 'bg-blue-500' : 'bg-slate-300'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 345}} )
          , React.createElement('span', { className: `h-2 w-2 rounded-full ${step === 2 ? 'bg-amber-500' : 'bg-slate-300'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 346}} )
          , React.createElement('span', { className: `h-2 w-2 rounded-full ${step === 3 ? 'bg-emerald-500' : 'bg-slate-300'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 347}} )
        )
      )

      , React.createElement('div', { className: "p-5 flex-1 flex flex-col justify-center"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 351}}
        , step === 1 && (
          React.createElement('div', { className: "space-y-4", __self: this, __source: {fileName: _jsxFileName, lineNumber: 353}}
            , React.createElement('p', { className: "text-xs text-slate-500 leading-relaxed"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 354}}, "Upload spreadsheets or raw data to update tracking profiles. Drag & drop a "
                           , React.createElement('code', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 355}}, ".csv"), " file, select one from your computer, or copy-paste columns directly from Microsoft Excel or Google Sheets."
            )

            /* Drag & Drop File Zone */
            , React.createElement('div', { 
              onDragEnter: handleDrag,
              onDragOver: handleDrag,
              onDragLeave: handleDrag,
              onDrop: handleDrop,
              onClick: () => _optionalChain([fileInputRef, 'access', _6 => _6.current, 'optionalAccess', _7 => _7.click, 'call', _8 => _8()]),
              className: `border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 359}}

              , React.createElement('input', { 
                ref: fileInputRef,
                type: "file", 
                accept: ".csv,.txt",
                onChange: handleFileChange,
                className: "hidden", __self: this, __source: {fileName: _jsxFileName, lineNumber: 367}}
              )
              , React.createElement(Upload, { className: "h-8 w-8 text-slate-400 mx-auto mb-2"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 374}} )
              , React.createElement('p', { className: "text-xs font-bold text-slate-700"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 375}}, "Drag & drop your CSV file here"      )
              , React.createElement('p', { className: "text-[10px] text-slate-400 mt-1"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 376}}, "or click to browse your local computer"      )
            )

            /* Separator Divider */
            , React.createElement('div', { className: "relative flex py-2 items-center"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 380}}
              , React.createElement('div', { className: "flex-grow border-t border-slate-100"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 381}})
              , React.createElement('span', { className: "flex-shrink mx-3 text-[10px] font-mono font-bold text-slate-400 uppercase"      , __self: this, __source: {fileName: _jsxFileName, lineNumber: 382}}, "OR PASTE EXCEL ROWS DIRECTLY"    )
              , React.createElement('div', { className: "flex-grow border-t border-slate-100"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 383}})
            )

            /* Paste Box */
            , React.createElement('div', { className: "space-y-2", __self: this, __source: {fileName: _jsxFileName, lineNumber: 387}}
              , React.createElement('textarea', { 
                value: pasteData,
                onChange: (e) => setPasteData(e.target.value),
                placeholder: "Paste tab-separated rows copied from Excel here (with header row)..."         ,
                rows: 3,
                className: "w-full border border-slate-200 rounded-xl p-3 text-xs font-mono outline-none focus:border-blue-500 resize-none bg-slate-50/30"          , __self: this, __source: {fileName: _jsxFileName, lineNumber: 388}}
              )
              , React.createElement('div', { className: "flex items-center justify-between"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 395}}
                , React.createElement('button', { 
                  onClick: handleDownloadSample,
                  className: "text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"       , __self: this, __source: {fileName: _jsxFileName, lineNumber: 396}}
, "Download Sample CSV Template"

                )
                , React.createElement('button', { 
                  onClick: handlePasteSubmit,
                  disabled: !pasteData.trim() || !hasAdminAccess,
                  className: `text-xs font-semibold px-4 py-2 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${!pasteData.trim() || !hasAdminAccess ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white border-slate-950'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 402}}

                  , React.createElement(Play, { className: "h-3.5 w-3.5" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 407}} )
                  , React.createElement('span', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 408}}, "Parse Paste Clipboard"  )
                )
              )
            )

            , !hasAdminAccess && (
              React.createElement('div', { className: "flex items-center gap-1.5 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[11px] font-medium leading-normal mt-2"            , __self: this, __source: {fileName: _jsxFileName, lineNumber: 414}}
                , React.createElement(AlertTriangle, { className: "h-3.5 w-3.5 shrink-0"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 415}} )
                , React.createElement('span', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 416}}, "Roster imports are restricted to simulated Administrators."      )
              )
            )
          )
        )

        , step === 2 && (
          React.createElement('div', { className: "space-y-4", __self: this, __source: {fileName: _jsxFileName, lineNumber: 423}}
            , React.createElement('div', { className: "flex items-center justify-between border-b border-slate-100 pb-2"     , __self: this, __source: {fileName: _jsxFileName, lineNumber: 424}}
              , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 425}}
                , React.createElement('h4', { className: "text-xs font-black text-slate-800"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 426}}, "Roster Data Preview & Audit"    )
                , React.createElement('p', { className: "text-[10px] text-slate-400 mt-0.5"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 427}}, "Parsed " , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 427}}, parsedRows.length), " records from "   , React.createElement('strong', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 427}}, fileName))
              )
              , React.createElement('button', { 
                onClick: resetImporter,
                className: "text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 cursor-pointer"          , __self: this, __source: {fileName: _jsxFileName, lineNumber: 429}}
, "Clear / Re-upload"

              )
            )

            /* Validation warning */
            , parsedRows.some(r => !r.isValid) && (
              React.createElement('div', { className: "p-2.5 bg-amber-50 border border-amber-100 rounded-lg text-[11px] text-amber-800 flex items-start gap-1.5 leading-normal"          , __self: this, __source: {fileName: _jsxFileName, lineNumber: 439}}
                , React.createElement(AlertTriangle, { className: "h-4 w-4 shrink-0 text-amber-600 mt-0.5"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 440}} )
                , React.createElement('span', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 441}}, "Some rows contain missing details (e.g. invalid emails). These rows will be skipped automatically."             )
              )
            )

            /* Table Preview */
            , React.createElement('div', { className: "border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto bg-slate-50/50"      , __self: this, __source: {fileName: _jsxFileName, lineNumber: 446}}
              , React.createElement('table', { className: "w-full text-left text-[11px] border-collapse"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 447}}
                , React.createElement('thead', { className: "bg-slate-100 text-slate-500 font-mono sticky top-0"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 448}}
                  , React.createElement('tr', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 449}}
                    , React.createElement('th', { className: "px-3 py-1.5 border-b border-slate-200"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 450}}, "ID")
                    , React.createElement('th', { className: "px-3 py-1.5 border-b border-slate-200"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 451}}, "Name")
                    , React.createElement('th', { className: "px-3 py-1.5 border-b border-slate-200"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 452}}, "Email")
                    , React.createElement('th', { className: "px-3 py-1.5 border-b border-slate-200"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 453}}, "Team / Role"  )
                    , React.createElement('th', { className: "px-3 py-1.5 border-b border-slate-200 text-center"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 454}}, "Audit")
                  )
                )
                , React.createElement('tbody', { className: "divide-y divide-slate-150" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 457}}
                  , parsedRows.map((row, idx) => (
                    React.createElement('tr', { key: idx, className: "hover:bg-slate-50 bg-white" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 459}}
                      , React.createElement('td', { className: "px-3 py-2 font-mono font-bold text-slate-800"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 460}}, row.employee_id)
                      , React.createElement('td', { className: "px-3 py-2 font-semibold text-slate-700"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 461}}, row.employee_name || React.createElement('span', { className: "text-rose-500", __self: this, __source: {fileName: _jsxFileName, lineNumber: 461}}, "Missing"))
                      , React.createElement('td', { className: "px-3 py-2 text-slate-500"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 462}}, row.email || React.createElement('span', { className: "text-rose-500", __self: this, __source: {fileName: _jsxFileName, lineNumber: 462}}, "Missing"))
                      , React.createElement('td', { className: "px-3 py-2 text-slate-500 leading-snug"   , __self: this, __source: {fileName: _jsxFileName, lineNumber: 463}}
                        , React.createElement('span', { className: "block font-medium text-slate-700"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 464}}, row.team)
                        , React.createElement('span', { className: "block text-[9px] font-mono"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 465}}, row.position)
                      )
                      , React.createElement('td', { className: "px-3 py-2 text-center"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 467}}
                        , row.isValid ? (
                          row.isMatch ? (
                            React.createElement('span', { className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100"           , title: "Existing match will be resolved via setting below"       , __self: this, __source: {fileName: _jsxFileName, lineNumber: 470}}, "Match"

                            )
                          ) : (
                            React.createElement('span', { className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"           , __self: this, __source: {fileName: _jsxFileName, lineNumber: 474}}, "New"

                            )
                          )
                        ) : (
                          React.createElement('span', { className: "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-100"           , title: row.errors.join(', '), __self: this, __source: {fileName: _jsxFileName, lineNumber: 479}}, "Error"

                          )
                        )
                      )
                    )
                  ))
                )
              )
            )

            /* Match Strategy Choice Selector */
            , parsedRows.some(r => r.isMatch) && (
              React.createElement('div', { className: "bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"          , __self: this, __source: {fileName: _jsxFileName, lineNumber: 492}}
                , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 493}}
                  , React.createElement('span', { className: "block text-[10px] font-bold font-mono text-slate-400 uppercase"     , __self: this, __source: {fileName: _jsxFileName, lineNumber: 494}}, "Match Strategy" )
                  , React.createElement('span', { className: "block text-xs font-semibold text-slate-700 mt-0.5"    , __self: this, __source: {fileName: _jsxFileName, lineNumber: 495}}, "Existing IDs / Emails matched in database:"      )
                )
                , React.createElement('div', { className: "flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200"       , __self: this, __source: {fileName: _jsxFileName, lineNumber: 497}}
                  , React.createElement('button', { 
                    onClick: () => setConflictStrategy('update'),
                    className: `px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${conflictStrategy === 'update' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 498}}
, "Overwrite/Update"

                  )
                  , React.createElement('button', { 
                    onClick: () => setConflictStrategy('skip'),
                    className: `px-3 py-1 text-xs font-bold rounded-md cursor-pointer transition-colors ${conflictStrategy === 'skip' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-800'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 504}}
, "Skip Duplicates"

                  )
                )
              )
            )

            /* Run Button */
            , React.createElement('button', { 
              onClick: triggerImportProcess,
              disabled: isProcessing || !hasAdminAccess,
              className: `w-full flex items-center justify-center gap-2 text-xs font-semibold py-3 px-4 rounded-xl border border-emerald-200 shadow-xs transition-all ${isProcessing ? 'bg-emerald-50 text-emerald-500 cursor-not-allowed border-emerald-100' : !hasAdminAccess ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-md hover:border-emerald-700'}`, __self: this, __source: {fileName: _jsxFileName, lineNumber: 515}}

              , isProcessing ? (
                React.createElement(React.Fragment, null
                  , React.createElement(RefreshCw, { className: "h-4 w-4 animate-spin"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 522}} )
                  , React.createElement('span', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 523}}, "Processing operational updates..."  )
                )
              ) : (
                React.createElement(React.Fragment, null
                  , React.createElement(Check, { className: "h-4 w-4" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 527}} )
                  , React.createElement('span', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 528}}, "Approve & Write KPI Roster Updates"     )
                )
              )
            )
          )
        )

        , step === 3 && (
          React.createElement('div', { className: "space-y-4 text-center py-3"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 536}}
            , React.createElement('div', { className: "h-12 w-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200"          , __self: this, __source: {fileName: _jsxFileName, lineNumber: 537}}
              , React.createElement(CheckCircle2, { className: "h-6 w-6" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 538}} )
            )
            , React.createElement('div', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 540}}
              , React.createElement('h4', { className: "text-sm font-bold text-slate-800"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 541}}, "Batch Import Execution Completed"   )
              , React.createElement('p', { className: "text-xs text-slate-500 mt-1"  , __self: this, __source: {fileName: _jsxFileName, lineNumber: 542}}, "Roster update processed successfully and local state is synced."        )
            )

            /* Processing Logs */
            , React.createElement('div', { className: "bg-slate-900 rounded-xl p-3 h-32 overflow-y-auto font-mono text-[10px] text-emerald-400 text-left space-y-1 border border-slate-800 scrollbar-thin"            , __self: this, __source: {fileName: _jsxFileName, lineNumber: 546}}
              , importLog.map((line, idx) => (
                React.createElement('p', { key: idx, className: "leading-relaxed", __self: this, __source: {fileName: _jsxFileName, lineNumber: 548}}, "> " , line)
              ))
            )

            , React.createElement('button', { 
              onClick: resetImporter,
              className: "text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"          , __self: this, __source: {fileName: _jsxFileName, lineNumber: 552}}

              , React.createElement('span', {__self: this, __source: {fileName: _jsxFileName, lineNumber: 556}}, "Import another roster file"   )
              , React.createElement(ArrowRight, { className: "h-3 w-3" , __self: this, __source: {fileName: _jsxFileName, lineNumber: 557}} )
            )
          )
        )
      )
    )
  );
}
