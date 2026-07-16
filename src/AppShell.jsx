import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRoster } from "./services/context/RosterContext";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/layout/Header";
import { X } from "lucide-react";

/* ─── Animation Variants ─── */
const toastVariants = {
  hidden: {
    opacity: 0,
    y: -24,
    scale: 0.95,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.95,
    filter: "blur(4px)",
    transition: {
      duration: 0.2,
    },
  },
};

const pageContentVariants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
      delay: 0.2,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.2,
    },
  },
};

const AppShell = ({ children }) => {
  const location = useLocation();

  const hideHeader = location.pathname === "/login";

  const {
    userRole,
    setUserRole,
    selectedSimUserEmail,
    setSelectedSimUserEmail,
    selectedSimTeam,
    setSelectedSimTeam,
    employees,
    activeEmployeeUsers,
  } = useRoster();

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleToast = (e) => setNotification(e.detail);

    window.addEventListener("show-toast", handleToast);

    return () => {
      window.removeEventListener("show-toast", handleToast);
    };
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key="toast"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] glass-dark text-white text-xs py-3 px-5 flex items-center gap-4 shadow-2xl rounded-2xl font-mono font-medium"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>

              <span>{notification}</span>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="hover:text-slate-300 transition-colors p-0.5 rounded-md hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
        {!hideHeader && <Header />}

        <div
          className={`flex-1 overflow-y-auto thin-scroll relative ${
            hideHeader ? "" : "p-4 sm:p-6 lg:p-8"
          }`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={hideHeader ? "h-full w-full" : ""}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default AppShell;