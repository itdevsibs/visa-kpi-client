import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useRoster } from "../../../services/context/RosterContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  Zap
} from "lucide-react";

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }
  })
};

const Sidebar = ({ isSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, setNotification } = useRoster();

  const navItems = [
    { name: "Executive Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Employee Performance", path: "/performance", icon: Users },
  ];

  return (
    <aside
      className={`${
        isSidebarOpen ? "w-64" : "w-20"
      } transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] bg-white border-r border-slate-200/80 flex flex-col z-30 shrink-0 h-screen overflow-hidden sticky top-0`}
    >
      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2.5"
          >
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-2 rounded-xl flex items-center justify-center font-bold tracking-tight shadow-md font-mono text-sm leading-none border border-blue-500/30 animate-glow-pulse">
              US
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight text-slate-900 font-sans uppercase leading-tight">US Visa Account</h2>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider leading-tight flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-amber-500" />KPI ENGINE
              </p>
            </div>
          </motion.div>
        )}
        {!isSidebarOpen && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-2 rounded-xl flex items-center justify-center font-bold tracking-tight shadow-md font-mono text-sm leading-none border border-blue-500/30 mx-auto"
          >
            US
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto thin-scroll">
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/dashboard');
          return (
            <motion.div
              key={item.path}
              custom={i}
              variants={sidebarItemVariants}
              initial="hidden"
              animate="visible"
            >
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 interactive-press ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 font-medium"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm"
                }`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'animate-scale-pop-in' : ''}`} />
                {isSidebarOpen && <span className="text-sm">{item.name}</span>}
              </Link>
            </motion.div>
          );
        })}

        <motion.div
          custom={2}
          variants={sidebarItemVariants}
          initial="hidden"
          animate="visible"
        >
          <button
            onClick={() => {
              if (userRole === 'Employee' || userRole === 'Team Leader') {
                setNotification(`Access Denied: Settings are restricted to Operations Managers and Administrators.`);
                setTimeout(() => setNotification(null), 3000);
                return;
              }
              navigate('/settings');
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 interactive-press ${
              userRole === 'Employee' || userRole === 'Team Leader' 
                ? 'opacity-40 cursor-not-allowed text-slate-400' 
                : location.pathname === '/settings' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 font-medium' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
            }`}
            title={userRole === 'Employee' || userRole === 'Team Leader' ? 'Restricted Access' : 'Administration Settings'}
          >
            <SettingsIcon className={`w-4 h-4 shrink-0 ${location.pathname === '/settings' ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
            {isSidebarOpen && <span className="text-sm">Administration</span>}
          </button>
        </motion.div>
      </nav>

      {/* Sidebar Footer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-4 border-t border-slate-100 text-[10px] text-slate-400 font-mono text-center shrink-0"
          >
            © 2026 US Visa Intranet<br/>v1.4.0 (Live Proxy)
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};

export default Sidebar;
