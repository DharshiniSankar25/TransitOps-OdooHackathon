const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/analytics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id,
        v.name,
        v.registration_number,
        v.acquisition_cost,
        COALESCE(SUM(f.cost), 0) AS total_fuel_cost,
        COALESCE(SUM(f.liters), 0) AS total_liters,
        COALESCE((SELECT SUM(m.cost) FROM maintenance_logs m WHERE m.vehicle_id = v.id), 0) AS total_maintenance_cost,
        COALESCE((SELECT SUM(t.actual_distance) FROM trips t WHERE t.vehicle_id = v.id AND t.status = 'Completed'), 0) AS total_distance
      FROM vehicles v
      LEFT JOIN fuel_logs f ON f.vehicle_id = v.id
      GROUP BY v.id
    `);

    const analytics = result.rows.map(row => {
      const fuelEfficiency = row.total_liters > 0 ? (row.total_distance / row.total_liters).toFixed(2) : 0;
      const operationalCost = Number(row.total_fuel_cost) + Number(row.total_maintenance_cost);
      // Revenue placeholder: no revenue field in schema yet, treated as 0 unless you add one
      const revenue = 0;
      const roi = row.acquisition_cost > 0
        ? (((revenue - operationalCost) / row.acquisition_cost) * 100).toFixed(2)
        : 0;

      return {
        vehicle: row.name,
        registration_number: row.registration_number,
        fuelEfficiency,
        operationalCost,
        roi,
      };
    });

    res.json(analytics);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;