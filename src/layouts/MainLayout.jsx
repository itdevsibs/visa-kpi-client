import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";

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

const pageVariants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
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

export default function MainLayout({ children }) {
  const location = useLocation();

  const hideHeader = location.pathname === "/login";
  const hideSidebar = location.pathname === "/login";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const handleToast = (e) => {
      setNotification(e.detail);
    };

    window.addEventListener("show-toast", handleToast);

    return () =>
      window.removeEventListener("show-toast", handleToast);
  }, []);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key="toast"
            variants={toastVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] rounded-2xl bg-slate-900 px-5 py-3 text-white shadow-2xl flex items-center gap-4"
          >
            <span>{notification}</span>

            <button
              onClick={() => setNotification(null)}
              className="hover:text-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      {!hideSidebar && (
        <aside
          className={`
            bg-white
            border-r
            border-slate-200
            transition-all
            duration-300
            ${
              sidebarOpen
                ? "w-72"
                : "w-20"
            }
            shrink-0
          `}
        >
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() =>
              setSidebarOpen(!sidebarOpen)
            }
          />
        </aside>
      )}

      {/* Right Side */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {!hideHeader && <Header />}

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}