const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// GET /api/fuel-logs?vehicle_id=
router.get('/', asyncHandler(async (req, res) => {
  const { vehicle_id } = req.query;
  const clauses = [];
  const values = [];
  if (vehicle_id) { values.push(vehicle_id); clauses.push(`f.vehicle_id = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT f.*, v.name AS vehicle_name, v.registration_number
     FROM fuel_logs f
     LEFT JOIN vehicles v ON f.vehicle_id = v.id
     ${where}
     ORDER BY f.id DESC`,
    values
  );
  res.json(result.rows);
}));

// POST /api/fuel-logs — Fleet Manager, Driver, or Financial Analyst
router.post('/', authorize(ROLES.FLEET_MANAGER, ROLES.DRIVER, ROLES.FINANCIAL_ANALYST), asyncHandler(async (req, res) => {
  const { vehicle_id, liters, cost, log_date } = req.body;

  if (!vehicle_id || !liters || cost === undefined) {
    return res.status(400).json({ message: 'vehicle_id, liters and cost are required' });
  }
  if (Number(liters) <= 0) return res.status(400).json({ message: 'liters must be greater than 0' });
  if (Number(cost) < 0) return res.status(400).json({ message: 'cost cannot be negative' });

  const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1', [vehicle_id]);
  if (vehicleRes.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });

  const result = await pool.query(
    `INSERT INTO fuel_logs (vehicle_id, liters, cost, log_date)
     VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE)) RETURNING *`,
    [vehicle_id, liters, cost, log_date || null]
  );
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
