import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export default function EmployeeFilterDropdown({
  label = "EMPLOYEE",
  employees = [],
  selectedIds = ["all"],
  onChange,
  placeholder = "Search team members...",
  selectionMode = "deferred",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const isImmediate = selectionMode === "immediate";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees;
    const lowerQuery = searchQuery.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.employee_name?.toLowerCase().includes(lowerQuery) ||
        emp.team?.toLowerCase().includes(lowerQuery)
    );
  }, [employees, searchQuery]);

  // Determine display name
  const displayName = useMemo(() => {
    if (selectedIds.includes("all")) return "All Employees";
    if (selectedIds.length === 1) {
      const emp = employees.find((e) => e.id === selectedIds[0]);
      return emp ? emp.employee_name : "1 Employee";
    }
    return `${selectedIds.length} Employees`;
  }, [selectedIds, employees]);

  const [pendingIds, setPendingIds] = useState(selectedIds);
  const activeIds = isImmediate ? selectedIds : pendingIds;

  useEffect(() => {
    if (isOpen) {
      if (!isImmediate) {
        setPendingIds(selectedIds);
      }
      setSearchQuery("");
    }
  }, [isOpen, selectedIds, isImmediate]);

  const handleSelectionToggle = (id) => {
    let newIds = [...activeIds];
    
    if (id === "all") {
      newIds = ["all"];
    } else {
      if (newIds.includes("all")) {
        newIds = newIds.filter((i) => i !== "all");
      }
      
      if (newIds.includes(id)) {
        newIds = newIds.filter((i) => i !== id);
        if (newIds.length === 0) {
          newIds = ["all"];
        }
      } else {
        newIds.push(id);
      }
    }

    if (isImmediate) {
      onChange(newIds);
    } else {
      setPendingIds(newIds);
    }
  };

  const handleApply = () => {
    if (!isImmediate) {
      onChange(pendingIds);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    if (!isImmediate) {
      setPendingIds(["all"]);
    }
    onChange(["all"]);
    if (!isImmediate) {
      setIsOpen(false);
    }
  };

  const selectedCount = activeIds.includes("all") ? 0 : activeIds.length;

  return (
    <div className="flex flex-col gap-1.5 w-full shrink-0 relative" ref={dropdownRef}>
      {label && (
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pl-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls="employee-filter-listbox"
        className="flex items-center justify-between gap-2 border border-slate-200 px-3 py-2 rounded-lg text-slate-700 text-xs bg-slate-50 min-w-[180px] font-semibold hover:bg-slate-100 transition-colors text-left min-h-[38px] outline-none w-full"
      >
        <span className="truncate flex-1">{displayName}</span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div id="employee-filter-listbox" role="listbox" className="absolute left-0 right-0 sm:right-auto top-full mt-2 sm:w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col font-sans">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-700 bg-white"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto p-2 flex flex-col gap-1">
            {/* All Employees Option */}
            {(!searchQuery || "all employees".includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                role="option"
                aria-selected={activeIds.includes("all")}
                onClick={() => handleSelectionToggle("all")}
                className="w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    activeIds.includes("all")
                      ? "bg-blue-600 border-none"
                      : "border border-slate-300 bg-white"
                  }`}
                >
                  {activeIds.includes("all") && <Check className="h-3 w-3 text-white stroke-[3]" />}
                </div>
                <span className={`font-semibold text-sm ${activeIds.includes("all") ? "text-blue-600" : "text-slate-700"}`}>
                  All Employees
                </span>
              </button>
            )}

            {filteredEmployees.map((emp) => {
              const isSelected = activeIds.includes(emp.id);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={emp.id}
                  onClick={() => handleSelectionToggle(emp.id)}
                  className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-blue-600 border-none"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                  </div>
                  <div className="truncate flex-1">
                    <p className={`font-medium text-sm ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                      {emp.employee_name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {emp.team || "No Team"}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredEmployees.length === 0 && searchQuery && (
              <p className="text-center text-sm text-slate-500 py-4">No results found.</p>
            )}
          </div>

          {/* Action Footer */}
          <div className="border-t border-slate-100 p-3 flex items-center justify-between bg-slate-50/50">
            <button
              type="button"
              onClick={handleReset}
              className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors px-2"
            >
              Reset to All
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-5 py-2 rounded-xl transition-all shadow-sm active:scale-95"
            >
              Apply Filters
              {selectedCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-white/20 px-1.5 text-[10px] text-white">
                  {selectedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
