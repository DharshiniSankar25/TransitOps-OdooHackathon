
const express = require('express');
const pool = require('../db');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, ROLES, DRIVER_STATUSES, buildUpdateClause } = require('../utils/helpers');
 
const router = express.Router();
router.use(authenticate);
 
const ALLOWED_UPDATE_COLUMNS = [
  'name', 'license_number', 'license_category', 'license_expiry_date',
  'contact_number', 'safety_score', 'status',
];
 
// GET /api/drivers?status=&search=
router.get('/', asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const clauses = [];
  const values = [];
 
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(name ILIKE $${values.length} OR license_number ILIKE $${values.length})`);
  }
 
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT *, (license_expiry_date < CURRENT_DATE) AS license_expired
     FROM drivers ${where} ORDER BY id DESC`,
    values
  );
  res.json(result.rows);
}));
 
// GET /api/drivers/available — eligible for trip assignment
// (Suspended / Off Duty / On Trip / license-expired drivers excluded)
router.get('/available', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT * FROM drivers
     WHERE status = 'Available' AND license_expiry_date >= CURRENT_DATE
     ORDER BY name ASC`
  );
  res.json(result.rows);
}));
 
// GET /api/drivers/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT *, (license_expiry_date < CURRENT_DATE) AS license_expired
     FROM drivers WHERE id = $1`,
    [req.params.id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
  res.json(result.rows[0]);
}));
 
// POST /api/drivers — Safety Officer only
// (Driver profile / compliance data is Safety Officer's domain, not Fleet Manager's)
router.post('/', authorize(ROLES.SAFETY_OFFICER), asyncHandler(async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, status } = req.body;
 
  if (!name || !license_number || !license_expiry_date) {
    return res.status(400).json({ message: 'name, license_number and license_expiry_date are required' });
  }
  if (status && !DRIVER_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${DRIVER_STATUSES.join(', ')}` });
  }
 
  const existing = await pool.query('SELECT id FROM drivers WHERE license_number = $1', [license_number]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'License number already exists' });
  }
 
  const result = await pool.query(
    `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, status)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,'Available')) RETURNING *`,
    [name, license_number, license_category || null, license_expiry_date, contact_number || null, status || null]
  );
  res.status(201).json(result.rows[0]);
}));
 
// PATCH /api/drivers/:id — Safety Officer only
router.patch('/:id', authorize(ROLES.SAFETY_OFFICER), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const fields = req.body;
 
  if (fields.status && !DRIVER_STATUSES.includes(fields.status)) {
    return res.status(400).json({ message: `status must be one of: ${DRIVER_STATUSES.join(', ')}` });
  }
 
  // Never let someone flip a driver to On Trip manually — that's derived
  // exclusively from dispatch/complete/cancel trip actions.
  if (fields.status === 'On Trip') {
    return res.status(400).json({ message: '"On Trip" status is set automatically by trip dispatch, not editable directly' });
  }
 
  if (fields.license_number) {
    const dup = await pool.query(
      'SELECT id FROM drivers WHERE license_number = $1 AND id != $2',
      [fields.license_number, id]
    );
    if (dup.rows.length > 0) {
      return res.status(409).json({ message: 'License number already exists' });
    }
  }
 
  const built = buildUpdateClause(fields, ALLOWED_UPDATE_COLUMNS);
  if (!built) return res.status(400).json({ message: 'No valid fields to update' });
 
  const result = await pool.query(
    `UPDATE drivers SET ${built.setClause} WHERE id = $${built.keys.length + 1} RETURNING *`,
    [...built.values, id]
  );
  if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
  res.json(result.rows[0]);
}));
 
// DELETE /api/drivers/:id — Safety Officer only
router.delete('/:id', authorize(ROLES.SAFETY_OFFICER), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inUse = await pool.query('SELECT id FROM trips WHERE driver_id = $1 LIMIT 1', [id]);
  if (inUse.rows.length > 0) {
    return res.status(400).json({ message: 'Driver has trip history and cannot be deleted; suspend instead' });
  }
  const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) return res.status(404).json({ message: 'Driver not found' });
  res.json({ message: 'Driver deleted' });
}));
 
module.exports = router;