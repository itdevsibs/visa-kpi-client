import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useRoster } from "../../services/context/RosterContext";
import { motion, AnimatePresence } from "framer-motion";
import { Info, X } from "lucide-react";

import ConditionalSidebar from "./ConditionalSidebar";
import Header from "./Header";

const toastVariants = {
  hidden: { opacity: 0, y: -24, scale: 0.95, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { type: "spring", stiffness: 400, damping: 30 } },
  exit: { opacity: 0, y: -16, scale: 0.95, filter: "blur(4px)", transition: { duration: 0.2 } }
};

const bannerVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 } }
};

const pageContentVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.2 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } }
};

const PUBLIC_ROUTES_WITHOUT_SIDEBAR = [
  "/login"
];

function shouldHideSidebar(pathname) {
  return PUBLIC_ROUTES_WITHOUT_SIDEBAR.some((path) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  });
}

export default function AppShell({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const { 
    userRole,
    selectedSimUserEmail,
    selectedSimTeam,
    notification, setNotification,
    employees
  } = useRoster();

  const hideSidebar = shouldHideSidebar(location.pathname);

  // Adjust routing when role changes to avoid accessing restricted views
  useEffect(() => {
    if (userRole === 'Employee' || userRole === 'Team Leader') {
      if (location.pathname === '/settings') {
        navigate('/dashboard');
        setNotification(`Role ${userRole} does not have access to the Settings page. Redirecting to Dashboard.`);
        setTimeout(() => setNotification(null), 3500);
      }
    }
  }, [userRole, location.pathname, navigate, setNotification]);

  return (
    <div className="flex min-h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* ═══ Toast Notification ═══ */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key="toast"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-5 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[100] glass-dark text-white text-xs py-3 px-5 flex items-center gap-4 shadow-2xl rounded-2xl font-mono font-medium"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification(null)} className="hover:text-slate-300 transition-colors p-0.5 rounded-md hover:bg-white/10 interactive-press">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {hideSidebar ? (
        <main className="min-h-screen w-full">{children}</main>
      ) : (
        <>
          <ConditionalSidebar isSidebarOpen={isSidebarOpen} />
          
          <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
            <Header isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

            <div className="flex-1 overflow-y-scroll p-4 sm:p-6 lg:p-8 thin-scroll relative">
              {/* Role Information Banner */}
              <motion.div
                variants={bannerVariants}
                initial="hidden"
                animate="visible"
                className="bg-gradient-to-r from-blue-50/80 via-blue-50/50 to-transparent border border-blue-100/80 rounded-2xl p-4 mb-6 flex items-start gap-3 card-hover-lift"
              >
                <div className="p-1.5 bg-blue-100 rounded-lg animate-breathe">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-xs leading-relaxed text-blue-900 font-sans">
                  <span className="font-bold">Active Simulation Environment Mode:</span> You are currently viewing the US Visa KPI Module under the simulated role of <strong>{userRole}</strong>
                  {userRole === 'Employee' && (
                    <span>, acting as <strong>{employees.find(e => e.email === selectedSimUserEmail)?.employee_name} ({selectedSimUserEmail})</strong>. Only personal tracking data is visible.</span>
                  )}
                  {userRole === 'Team Leader' && (
                    <span>, managing <strong>{selectedSimTeam}</strong>. Only metrics associated with this team are displayed.</span>
                  )}
                  {userRole === 'Operations Manager' && (
                    <span>. You have executive analytical access to all employee logs, charts, and reports but cannot modify settings.</span>
                  )}
                  {userRole === 'Administrator' && (
                    <span>. You possess full administrative control to synchronize Kronos/HRIS records, priority sequence task orders, and modify individual configs.</span>
                  )}
                  <p className="mt-1 font-mono text-[10px] text-blue-500">
                    *Toggle between roles anytime using the top-right role switcher!
                  </p>
                </div>
              </motion.div>

              {/* Animated Page Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  variants={pageContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
