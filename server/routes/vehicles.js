const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM vehicles ORDER BY id DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  try {
    const { registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region } = req.body;

    const existing = await pool.query('SELECT id FROM vehicles WHERE registration_number = $1', [registration_number]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Registration number already exists' });
    }

    const result = await pool.query(
      `INSERT INTO vehicles (registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [registration_number, name, type, max_load_capacity, odometer || 0, acquisition_cost, region]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
  const keys = Object.keys(fields);
  if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = keys.map(k => fields[k]);

  const result = await pool.query(
    `UPDATE vehicles SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  res.json(result.rows[0]);
});

module.exports = router;