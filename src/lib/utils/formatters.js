/**
 * Formats a given number of seconds into a HH:MM:SS string
 */
export const formatSeconds = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const pad = (num) => num.toString().padStart(2, "0");

  if (h > 0) {
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
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
