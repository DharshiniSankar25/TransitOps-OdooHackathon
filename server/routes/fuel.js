const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM fuel_logs ORDER BY id DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  try {
    const { vehicle_id, liters, cost, log_date } = req.body;
    const result = await pool.query(
      `INSERT INTO fuel_logs (vehicle_id, liters, cost, log_date) VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE)) RETURNING *`,
      [vehicle_id, liters, cost, log_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;