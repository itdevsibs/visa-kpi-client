/**
 * Reusable Framer Motion animation primitives.
 * These provide staggered fade-ins, slide transitions, scale pops,
 * and page-level route transitions.
 */
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ─── Easing Presets ─── */
const spring = { type: "spring", stiffness: 300, damping: 30 };
const smoothEase = [0.25, 0.46, 0.45, 0.94];
const snappyEase = [0.22, 1, 0.36, 1];

/* ─── Fade In ─── */
export const FadeIn = ({
  children,
  delay = 0,
  duration = 0.5,
  className = "",
  ...props
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration, delay, ease: smoothEase }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─── Fade-In + Slide Up ─── */
export const SlideUp = ({
  children,
  delay = 0,
  duration = 0.55,
  y = 24,
  className = "",
  ...props
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: y / 2 }}
    transition={{ duration, delay, ease: snappyEase }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─── Scale Pop ─── */
export const ScalePop = ({
  children,
  delay = 0,
  duration = 0.4,
  className = "",
  ...props
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration, delay, ease: snappyEase }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─── Stagger Container + Item ─── */
export const StaggerContainer = ({
  children,
  staggerDelay = 0.08,
  className = "",
  ...props
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    exit="hidden"
    variants={{
      visible: {
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: 0.1,
        },
      },
      hidden: {},
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({
  children,
  className = "",
  ...props
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 18, scale: 0.97 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.45, ease: snappyEase },
      },
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─── Page Transition Wrapper (for route changes) ─── */
export const PageTransition = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.4, ease: snappyEase }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ─── Hover Scale (wrap interactive cards) ─── */
export const HoverScale = ({
  children,
  scale = 1.02,
  className = "",
  ...props
}) => (
  <motion.div
    whileHover={{ scale, transition: { duration: 0.2 } }}
    whileTap={{ scale: scale - 0.03 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

/* ─── Slide In From Right (drawers, panels) ─── */
export const SlideFromRight = ({
  children,
  isOpen,
  className = "",
  onClose,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
          onClick={onClose}
        />
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className={`fixed right-0 top-0 bottom-0 z-50 ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

/* ─── Number Counter (animates from 0 to target) ─── */
export const AnimatedNumber = ({ value, duration = 1.2, className = "" }) => {
  const [displayed, setDisplayed] = React.useState(0);
  const prevRef = React.useRef(0);

  React.useEffect(() => {
    const start = prevRef.current;
    const end = typeof value === "number" ? value : parseFloat(value) || 0;
    const diff = end - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const dur = duration * 1000;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setDisplayed(Math.round(current * 10) / 10);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevRef.current = end;
  }, [value, duration]);

  return <span className={className}>{displayed}</span>;
};

/* ─── Pulse Dot (live indicator) ─── */
export const PulseDot = ({ color = "bg-emerald-500", className = "" }) => (
  <span className={`relative flex h-2.5 w-2.5 ${className}`}>
    <span
      className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
    />
    <span
      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`}
    />
  </span>
);

/* Re-export AnimatePresence for convenience */
export { AnimatePresence, motion };
