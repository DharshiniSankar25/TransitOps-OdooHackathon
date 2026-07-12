-- =====================================================================
-- TransitOps — PostgreSQL schema
-- Run this once against your already-created "TransitOps" database:
--   psql -U postgres -d TransitOps -f schema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- USERS  (authentication + RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(150) UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  role           VARCHAR(30) NOT NULL CHECK (
                    role IN ('Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst')
                 ),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- VEHICLES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
  id                   SERIAL PRIMARY KEY,
  registration_number  VARCHAR(50) UNIQUE NOT NULL,
  name                 VARCHAR(150) NOT NULL,      -- Vehicle Name / Model
  type                 VARCHAR(50) NOT NULL,       -- Truck, Van, Bike, etc.
  max_load_capacity    NUMERIC(10,2) NOT NULL CHECK (max_load_capacity > 0),
  odometer             NUMERIC(12,2) NOT NULL DEFAULT 0,
  acquisition_cost     NUMERIC(14,2) NOT NULL DEFAULT 0,
  region               VARCHAR(100),
  status               VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (
                          status IN ('Available', 'On Trip', 'In Shop', 'Retired')
                       ),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- DRIVERS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS drivers (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(150) NOT NULL,
  license_number        VARCHAR(50) UNIQUE NOT NULL,
  license_category      VARCHAR(20),
  license_expiry_date   DATE NOT NULL,
  contact_number        VARCHAR(20),
  safety_score          NUMERIC(5,2) NOT NULL DEFAULT 100,
  status                VARCHAR(20) NOT NULL DEFAULT 'Available' CHECK (
                           status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')
                        ),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- TRIPS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id                SERIAL PRIMARY KEY,
  source            VARCHAR(150) NOT NULL,
  destination       VARCHAR(150) NOT NULL,
  vehicle_id        INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id         INTEGER NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  cargo_weight      NUMERIC(10,2) NOT NULL CHECK (cargo_weight > 0),
  planned_distance  NUMERIC(10,2),
  actual_distance   NUMERIC(10,2),
  fuel_consumed     NUMERIC(10,2),
  status            VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (
                       status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')
                    ),
  created_by        INTEGER REFERENCES users(id),
  dispatched_at     TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);

-- ---------------------------------------------------------------------
-- MAINTENANCE LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id           SERIAL PRIMARY KEY,
  vehicle_id   INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  cost         NUMERIC(12,2) NOT NULL DEFAULT 0,
  status       VARCHAR(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_logs(status);

-- ---------------------------------------------------------------------
-- FUEL LOGS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fuel_logs (
  id          SERIAL PRIMARY KEY,
  vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  liters      NUMERIC(10,2) NOT NULL CHECK (liters > 0),
  cost        NUMERIC(12,2) NOT NULL CHECK (cost >= 0),
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_logs(vehicle_id);

-- ---------------------------------------------------------------------
-- EXPENSES  (tolls, misc, etc. — maintenance/fuel tracked separately)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id            SERIAL PRIMARY KEY,
  vehicle_id    INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  type          VARCHAR(50) NOT NULL,   -- Toll, Parking, Fine, Other...
  amount        NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  expense_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON expenses(vehicle_id);

-- ---------------------------------------------------------------------
-- Auto-update `updated_at` on vehicles / drivers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON vehicles;
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_drivers_updated_at ON drivers;
CREATE TRIGGER trg_drivers_updated_at
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
