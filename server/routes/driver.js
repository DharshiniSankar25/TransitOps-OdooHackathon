const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM drivers ORDER BY id DESC');
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  try {
    const { name, license_number, license_category, license_expiry_date, contact_number } = req.body;

    const existing = await pool.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'License number already exists' });
    }

    const result = await pool.query(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, license_number, license_category, license_expiry_date, contact_number]
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
    `UPDATE drivers SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  res.json(result.rows[0]);
});

module.exports = router;