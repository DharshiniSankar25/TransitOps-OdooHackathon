# TransitOps Backend — Setup

## What was broken
`db.js` existed as an **empty file** right next to a `db/index.js` folder.
Node resolves `require('../db')` to the `.js` file before ever looking
inside a `db/` directory, so every single route was silently getting
`pool = undefined` and throwing on the first query. That's fixed — there's
now one `db.js` that owns the Postgres pool.

## 1. Install dependencies
```bash
cd server
npm install
```
(`bcrypt`, `jsonwebtoken`, `pg`, `cors`, `dotenv`, `express` are already in
`package.json` — nothing new to add.)

## 2. Configure `.env`
Already present, just confirm it matches your local Postgres:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/TransitOps
JWT_SECRET=transitops_secret_key_123
PORT=5000
CLIENT_URL=http://localhost:5173
```
Change `JWT_SECRET` to something random for anything beyond local dev.

## 3. Create the schema
Your database already exists — this just creates the tables:
```bash
psql -U postgres -d TransitOps -f schema.sql
```

## 4. Seed default login users (optional but recommended)
```bash
node seed.js
```
Creates one user per role, all with password `Password123!`:
- fleet@transitops.com     → Fleet Manager
- driver@transitops.com    → Driver
- safety@transitops.com    → Safety Officer
- finance@transitops.com   → Financial Analyst

## 5. Run it
```bash
npm run dev
```
You should see:
```
🚚 TransitOps server running on port 5000
✅ Database connected at ...
```
If you see `❌ Database connection FAILED`, your `DATABASE_URL` or Postgres
service is the problem, not the code.

## Quick sanity checks
```bash
curl http://localhost:5000/health
# {"status":"ok","db":"connected"}

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fleet@transitops.com","password":"Password123!"}'
# -> { "token": "...", "user": {...} }

curl http://localhost:5000/api/vehicles \
  -H "Authorization: Bearer <token from above>"
```

## API surface

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | — | role must be one of the 4 valid roles |
| POST | /api/auth/login | — | returns JWT + user |
| GET  | /api/auth/me | any | current user from token |
| GET  | /api/vehicles | any | `?type=&status=&region=&search=` |
| GET  | /api/vehicles/available | any | only `Available` vehicles (for trip dropdowns) |
| POST/PATCH/DELETE | /api/vehicles | Fleet Manager | |
| PATCH | /api/vehicles/:id/retire | Fleet Manager | |
| GET  | /api/drivers | any | `?status=&search=`, includes `license_expired` flag |
| GET  | /api/drivers/available | any | Available + license not expired |
| POST/PATCH/DELETE | /api/drivers | Fleet Manager, Safety Officer | |
| GET  | /api/trips | any | `?status=` |
| POST | /api/trips | Driver, Fleet Manager | validates cargo vs capacity |
| PATCH | /api/trips/:id/dispatch | Driver, Fleet Manager | transactional row locks |
| PATCH | /api/trips/:id/complete | Driver, Fleet Manager | |
| PATCH | /api/trips/:id/cancel | Driver, Fleet Manager | |
| GET/POST | /api/maintenance | Fleet Manager (POST) | opening sets vehicle → In Shop |
| PATCH | /api/maintenance/:id/close | Fleet Manager | restores vehicle unless Retired |
| GET/POST | /api/fuel-logs | Fleet Manager, Driver, Financial Analyst (POST) | |
| GET/POST | /api/expenses | Fleet Manager, Financial Analyst (POST) | |
| GET | /api/dashboard/kpis | any | `?type=&status=&region=` |
| GET | /api/reports/analytics | Fleet Manager, Financial Analyst | fuel efficiency, cost, ROI |
| GET | /api/reports/analytics/export | Fleet Manager, Financial Analyst | same, as CSV download |
| GET | /api/reports/fleet-utilization | Fleet Manager, Financial Analyst | |

All routes except `/api/auth/*` and `/`  `/health` require
`Authorization: Bearer <token>`.

## Business rules enforced server-side
- Registration numbers and license numbers are unique (DB constraint + explicit check → clean 409).
- Retired / In Shop vehicles never appear in `/api/vehicles/available`, and dispatch re-validates status inside a DB transaction with row locks (`FOR UPDATE`) so two simultaneous dispatch requests can't both grab the same vehicle/driver.
- Suspended drivers or expired licenses are rejected at dispatch time, not just at trip-creation time.
- Cargo weight vs. max load capacity is checked both at trip creation and again at dispatch (in case the vehicle record changed in between).
- Dispatch → vehicle & driver flip to `On Trip`; Complete → both flip back to `Available` (+ odometer bump); Cancel → restores both only if the trip had actually been `Dispatched`.
- Creating maintenance flips the vehicle to `In Shop`; refuses if the vehicle is already `On Trip`, `Retired`, or already has an open maintenance record. Closing restores to `Available` unless the vehicle was retired in the meantime.
- `status` can never be set to `On Trip` via a manual PATCH — it's only ever set by the trip-dispatch flow.
