const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/kpis', async (req, res) => {
  try {
    const totalVehicles = await pool.query('SELECT COUNT(*) FROM vehicles');
    const activeVehicles = await pool.query(`SELECT COUNT(*) FROM vehicles WHERE status != 'Retired'`);
    const availableVehicles = await pool.query(`SELECT COUNT(*) FROM vehicles WHERE status = 'Available'`);
    const inMaintenance = await pool.query(`SELECT COUNT(*) FROM vehicles WHERE status = 'In Shop'`);
    const activeTrips = await pool.query(`SELECT COUNT(*) FROM trips WHERE status = 'Dispatched'`);
    const pendingTrips = await pool.query(`SELECT COUNT(*) FROM trips WHERE status = 'Draft'`);
    const driversOnDuty = await pool.query(`SELECT COUNT(*) FROM drivers WHERE status = 'On Trip'`);

    const total = Number(totalVehicles.rows[0].count) || 1;
    const onTrip = await pool.query(`SELECT COUNT(*) FROM vehicles WHERE status = 'On Trip'`);
    const utilization = ((Number(onTrip.rows[0].count) / total) * 100).toFixed(2);

    res.json({
      activeVehicles: Number(activeVehicles.rows[0].count),
      availableVehicles: Number(availableVehicles.rows[0].count),
      inMaintenance: Number(inMaintenance.rows[0].count),
      activeTrips: Number(activeTrips.rows[0].count),
      pendingTrips: Number(pendingTrips.rows[0].count),
      driversOnDuty: Number(driversOnDuty.rows[0].count),
      fleetUtilization: utilization,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;