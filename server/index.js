const tripRoutes = require('./routes/trips');
const fuelRoutes = require('./routes/fuel');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');

app.use('/api/trips', tripRoutes);
app.use('/api/fuel-logs', fuelRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);