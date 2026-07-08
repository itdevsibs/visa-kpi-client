import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Settings as SettingsIcon,
  Zap
} from "lucide-react";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: "Executive Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Employee Performance", path: "/performance", icon: Users },
  ];

  return (
    <header className="h-20 bg-white border-b border-slate-200/60 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30">
      
      {/* Left: Brand */}
      <div className="flex items-center gap-3 w-auto lg:w-64 shrink-0">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-2 rounded-xl flex items-center justify-center font-bold tracking-tight shadow-md font-mono text-sm leading-none border border-blue-500/30">
          US
        </div>
        <div className="hidden sm:block whitespace-nowrap">
          <h2 className="font-bold text-xl tracking-tight text-slate-900 font-sans uppercase leading-tight">US Visa Account</h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-wider leading-tight flex items-center gap-1">
            <p className="text-amber-500">KPI ENGINE</p>
          </p>
        </div>
      </div>

      {/* Center: Navigation Pill */}
      <nav className="flex items-center gap-1.5 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/dashboard');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex items-center justify-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 interactive-press z-10 ${
                isActive 
                  ? 'text-white' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
              <item.icon className="w-4 h-4 shrink-0 relative z-10" />
              <span className="relative z-10 hidden lg:block whitespace-nowrap">{item.name}</span>
            </Link>
          );
        })}
        
        <button
          onClick={() => navigate('/settings')}
          className={`relative flex items-center justify-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-300 interactive-press z-10 ${
            location.pathname === '/settings'
              ? 'text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          {location.pathname === '/settings' && (
            <motion.div
              layoutId="activeTabPill"
              className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-500/20"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          )}
          <SettingsIcon className={`w-4 h-4 shrink-0 relative z-10 ${location.pathname === '/settings' ? 'animate-[spin_3s_linear_infinite]' : ''}`} />
          <span className="relative z-10 hidden lg:block whitespace-nowrap">Administration</span>
        </button>
      </nav>
    </header>
  );
};

export default Header;
