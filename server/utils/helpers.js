// utils/helpers.js
// Small shared helpers used across route files.

// Wrap an async route handler so thrown errors / rejected promises
// are forwarded to Express's error handler instead of crashing the process
// or leaving the request hanging.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const ROLES = {
  FLEET_MANAGER: 'Fleet Manager',
  DRIVER: 'Driver',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

const ALL_ROLES = Object.values(ROLES);

const VEHICLE_STATUSES = ['Available', 'On Trip', 'In Shop', 'Retired'];
const DRIVER_STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
const TRIP_STATUSES = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

// Whitelist which columns are allowed in a dynamic PATCH so a client
// can never inject an arbitrary column name into the SQL string.
function buildUpdateClause(fields, allowedColumns) {
  const keys = Object.keys(fields).filter((k) => allowedColumns.includes(k));
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map((k) => fields[k]);
  return { setClause, values, keys };
}

// Convert an array of plain objects into a CSV string (no external deps).
function toCSV(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

module.exports = {
  asyncHandler,
  ROLES,
  ALL_ROLES,
  VEHICLE_STATUSES,
  DRIVER_STATUSES,
  TRIP_STATUSES,
  buildUpdateClause,
  toCSV,
};
