import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const menus = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    title: "Employees",
    icon: Users,
    path: "/employees",
  },
  {
    title: "Visa Records",
    icon: FileText,
    path: "/visa-records",
  },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings",
  },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        relative
        h-screen
        shrink-0
        border-r
        border-white/10
        bg-white/10
        backdrop-blur-2xl
        transition-all
        duration-300
        ${
          collapsed
            ? "w-20"
            : "w-72"
        }
      `}
    >
      {/* Logo */}

      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">

        <div
          className={`flex items-center gap-3 ${
            collapsed
              ? "justify-center w-full"
              : ""
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-orange-500 text-lg font-bold text-white shadow-lg">
            US
          </div>

          {!collapsed && (
            <div>
              <h2 className="text-lg font-bold text-white">
                US VISA KPI
              </h2>

              <p className="text-xs text-white/60">
                Dashboard
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
        )}

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute -right-4 top-6 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Menu */}

      <nav className="mt-5 space-y-2 px-3">
        {menus.map((menu) => {
          const Icon = menu.icon;

          return (
            <NavLink
              key={menu.path}
              to={menu.path}
              className={({ isActive }) =>
                `
                  group
                  flex
                  items-center
                  gap-4
                  rounded-2xl
                  px-4
                  py-3
                  transition-all
                  duration-300

                  ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }

                  ${
                    collapsed
                      ? "justify-center"
                      : ""
                  }
                `
              }
            >
              <Icon size={22} />

              {!collapsed && (
                <span className="font-medium">
                  {menu.title}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}

      <div className="absolute bottom-5 left-0 w-full px-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
          {!collapsed ? (
            <>
              <p className="text-xs text-white/50">
                SiBS US VISA KPI
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                Version 1.0.0
              </p>
            </>
          ) : (
            <p className="text-xs text-white/50">
              v1
            </p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;