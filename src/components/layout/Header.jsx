import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
} from "lucide-react";

import { useUser } from "../../services/context/UserContext";

const navItems = [
  {
    name: "Executive Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employee Performance",
    path: "/performance",
    icon: Users,
  },
  {
    name: "Administration",
    path: "/settings",
    icon: SettingsIcon,
  },
];

function cleanText(value) {
  return String(value ?? "").trim();
}

function getInitials(name = "") {
  const parts = cleanText(name).split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function parseStoredObject(key) {
  if (typeof window === "undefined") return null;

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue);

    return parsedValue && typeof parsedValue === "object"
      ? parsedValue
      : null;
  } catch {
    return null;
  }
}

function getStoredUser() {
  const storageKeys = [
    "user",
    "currentUser",
    "authUser",
    "loggedInUser",
    "admin",
    "adminUser",
    "userData",
    "profile",
  ];

  for (const key of storageKeys) {
    const storedValue = parseStoredObject(key);

    if (storedValue) {
      return storedValue;
    }
  }

  return {};
}

function getFirstAvailableValue(object, keys = []) {
  for (const key of keys) {
    const value = cleanText(object?.[key]);

    if (value) return value;
  }

  return "";
}

function buildFullName(user = {}) {
  const directName = getFirstAvailableValue(user, [
    "name",
    "fullName",
    "full_name",
    "employeeName",
    "employee_name",
    "adminName",
    "admin_name",
    "displayName",
    "display_name",
    "username",
    "userName",
    "user_name",
  ]);

  if (directName) return directName;

  const firstName = getFirstAvailableValue(user, [
    "firstName",
    "first_name",
    "firstname",
    "givenName",
    "given_name",
    "gy_emp_fname",
  ]);

  const middleName = getFirstAvailableValue(user, [
    "middleName",
    "middle_name",
    "middlename",
    "gy_emp_mname",
  ]);

  const lastName = getFirstAvailableValue(user, [
    "lastName",
    "last_name",
    "lastname",
    "surname",
    "familyName",
    "family_name",
    "gy_emp_lname",
  ]);

  return [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
}

function getDisplayEmail(user = {}) {
  return getFirstAvailableValue(user, [
    "email",
    "employee_email",
    "employeeEmail",
    "adminEmail",
    "admin_email",
    "userEmail",
    "user_email",
    "emailAddress",
    "email_address",
  ]);
}

function getDisplayRole(user = {}) {
  return (
    getFirstAvailableValue(user, [
      "role",
      "userRole",
      "user_role",
      "roleName",
      "role_name",
      "adminRole",
      "admin_role",
      "position",
      "jobTitle",
      "job_title",
      "designation",
    ]) || "User"
  );
}

function nameFromEmail(email = "") {
  const emailUsername = cleanText(email).split("@")[0];

  if (!emailUsername) return "";

  return emailUsername
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  const { logout, user, currentUser } = useUser();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayUser = useMemo(() => {
    const contextUser =
      currentUser && typeof currentUser === "object"
        ? currentUser
        : user && typeof user === "object"
          ? user
          : {};

    const storedUser = getStoredUser();

    return {
      ...storedUser,
      ...contextUser,
    };
  }, [currentUser, user]);

  const displayEmail = useMemo(() => {
    return getDisplayEmail(displayUser) || "No email available";
  }, [displayUser]);

  const displayName = useMemo(() => {
    const resolvedName = buildFullName(displayUser);

    if (resolvedName) return resolvedName;

    const emailBasedName = nameFromEmail(displayEmail);

    return emailBasedName || "US Visa User";
  }, [displayEmail, displayUser]);

  const displayRole = useMemo(() => {
    return getDisplayRole(displayUser);
  }, [displayUser]);

  const initials = useMemo(() => {
    return getInitials(displayName);
  }, [displayName]);

  const activeIndex = useMemo(() => {
    const pathname =
      location.pathname === "/" ? "/dashboard" : location.pathname;

    const index = navItems.findIndex((item) => item.path === pathname);

    return index >= 0 ? index : 0;
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    setIsProfileOpen(false);

    if (typeof logout === "function") {
      logout();
    }

    navigate("/login", { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="relative z-[80] h-[76px] min-h-[76px] shrink-0 overflow-visible border-b border-slate-200/60 bg-white px-3 sm:px-6 flex items-center gap-3">
      {/* Left: Brand */}
      <div className="flex h-full shrink-0 items-center w-12 md:w-64">
        <div className="flex h-full items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-600 to-blue-700 text-xs font-black text-white shadow-md shadow-blue-500/20">
            US
          </div>

          <div className="hidden min-w-0 md:block">
            <h2 className="whitespace-nowrap text-lg font-black uppercase leading-tight tracking-tight text-slate-900">
              US Visa Account
            </h2>

            <p className="text-[10px] font-mono uppercase leading-tight tracking-wider text-amber-500">
              KPI Engine
            </p>
          </div>
        </div>
      </div>

      {/* Center Navigation */}
      <div className="flex min-w-0 flex-1 items-center justify-center">
        <nav className="relative grid h-12 shrink-0 grid-cols-3 rounded-2xl border border-slate-200/60 bg-slate-100/80 p-1 shadow-inner">
          <div
            className="absolute bottom-1 left-1 top-1 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20 transition-transform duration-300 ease-out will-change-transform"
            style={{
              width: "calc((100% - 0.5rem) / 3)",
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />

          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeIndex === index;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative z-10 flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-colors duration-200 lg:min-w-[180px] ${
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="hidden whitespace-nowrap lg:block">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Profile / Logout */}
      <div className="flex h-full shrink-0 items-center justify-end w-12 md:w-64">
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-2.5 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
              {initials}
            </div>

            <div className="hidden min-w-0 flex-1 text-left md:block">
              <p
                title={displayName}
                className="whitespace-nowrap text-xs font-black uppercase leading-tight text-slate-900"
              >
                {displayName}
              </p>

              <p
                title={displayEmail}
                className="mt-0.5 whitespace-nowrap text-[10px] font-medium leading-tight text-slate-500"
              >
                {displayEmail}
              </p>
            </div>

            <ChevronDown
              className={`hidden h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 md:block ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <div className="fixed left-3 right-3 top-[84px] z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      title={displayName}
                      className="whitespace-nowrap text-sm font-black uppercase leading-tight text-slate-900"
                    >
                      {displayName}
                    </p>

                    <p
                      title={displayEmail}
                      className="mt-1 whitespace-nowrap text-[11px] font-medium text-slate-500"
                    >
                      {displayEmail}
                    </p>

                    <p className="mt-1 whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      {displayRole}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default React.memo(Header);