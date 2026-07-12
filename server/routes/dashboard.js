const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard/kpis?type=&status=&region=
// type/status/region filter the vehicle-based KPIs (Active/Available/InMaintenance/Utilization)
router.get('/kpis', asyncHandler(async (req, res) => {
  const { type, status, region } = req.query;
  const clauses = [];
  const values = [];
  if (type) { values.push(type); clauses.push(`type = $${values.length}`); }
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  if (region) { values.push(region); clauses.push(`region = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const totalVehicles = await pool.query(`SELECT COUNT(*) FROM vehicles ${where}`, values);
  const activeVehicles = await pool.query(
    `SELECT COUNT(*) FROM vehicles ${where ? where + " AND status != 'Retired'" : "WHERE status != 'Retired'"}`,
    values
  );
  const availableVehicles = await pool.query(
    `SELECT COUNT(*) FROM vehicles ${where ? where + " AND status = 'Available'" : "WHERE status = 'Available'"}`,
    values
  );
  const inMaintenance = await pool.query(
    `SELECT COUNT(*) FROM vehicles ${where ? where + " AND status = 'In Shop'" : "WHERE status = 'In Shop'"}`,
    values
  );
  const onTrip = await pool.query(
    `SELECT COUNT(*) FROM vehicles ${where ? where + " AND status = 'On Trip'" : "WHERE status = 'On Trip'"}`,
    values
  );

  const activeTrips = await pool.query(`SELECT COUNT(*) FROM trips WHERE status = 'Dispatched'`);
  const pendingTrips = await pool.query(`SELECT COUNT(*) FROM trips WHERE status = 'Draft'`);
  const driversOnDuty = await pool.query(`SELECT COUNT(*) FROM drivers WHERE status = 'On Trip'`);

  const total = Number(totalVehicles.rows[0].count) || 0;
  const utilization = total > 0 ? ((Number(onTrip.rows[0].count) / total) * 100).toFixed(2) : '0.00';

  res.json({
    totalVehicles: total,
    activeVehicles: Number(activeVehicles.rows[0].count),
    availableVehicles: Number(availableVehicles.rows[0].count),
    inMaintenance: Number(inMaintenance.rows[0].count),
    activeTrips: Number(activeTrips.rows[0].count),
    pendingTrips: Number(pendingTrips.rows[0].count),
    driversOnDuty: Number(driversOnDuty.rows[0].count),
    fleetUtilization: Number(utilization),
  });
}));

module.exports = router;
