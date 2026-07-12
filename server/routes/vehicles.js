const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES, VEHICLE_STATUSES, buildUpdateClause } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

const ALLOWED_UPDATE_COLUMNS = [
  'name', 'type', 'max_load_capacity', 'odometer',
  'acquisition_cost', 'region', 'status', 'registration_number',
];

// GET /api/vehicles?type=&status=&region=&search=
router.get('/', asyncHandler(async (req, res) => {
  const { type, status, region, search } = req.query;
  const clauses = [];
  const values = [];

  if (type) { values.push(type); clauses.push(`type = $${values.length}`); }
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  if (region) { values.push(region); clauses.push(`region = $${values.length}`); }
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(name ILIKE $${values.length} OR registration_number ILIKE $${values.length})`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM vehicles ${where} ORDER BY id DESC`, values);
  res.json(result.rows);
}));

// GET /api/vehicles/available — only vehicles eligible for dispatch
// (Retired / In Shop vehicles must never appear here)
router.get('/available', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM vehicles WHERE status = 'Available' ORDER BY name ASC`
  );
  res.json(result.rows);
}));

// GET /api/vehicles/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT * FROM vehicles WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
  res.json(result.rows[0]);
}));

// POST /api/vehicles  — Fleet Manager only
router.post('/', authorize(ROLES.FLEET_MANAGER), asyncHandler(async (req, res) => {
  const { registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region, status } = req.body;

  if (!registration_number || !name || !type || !max_load_capacity) {
    return res.status(400).json({
      message: 'registration_number, name, type and max_load_capacity are required',
    });
  }
  if (Number(max_load_capacity) <= 0) {
    return res.status(400).json({ message: 'max_load_capacity must be greater than 0' });
  }
  if (status && !VEHICLE_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${VEHICLE_STATUSES.join(', ')}` });
  }

  const existing = await pool.query('SELECT id FROM vehicles WHERE registration_number = $1', [registration_number]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Registration number already exists' });
  }

  const result = await pool.query(
    `INSERT INTO vehicles (registration_number, name, type, max_load_capacity, odometer, acquisition_cost, region, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,'Available')) RETURNING *`,
    [registration_number, name, type, max_load_capacity, odometer || 0, acquisition_cost || 0, region || null, status || null]
  );
  res.status(201).json(result.rows[0]);
}));

// PATCH /api/vehicles/:id — Fleet Manager only
router.patch('/:id', authorize(ROLES.FLEET_MANAGER), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  if (fields.status && !VEHICLE_STATUSES.includes(fields.status)) {
    return res.status(400).json({ message: `status must be one of: ${VEHICLE_STATUSES.join(', ')}` });
  }
  if (fields.registration_number) {
    const dup = await pool.query(
      'SELECT id FROM vehicles WHERE registration_number = $1 AND id != $2',
      [fields.registration_number, id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'Registration number already exists' });
    }
  }

  const built = buildUpdateClause(fields, ALLOWED_UPDATE_COLUMNS);
  if (!built) return res.status(400).json({ message: 'No valid fields to update' });

  const result = await pool.query(
    `UPDATE vehicles SET ${built.setClause} WHERE id = $${built.keys.length + 1} RETURNING *`,
    [...built.values, id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
  res.json(result.rows[0]);
}));

// PATCH /api/vehicles/:id/retire — Fleet Manager only
router.patch('/:id/retire', authorize(ROLES.FLEET_MANAGER), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const active = await pool.query(
    `SELECT id FROM trips WHERE vehicle_id = $1 AND status = 'Dispatched'`,
    [id]
  );
  if (active.rows.length > 0) {
    return res.status(400).json({ message: 'Cannot retire a vehicle that is currently on a trip' });
  }
  const result = await pool.query(
    `UPDATE vehicles SET status = 'Retired' WHERE id = $1 RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
  res.json(result.rows[0]);
}));

// DELETE /api/vehicles/:id — Fleet Manager only (blocked if referenced by trips)
router.delete('/:id', authorize(ROLES.FLEET_MANAGER), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inUse = await pool.query('SELECT id FROM trips WHERE vehicle_id = $1 LIMIT 1', [id]);
  if (inUse.rows.length > 0) {
    return res.status(400).json({ message: 'Vehicle has trip history and cannot be deleted; retire it instead' });
  }
  const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Vehicle not found' });
  res.json({ message: 'Vehicle deleted' });
}));

module.exports = router;
