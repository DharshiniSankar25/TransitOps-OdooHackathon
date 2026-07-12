const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./db'); // ensures the pool + connection check run at boot

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => res.send('TransitOps API running'));

// Simple health check that also verifies the DB is reachable
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'unreachable', error: err.message });
  }
});

const authRoutes = require('./routes/auth');
const vehicleRoutes = require('./routes/vehicles');
const driverRoutes = require('./routes/drivers');
const maintenanceRoutes = require('./routes/maintenance');
const tripRoutes = require('./routes/trips');
const fuelRoutes = require('./routes/fuel');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');

app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/fuel-logs', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler — must come after all routes
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler — catches everything asyncHandler forwards,
// malformed JSON bodies, and Postgres errors (unique violation, FK violation, etc.)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON in request body' });
  }

  // Postgres error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
  if (err.code === '23505') {
    return res.status(409).json({ message: 'A record with that value already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referenced record does not exist (foreign key violation)' });
  }
  if (err.code === '23514') {
    return res.status(400).json({ message: 'Value violates a database constraint (check the allowed status/enum values)' });
  }

  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚚 TransitOps server running on port ${PORT}`));

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing pool...');
  await pool.end();
  process.exit(0);
});
