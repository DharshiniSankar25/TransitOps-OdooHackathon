const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET all trips
router.get('/', async (req, res) => {
  const result = await pool.query(`
    SELECT t.*, v.name AS vehicle_name, v.registration_number, d.name AS driver_name
    FROM trips t
    LEFT JOIN vehicles v ON t.vehicle_id = v.id
    LEFT JOIN drivers d ON t.driver_id = d.id
    ORDER BY t.id DESC
  `);
  res.json(result.rows);
});

// CREATE trip (Draft)
router.post('/', async (req, res) => {
  try {
    const { source, destination, vehicle_id, driver_id, cargo_weight, planned_distance } = req.body;

    // Validate vehicle capacity
    const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [vehicle_id]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
    const vehicle = vehicleRes.rows[0];

    if (Number(cargo_weight) > Number(vehicle.max_load_capacity)) {
      return res.status(400).json({ message: `Cargo weight exceeds vehicle max load capacity (${vehicle.max_load_capacity} kg)` });
    }

    const result = await pool.query(
      `INSERT INTO trips (source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Draft') RETURNING *`,
      [source, destination, vehicle_id, driver_id, cargo_weight, planned_distance]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DISPATCH trip
router.patch('/:id/dispatch', async (req, res) => {
  try {
    const { id } = req.params;
    const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
    const trip = tripRes.rows[0];

    if (trip.status !== 'Draft') {
      return res.status(400).json({ message: 'Only Draft trips can be dispatched' });
    }

    const vehicleRes = await pool.query('SELECT * FROM vehicles WHERE id = $1', [trip.vehicle_id]);
    const driverRes = await pool.query('SELECT * FROM drivers WHERE id = $1', [trip.driver_id]);
    const vehicle = vehicleRes.rows[0];
    const driver = driverRes.rows[0];

    if (!vehicle || vehicle.status !== 'Available') {
      return res.status(400).json({ message: 'Vehicle is not available' });
    }
    if (!driver || driver.status !== 'Available') {
      return res.status(400).json({ message: 'Driver is not available' });
    }
    if (driver.status === 'Suspended') {
      return res.status(400).json({ message: 'Driver is suspended' });
    }
    if (new Date(driver.license_expiry_date) < new Date()) {
      return res.status(400).json({ message: 'Driver license has expired' });
    }

    await pool.query(`UPDATE vehicles SET status = 'On Trip' WHERE id = $1`, [trip.vehicle_id]);
    await pool.query(`UPDATE drivers SET status = 'On Trip' WHERE id = $1`, [trip.driver_id]);
    const updated = await pool.query(
      `UPDATE trips SET status = 'Dispatched', dispatched_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// COMPLETE trip
router.patch('/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_distance, fuel_consumed } = req.body;

    const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
    const trip = tripRes.rows[0];

    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ message: 'Only Dispatched trips can be completed' });
    }

    await pool.query(`UPDATE vehicles SET status = 'Available', odometer = odometer + $1 WHERE id = $2`, [actual_distance || 0, trip.vehicle_id]);
    await pool.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);

    const updated = await pool.query(
      `UPDATE trips SET status = 'Completed', actual_distance = $1, fuel_consumed = $2, completed_at = NOW() WHERE id = $3 RETURNING *`,
      [actual_distance, fuel_consumed, id]
    );

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CANCEL trip
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const tripRes = await pool.query('SELECT * FROM trips WHERE id = $1', [id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ message: 'Trip not found' });
    const trip = tripRes.rows[0];

    if (trip.status === 'Dispatched') {
      await pool.query(`UPDATE vehicles SET status = 'Available' WHERE id = $1`, [trip.vehicle_id]);
      await pool.query(`UPDATE drivers SET status = 'Available' WHERE id = $1`, [trip.driver_id]);
    }

    const updated = await pool.query(`UPDATE trips SET status = 'Cancelled' WHERE id = $1 RETURNING *`, [id]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;