/**
 * Formats a duration as a safe, rounded number of seconds.
 */
export const formatSeconds = (seconds) => {
  const numericValue = Number(seconds);
  const safeSeconds = Number.isFinite(numericValue)
    ? Math.max(0, Math.round(numericValue))
    : 0;

  return `${safeSeconds.toLocaleString("en-US")}s`;
};

/**
 * Calculates percentage. Avoids division by zero.
 */
export const calculatePercentage = (actual, target) => {
  if (target === 0) return 0;
  return (actual / target) * 100;
};

/**
 * Returns a color class based on performance against a target
 */
export const getPerformanceColor = (actual, target, isLowerBetter = false) => {
  const percentage = calculatePercentage(actual, target);

  if (isLowerBetter) {
    if (percentage <= 100) return "text-green-600";
    if (percentage <= 110) return "text-amber-600";
    return "text-red-600";
  }

  if (percentage >= 100) return "text-green-600";
  if (percentage >= 85) return "text-amber-600";
  return "text-red-600";
};
