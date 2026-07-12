TransitOps – Smart Fleet & Transport Management System

Overview
TransitOps is a full-stack fleet and transport management platform developed for the Odoo Hackathon. It helps organizations efficiently manage vehicles, drivers, trips, maintenance, fuel consumption, and operational expenses through a centralized dashboard.
The system improves fleet visibility, optimizes resource allocation, and ensures safe and cost-effective transportation operations.

Features
🔐Authentication & Role-Based Access
Secure user authentication using JWT
Password hashing with bcrypt
Multiple user roles:
Fleet Manager
Driver
Safety Officer
Financial Analyst
🚛 Vehicle Management
Add, edit, and delete vehicles
Track vehicle availability
Vehicle status management
Capacity and odometer tracking
👨‍✈️ Driver Management
Driver registration
License management
Safety score monitoring
Driver availability tracking
📦 Trip Management
Create and assign trips
Vehicle and driver allocation
Cargo weight validation
Trip status updates
Distance and fuel tracking
🔧 Maintenance Management
Record maintenance activities
Track maintenance costs
Open and close maintenance requests
Automatically update vehicle availability
⛽ Fuel Management
Fuel log entries
Fuel cost tracking
Vehicle-wise fuel history
💰 Expense Management
Toll expenses
Parking charges
Fines
Miscellaneous operational expenses
📊 Dashboard
Fleet overview
Vehicle utilization
Driver availability
Maintenance statistics
Fuel and expense summaries
Tech Stack
Frontend
React.js
Vite
Tailwind CSS
React Router
Axios
Backend
Node.js
Express.js
JWT Authentication
bcrypt
Database
PostgreSQL
Version Control
Git
GitHub
Project Structure
TransitOps-OdooHackathon
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── db.js
│   ├── seed.js
│   ├── schema.sql
│   ├── .env
│   └── package.json
│
└── README.md
Installation
Clone the repository
git clone https://github.com/DharshiniSankar25/TransitOps-OdooHackathon.git
cd TransitOps-OdooHackathon
Backend Setup

Navigate to the server directory:

cd server

Install dependencies:

npm install

Create a .env file:

PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=TransitOps
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

Create the database schema using schema.sql.

Seed the default users:

node seed.js

Run the backend:

npm run dev
Frontend Setup

Navigate to the client directory:

cd client

Install dependencies:

npm install

Run the frontend:

npm run dev

Open:

http://localhost:5173
Default Login Credentials
Role	Email	Password
Fleet Manager	fleet@transitops.com	Password123!
Driver	driver@transitops.com	Password123!
Safety Officer	safety@transitops.com	Password123!
Financial Analyst	finance@transitops.com	Password123!
Business Rules Implemented
Vehicle registration numbers must be unique.
Cargo weight cannot exceed vehicle capacity.
Vehicles under maintenance cannot be assigned to trips.
Drivers assigned to active trips cannot be reassigned.
Vehicle status updates automatically based on trip and maintenance status.
Driver status updates automatically during trip assignments.
Future Enhancements
GPS-based live vehicle tracking
Predictive maintenance using AI
Fuel efficiency analytics
Route optimization
Mobile application support
Automated notifications and alerts
Team

Developed for the Odoo Hackathon

Team Members

Dharshini Sankar
Team Member
