import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "AD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  const { logout, user, currentUser } = useUser();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const displayUser = currentUser || user || {};

  const displayName =
    displayUser.name ||
    displayUser.fullName ||
    displayUser.employee_name ||
    "Administrator";

  const displayEmail =
    displayUser.email ||
    displayUser.employee_email ||
    "administrator@usvisa-kpi.com";

  const displayRole =
    displayUser.role ||
    displayUser.userRole ||
    "Administrator";

  const initials = getInitials(displayName);

  const activeIndex = useMemo(() => {
    const pathname = location.pathname === "/" ? "/dashboard" : location.pathname;
    const index = navItems.findIndex((item) => item.path === pathname);

    return index >= 0 ? index : 0;
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
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

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
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
            <h2 className="truncate text-lg font-black uppercase leading-tight tracking-tight text-slate-900">
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

            <div className="hidden min-w-0 text-left md:block md:max-w-[160px]">
              <p className="truncate text-xs font-black uppercase leading-tight text-slate-900">
                {displayName}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-medium leading-tight text-slate-500">
                {displayEmail}
              </p>
            </div>

            <ChevronDown
              className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <div className="fixed left-3 right-3 top-[84px] z-[100] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-black text-white">
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase text-slate-900">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] font-medium text-slate-500">
                      {displayEmail}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      {displayRole}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
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