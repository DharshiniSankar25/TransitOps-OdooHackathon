const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

const CAN_MANAGE_TRIPS = [ROLES.DRIVER, ROLES.FLEET_MANAGER];

// GET /api/trips?status=
router.get('/', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const clauses = [];
  const values = [];
  if (status) { values.push(status); clauses.push(`t.status = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT t.*, v.name AS vehicle_name, v.registration_number, d.name AS driver_name
     FROM trips t
     LEFT JOIN vehicles v ON t.vehicle_id = v.id
     LEFT JOIN drivers d ON t.driver_id = d.id
     ${where}
     ORDER BY t.id DESC`,
    values
  );
  res.json(result.rows);
}));

// GET /api/trips/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT t.*, v.name AS vehicle_name, v.registration_number, d.name AS driver_name
     FROM trips t
     LEFT JOIN vehicles v ON t.vehicle_id = v.id
     LEFT JOIN drivers d ON t.driver_id = d.id
     WHERE t.id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
  res.json(result.rows[0]);
}));

// POST /api/trips — create a Draft trip
router.post('/', authorize(...CAN_MANAGE_TRIPS), asyncHandler(async (req, res) => {
  const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance } = req.body;

  if (!source || !destination || !vehicle_id || !driver_id || !cargo_weight) {
    return res.status(400).json({
      message: 'source, destination, vehicle_id, driver_id and cargo_weight are required',
    });
  }
  if (Number(cargo_weight) <= 0) {
    return res.status(400).json({ message: 'cargo_weight must be greater than 0' });
  }

  const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
  if (vehicleRes.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
  const vehicle = vehicleRes.rows[0];

  const driverRes = await pool.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
  if (driverRes.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });

  // Business rule: cargo weight must not exceed vehicle max load capacity
  if (Number(cargo_weight) > Number(vehicle.max_load_capacity)) {
    return res.status(400).json({
      message: `Cargo weight (${cargo_weight} kg) exceeds vehicle max load capacity (${vehicle.max_load_capacity} kg)`,
    });
  }

  const result = await pool.query(
    `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,'Draft',$7) RETURNING *`,
    [source, destination, vehicle_id, driver_id, cargo_weight, planned_distance || null, req.user.id]
  );
  res.status(201).json(result.rows[0]);
}));

// PATCH /api/trips/:id/dispatch
// Wrapped in a transaction with row locks so two concurrent dispatches
// can never both grab the same "Available" vehicle/driver.
router.patch('/:id/dispatch', authorize(...CAN_MANAGE_TRIPS), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tripRes = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Trip not found' });
    }
    const trip = tripRes.rows[0];
    if (trip.status !== 'Draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only Draft trips can be dispatched' });
    }

    const vehicleRes = await client.query('SELECT * FROM vehicles WHERE id = $1 FOR UPDATE', [trip.vehicle_id]);
    const driverRes = await client.query('SELECT * FROM drivers WHERE id = $1 FOR UPDATE', [trip.driver_id]);
    const vehicle = vehicleRes.rows[0];
    const driver = driverRes.rows[0];

    // Retired / In Shop vehicles must never be dispatched
    if (!vehicle || vehicle.status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Vehicle is not available (current status: ${vehicle ? vehicle.status : 'unknown'})` });
    }
    // Suspended drivers / expired licenses cannot be assigned
    if (!driver || driver.status !== 'Available') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Driver is not available (current status: ${driver ? driver.status : 'unknown'})` });
    }
    if (new Date(driver.license_expiry_date) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Driver license has expired and cannot be dispatched' });
    }
    // Re-check capacity in case the vehicle record changed since trip creation
    if (Number(trip.cargo_weight) > Number(vehicle.max_load_capacity)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cargo weight exceeds vehicle max load capacity' });
    }

    await client.query(`UPDATE vehicles SET status = 'On Trip' WHERE id = $1`, [trip.vehicle_id]);
    await client.query(`UPDATE drivers SET status = 'On Trip' WHERE id = $1`, [trip.driver_id]);
    const updated = await client.query(
      `UPDATE trips SET status = 'Dispatched', dispatched_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PATCH /api/trips/:id/complete
router.patch('/:id/complete', authorize(...CAN_MANAGE_TRIPS), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actual_distance, fuel_consumed } = req.body;

  if (actual_distance !== undefined && Number(actual_distance) < 0) {
    return res.status(400).json({ message: 'actual_distance cannot be negative' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tripRes = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Trip not found' });
    }
    const trip = tripRes.rows[0];
    if (trip.status !== 'Dispatched') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Only Dispatched trips can be completed' });
    }

    await client.query(
      `UPDATE vehicles SET status = 'Available', odometer = odometer + $1 WHERE id = $2`,
      [actual_distance || 0, trip.vehicle_id]
    );
    await client.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);

    const updated = await client.query(
      `UPDATE trips SET status = 'Completed', actual_distance = $1, fuel_consumed = $2, completed_at = NOW() WHERE id = $3 RETURNING *`,
      [actual_distance || null, fuel_consumed || null, id]
    );

    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PATCH /api/trips/:id/cancel
router.patch('/:id/cancel', authorize(...CAN_MANAGE_TRIPS), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const tripRes = await client.query('SELECT * FROM trips WHERE id = $1 FOR UPDATE', [id]);
    if (tripRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Trip not found' });
    }
    const trip = tripRes.rows[0];
    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Trip is already ${trip.status} and cannot be cancelled` });
    }

    // Restore vehicle/driver to Available only if it was Dispatched
    if (trip.status === 'Dispatched') {
      await client.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [trip.vehicle_id]);
      await client.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);
    }

    const updated = await client.query(`UPDATE trips SET status = 'Cancelled' WHERE id = $1 RETURNING *`, [id]);
    await client.query('COMMIT');
    res.json(updated.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
