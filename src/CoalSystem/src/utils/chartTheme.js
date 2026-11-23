/**
 * Shared Theme and Formatting Utilities for Coal System Charts & Visualizations
 */

export const CHART_THEME = {
  colors: {
    // Brand & Status Palette (Max 6 Semantic colors)
    critical: "#e7000b", // Primary Brand Red / Expired / Alert
    criticalLight: "#fee2e2",
    warning: "#f59e0b",  // Amber / In Progress / Near Due
    warningLight: "#fef3c7",
    good: "#10b981",     // Emerald / Completed / Valid / Compliant
    goodLight: "#d1fae5",
    neutralBlue: "#3b82f6", // Blue / Active / Scheduled
    neutralSlate: "#64748b", // Grey / Idle / Unassigned
    neutralLight: "#f1f5f9",
    purple: "#8b5cf6"
  },
  statusColors: {
    idle: "#64748b",
    inProgress: "#f59e0b",
    completed: "#10b981",
    pending: "#e7000b"
  },
  piePalette: [
    "#e7000b", // Red
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#06b6d4"  // Cyan
  ],
  fonts: {
    family: "system-ui, -apple-system, sans-serif",
    sizeSmall: 11,
    sizeNormal: 12,
    sizeLarge: 14
  }
};

/**
 * Format number in standard Indian Numbering Format (e.g. 1,25,000)
 */
export const formatIndianNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return "0";
  const n = Number(num);
  return n.toLocaleString("en-IN", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(2, decimals)
  });
};

/**
 * Format currency with ₹ and Indian numbering
 */
export const formatIndianCurrency = (val) => {
  const n = Number(val) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(2)} K`;
  return `₹${n.toLocaleString("en-IN")}`;
};
