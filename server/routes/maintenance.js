const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// GET /api/maintenance?status=&vehicle_id=
router.get('/', asyncHandler(async (req, res) => {
  const { status, vehicle_id } = req.query;
  const clauses = [];
  const values = [];
  if (status) { values.push(status); clauses.push(`m.status = $${values.length}`); }
  if (vehicle_id) { values.push(vehicle_id); clauses.push(`m.vehicle_id = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT m.*, v.name AS vehicle_name, v.registration_number
     FROM maintenance_logs m
     LEFT JOIN vehicles v ON m.vehicle_id = v.id
     ${where}
     ORDER BY m.id DESC`,
    values
  );
  res.json(result.rows);
}));

// POST /api/maintenance — Fleet Manager only
// Creating an active maintenance record automatically switches vehicle -> In Shop
router.post('/', authorize(ROLES.FLEET_MANAGER), asyncHandler(async (req, res) => {
  const { vehicle_id, description, cost } = req.body;

  if (!vehicle_id || !description) {
    return res.status(400).json({ message: 'vehicle_id and description are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [vehicle_id]);
    if (vehicleRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const vehicle = vehicleRes.rows[0];

    if (vehicle.status === 'On Trip') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot schedule maintenance while vehicle is on a trip' });
    }
    if (vehicle.status === 'Retired') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot schedule maintenance for a retired vehicle' });
    }

    const existingOpen = await client.query(
      `SELECT id FROM maintenance_logs WHERE vehicle_id = $1 AND status = 'Open'`,
      [vehicle_id]
    );
    if (existingOpen.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Vehicle already has an open maintenance record' });
    }

    const log = await client.query(
      `INSERT INTO maintenance_logs (vehicle_id, description, cost, status)
       VALUES ($1,$2,$3,'Open') RETURNING *`,
      [vehicle_id, description, cost || 0]
    );

    await client.query(`UPDATE vehicles SET status = 'In Shop' WHERE id = $1`, [vehicle_id]);

    await client.query('COMMIT');
    res.status(201).json(log.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PATCH /api/maintenance/:id/close — Fleet Manager only
// Restores vehicle to Available unless it has since been Retired
router.patch('/:id/close', authorize(ROLES.FLEET_MANAGER), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const logRes = await client.query('SELECT * FROM maintenance_logs WHERE id = $1 FOR UPDATE', [id]);
    if (logRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Maintenance record not found' });
    }
    if (logRes.rows[0].status === 'Closed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Maintenance record is already closed' });
    }

    const updatedLog = await client.query(
      `UPDATE maintenance_logs SET status = 'Closed', closed_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    const vehicleId = updatedLog.rows[0].vehicle_id;
    const vehicleRes = await client.query('SELECT status FROM vehicles WHERE id = $1 FOR UPDATE', [vehicleId]);
    if (vehicleRes.rows[0] && vehicleRes.rows[0].status !== 'Retired') {
      await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [vehicleId]);
    }

    await client.query('COMMIT');
    res.json(updatedLog.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
