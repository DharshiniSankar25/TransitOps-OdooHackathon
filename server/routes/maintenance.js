const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  try {
    const { vehicle_id, description, cost } = req.body;

    const log = await pool.query(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost, status) VALUES ($1,$2,$3,'Open') RETURNING *`,
      [vehicle_id, description, cost || 0]
    );

    await pool.query(`UPDATE vehicles SET status = 'In Shop' WHERE id = $1`, [vehicle_id]);

    res.status(201).json(log.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    const log = await pool.query(
      `UPDATE maintenance_logs SET status = 'Closed', closed_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (log.rows.length === 0) return res.status(404).json({ message: 'Not found' });

    const vehicleId = log.rows[0].vehicle_id;
    const vehicle = await pool.query('SELECT status FROM vehicles WHERE id = $1', [vehicleId]);
    if (vehicle.rows[0].status !== 'Retired') {
      await pool.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [vehicleId]);
    }

    res.json(log.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;