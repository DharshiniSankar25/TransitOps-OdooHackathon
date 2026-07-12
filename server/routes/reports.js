const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES, toCSV } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// Shared analytics query: fuel efficiency, operational cost, ROI per vehicle
async function computeAnalytics() {
  const result = await pool.query(`
    SELECT
      v.id,
      v.name,
      v.registration_number,
      v.acquisition_cost,
      COALESCE(f.total_fuel_cost, 0)  AS total_fuel_cost,
      COALESCE(f.total_liters, 0)     AS total_liters,
      COALESCE(m.total_maintenance_cost, 0) AS total_maintenance_cost,
      COALESCE(t.total_distance, 0)   AS total_distance
    FROM vehicles v
    LEFT JOIN (
      SELECT vehicle_id, SUM(cost) AS total_fuel_cost, SUM(liters) AS total_liters
      FROM fuel_logs GROUP BY vehicle_id
    ) f ON f.vehicle_id = v.id
    LEFT JOIN (
      SELECT vehicle_id, SUM(cost) AS total_maintenance_cost
      FROM maintenance_logs GROUP BY vehicle_id
    ) m ON m.vehicle_id = v.id
    LEFT JOIN (
      SELECT vehicle_id, SUM(actual_distance) AS total_distance
      FROM trips WHERE status = 'Completed' GROUP BY vehicle_id
    ) t ON t.vehicle_id = v.id
    ORDER BY v.id
  `);

  return result.rows.map((row) => {
    const totalLiters = Number(row.total_liters);
    const totalDistance = Number(row.total_distance);
    const fuelCost = Number(row.total_fuel_cost);
    const maintenanceCost = Number(row.total_maintenance_cost);
    const acquisitionCost = Number(row.acquisition_cost);

    const fuelEfficiency = totalLiters > 0 ? Number((totalDistance / totalLiters).toFixed(2)) : 0;
    const operationalCost = Number((fuelCost + maintenanceCost).toFixed(2));

    // No revenue field exists in the schema yet — if you add one (e.g. per-trip
    // billed amount), sum it here instead of the 0 placeholder.
    const revenue = 0;
    const roi = acquisitionCost > 0
      ? Number((((revenue - operationalCost) / acquisitionCost) * 100).toFixed(2))
      : 0;

    return {
      // NOTE: field names below (vehicle, fuelEfficiency, operationalCost, roi)
      // are camelCase on purpose — client/src/pages/Reports.jsx reads these
      // exact keys. Don't rename without updating that file too.
      vehicle_id: row.id,
      vehicle: row.name,
      registration_number: row.registration_number,
      total_distance_km: totalDistance,
      total_fuel_liters: totalLiters,
      fuelEfficiency,
      fuel_cost: fuelCost,
      maintenance_cost: maintenanceCost,
      operationalCost,
      acquisition_cost: acquisitionCost,
      roi,
    };
  });
}

// GET /api/reports/analytics — Fleet Manager or Financial Analyst
router.get('/analytics', authorize(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST), asyncHandler(async (req, res) => {
  const analytics = await computeAnalytics();
  res.json(analytics);
}));

// GET /api/reports/analytics/export — same data as CSV download
router.get('/analytics/export', authorize(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST), asyncHandler(async (req, res) => {
  const analytics = await computeAnalytics();
  const csv = toCSV(analytics);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transitops_analytics.csv"');
  res.send(csv);
}));

// GET /api/reports/fleet-utilization — Fleet Manager or Financial Analyst
router.get('/fleet-utilization', authorize(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST), asyncHandler(async (req, res) => {
  const result = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'On Trip') AS on_trip,
      COUNT(*) FILTER (WHERE status = 'Available') AS available,
      COUNT(*) FILTER (WHERE status = 'In Shop') AS in_shop,
      COUNT(*) FILTER (WHERE status = 'Retired') AS retired,
      COUNT(*) AS total
    FROM vehicles
  `);
  const row = result.rows[0];
  const total = Number(row.total) || 1;
  res.json({
    onTrip: Number(row.on_trip),
    available: Number(row.available),
    inShop: Number(row.in_shop),
    retired: Number(row.retired),
    total: Number(row.total),
    utilizationPercent: Number(((Number(row.on_trip) / total) * 100).toFixed(2)),
  });
}));

module.exports = router;
