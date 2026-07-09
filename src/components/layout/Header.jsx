import React, { useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  LogOut,
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

function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useUser();

  const activeIndex = useMemo(() => {
    const pathname = location.pathname === "/" ? "/dashboard" : location.pathname;
    const index = navItems.findIndex((item) => item.path === pathname);

    return index >= 0 ? index : 0;
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true });
  }, [logout, navigate]);

  return (
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200/60 flex items-center px-3 sm:px-6 shrink-0 z-30 gap-2 sm:gap-4">
      {/* Left: Brand */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 sm:w-56 lg:w-64">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-1.5 sm:p-2 rounded-xl flex items-center justify-center font-bold tracking-tight shadow-md font-mono text-xs sm:text-sm leading-none border border-blue-500/30 shrink-0">
          US
        </div>

        <div className="hidden md:block whitespace-nowrap min-w-0">
          <h2 className="font-bold text-lg lg:text-xl tracking-tight text-slate-900 uppercase leading-tight truncate">
            US Visa Account
          </h2>

          <p className="text-[10px] text-slate-400 font-mono tracking-wider leading-tight">
            <span className="text-amber-500">KPI ENGINE</span>
          </p>
        </div>
      </div>

      {/* Center Navigation */}
      <div className="flex-1 min-w-0 flex justify-center overflow-x-auto no-scrollbar">
        <nav className="relative grid grid-cols-3 bg-slate-100/70 p-1 rounded-2xl border border-slate-200/50 shadow-inner shrink-0 min-w-max">
          {/* Sliding active pill */}
          <div
            className="absolute top-1 bottom-1 left-1 rounded-xl bg-blue-600 shadow-md shadow-blue-500/20 transition-transform duration-300 ease-out will-change-transform"
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
                className={`relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 lg:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-[13px] font-semibold transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />

                <span className="hidden lg:block whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Logout */}
      <div className="flex justify-end shrink-0 sm:w-56 lg:w-64">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-3 sm:px-4 py-2 sm:py-2.5 text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-red-600 active:scale-95"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

export default React.memo(Header);