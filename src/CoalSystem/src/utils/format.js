/**
 * Format a number as Indian Rupee string (e.g. 1,23,456.78)
 * Returns "—" for null/undefined.
 */
export const INR = (n) =>
  n === null || n === undefined
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);

/**
 * Safely display a value; returns "—" for null/undefined.
 */
export const display = (v) =>
  v === null || v === undefined || v === "" ? "—" : String(v);
