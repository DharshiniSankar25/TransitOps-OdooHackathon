const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// The frontend's expense form (Reports.jsx) is a free-text input ("toll, misc...")
// rather than a fixed dropdown, so we only require a non-empty string here
// instead of enforcing a strict whitelist.

// GET /api/expenses?vehicle_id=&type=
router.get('/', asyncHandler(async (req, res) => {
  const { vehicle_id, type } = req.query;
  const clauses = [];
  const values = [];
  if (vehicle_id) { values.push(vehicle_id); clauses.push(`e.vehicle_id = $${values.length}`); }
  if (type) { values.push(type); clauses.push(`e.type = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT e.*, v.name AS vehicle_name, v.registration_number
     FROM expenses e
     LEFT JOIN vehicles v ON e.vehicle_id = v.id
     ${where}
     ORDER BY e.id DESC`,
    values
  );
  res.json(result.rows);
}));

// POST /api/expenses — Fleet Manager or Financial Analyst
router.post('/', authorize(ROLES.FLEET_MANAGER, ROLES.FINANCIAL_ANALYST), asyncHandler(async (req, res) => {
  const { vehicle_id, type, amount, expense_date, notes } = req.body;

  if (!type || !type.trim() || amount === undefined) {
    return res.status(400).json({ message: 'type and amount are required' });
  }
  if (Number(amount) < 0) return res.status(400).json({ message: 'amount cannot be negative' });

  if (vehicle_id) {
    const vehicleRes = await pool.query('SELECT id FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
  }

  const result = await pool.query(
    `INSERT INTO expenses (vehicle_id, type, amount, expense_date, notes)
     VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5) RETURNING *`,
    [vehicle_id || null, type, amount, expense_date || null, notes || null]
  );
  res.status(201).json(result.rows[0]);
}));

module.exports = router;
