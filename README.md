# StockPilot – Smart Warehouse Order Fulfilment & Tracking System

[![CI Pipeline](https://github.com/stockpilot/stockpilot/actions/workflows/ci.yml/badge.svg)](https://github.com/stockpilot/stockpilot)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react)](https://react.dev/)
[![Flask](https://img.shields.io/badge/Backend-Python_Flask-000000?logo=flask)](https://flask.palletsprojects.com/)
[![TailwindCSS](https://img.shields.io/badge/UI-TailwindCSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

StockPilot is a modern, responsive, full-stack Warehouse Order Fulfilment and Inventory Tracking platform engineered to replace paper-based and manual warehouse operations with a centralized digital system. It provides real-time end-to-end visibility across the entire warehouse pipeline: **Order Intake → Picking → Packing → Dispatch → Delivery Tracking**.

---

## 📑 Table of Contents
- [1. System Architecture & Tech Stack](#1-system-architecture--tech-stack)
- [2. User Roles & Access Control](#2-user-roles--access-control)
- [3. Demo Credentials](#3-demo-credentials)
- [4. Order Lifecycle & Status Transitions](#4-order-lifecycle--status-transitions)
- [5. Core Features & Functional Modules](#5-core-features--functional-modules)
- [6. Project Structure](#6-project-structure)
- [7. Local Development Setup](#7-local-development-setup)
- [8. Running with Docker & Docker Compose](#8-running-with-docker--docker-compose)
- [9. Automated Testing](#9-automated-testing)
- [10. Production Deployment (Vercel & Render)](#10-production-deployment-vercel--render)
- [11. API Endpoints Reference](#11-api-endpoints-reference)

---

## 1. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                   Vercel / Browser                     │
│  React 18 + Vite SPA  •  Tailwind CSS  •  Recharts     │
└───────────────────────────┬────────────────────────────┘
                            │ VITE_API_URL (REST JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Render / Container / Local               │
│          Flask REST API  •  JWT Authentication         │
│          SQLAlchemy ORM  •  Gunicorn / WSGI            │
└───────────────────────────┬────────────────────────────┘
                            │ SQL Connection
                            ▼
┌────────────────────────────────────────────────────────┐
│                     Database                           │
│     SQLite (Local Dev)  /  PostgreSQL (Production)     │
└────────────────────────────────────────────────────────┘
```

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, Vite, JavaScript | High-performance SPA with fast HMR |
| **Styling** | Tailwind CSS, Lucide React | Navy blue SaaS theme (`#0f1d30`), clean typography |
| **Analytics & Charts** | Recharts | Interactive fulfillment lines, donut charts, accuracy bars |
| **Routing & Network** | React Router v6, Axios | Protected routes, JWT request interceptor |
| **Backend** | Python 3.12, Flask 3.0 | RESTful API architecture with modular Blueprints |
| **ORM & Database** | SQLAlchemy 2.0, Flask-SQLAlchemy | Flexible connection: SQLite (local) or PostgreSQL (prod) |
| **Security & Auth** | PyJWT, Werkzeug Security | Secure password hashing, HS256 tokens, RBAC middleware |
| **DevOps & Containers**| Docker, Docker Compose, Nginx | Multi-stage frontend image, production Gunicorn backend |
| **CI/CD** | GitHub Actions | Automated parallel Pytest and Vitest test suites |

---

## 2. User Roles & Access Control

StockPilot implements granular Role-Based Access Control (RBAC) across four dedicated warehouse personas:

1. **Warehouse Manager (`manager`)**
   - Universal supervisory dashboard access.
   - Manage users, roles, and account statuses.
   - Inventory master control, product creation, stock adjustments, and bin assignments.
   - Create customer orders, set priorities, and assign pickers.
   - Comprehensive fulfillment analytics, cycle times, accuracy rates, and CSV exports.
   - Incident resolution for warehouse discrepancies.

2. **Warehouse Picker (`picker`)**
   - View assigned order pick lists and bin locations (e.g. `A-01-02`).
   - Manual product barcode validation (prevents picking wrong items).
   - Quantity verification against inventory stock.
   - Report missing or damaged goods directly from picking bins.
   - Live percentage progress bar for each order task.

3. **Packing Staff (`packer`)**
   - View orders with completed picking staged at the packing benches.
   - Verify product SKU, quantity, and physical condition.
   - Enforce mandatory 5-point safety and packing checklist before completing.
   - Record package dimensions (L × W × H cm), weight (kg), and packaging type.
   - Transition verified packages to the Dispatch Bay.

4. **Dispatch Executive (`dispatch`)**
   - View queue of sealed packages ready for courier handover.
   - Assign carriers (FedEx, DHL Express, UPS, BlueDart, USPS).
   - Generate unique tracking numbers and record dispatch timestamps.
   - Generate and print formatted Dispatch Summaries with barcode previews and signature slips.
   - Search dispatch history and confirm delivery completion.

---

## 3. Demo Credentials

The database is pre-seeded with realistic warehouse orders, products, and user accounts. You can also click the **quick-fill demo buttons** on the login screen:

| Role | Username | Password | Email | Access Scope |
|---|---|---|---|---|
| **Warehouse Manager** | `manager` | `Manager@123` | `manager@stockpilot.io` | Full System Access & Analytics |
| **Warehouse Picker** | `picker` | `Picker@123` | `picker@stockpilot.io` | Picking Tasks & Barcode Validation |
| **Packing Staff** | `packer` | `Packer@123` | `packer@stockpilot.io` | Packing Verification & Checklist |
| **Dispatch Executive** | `dispatch` | `Dispatch@123` | `dispatch@stockpilot.io` | Courier Handover & Dispatch Slips |

*Additional pre-seeded staff accounts for testing multi-worker analytics:*
- Picker 2: `picker2` / `Picker@123` (Elena Rostov)
- Packer 2: `packer2` / `Packer@123` (Thomas Miller)

---

## 4. Order Lifecycle & Status Transitions

StockPilot maintains timestamped history for all 12 operational lifecycle statuses:

```
[Order Created]
       │
       ▼ (Picker Assigned)
[Picking Pending]
       │
       ▼ (Picker Begins Scanning)
[Picking In Progress]
       │
       ▼ (All items verified & confirmed)
[Picking Completed] ──► [Packing Pending]
                              │
                              ▼ (Packer Begins Inspection)
                       [Packing In Progress]
                              │
                              ▼ (5-point checklist passed & weighed)
                       [Packing Completed] ──► [Ready for Dispatch]
                                                      │
                                                      ▼ (Courier assigned & tracking generated)
                                                 [Dispatched]
                                                      │
                                                      ▼ (Carrier delivery confirmation)
                                                 [Delivered]

* Any active order can be transitioned to [On Hold] and later [Resumed].
* Cancelling an order [Cancelled] automatically releases all reserved inventory back into available stock.
```

---

## 5. Core Features & Functional Modules

### 📊 1. Warehouse Management Dashboard
- **8 Real-time KPI Cards**: Total Orders, Pending Orders, Orders Being Picked, Orders Awaiting Packing, Orders Ready for Dispatch, Dispatched Orders, Picking Errors, Packing Errors.
- **Visual Analytics (Recharts)**: Daily order fulfillment trends, order status distribution pie chart, process accuracy bar graphs.
- **Alert Banners**: High-visibility alerts for delayed orders (>24 hours) and low-stock inventory warnings.
- **Live Feeds**: Recent orders table and chronological warehouse activity log.

### 📦 2. Order Management
- Order creation modal with dynamic multi-product line items.
- Live stock availability verification and automatic inventory reservation (`available_qty` deductions, `reserved_qty` allocations).
- Priority tagging: `LOW`, `NORMAL`, `HIGH`, `URGENT`.
- Detailed Order View: Complete stage progress tracker, customer delivery details, line item fulfillment states, and audit trail of all status changes.
- Supervisor actions: Assign/reassign pickers, place on hold, resume, or cancel.

### 🏷️ 3. Inventory & Bin Location Management
- Full product catalog with Name, SKU, Barcode, Category, Unit Price, Stock Levels, and Assigned Bins.
- **Barcode Validation**: Manual barcode search and instant validation against database records.
- Low-stock threshold alerts with color-coded warnings.
- Stock adjustment utility: Log `IN`, `OUT`, `ADJUST`, and `DAMAGE` stock adjustments with automatic `InventoryTransaction` audit logging.
- **Warehouse Bin Grid**: Visual storage layout categorized by zones (e.g. Zone A - High Velocity, Zone B - Apparel, Zone C - Hardware, Zone D - Fragile) displaying aisles, racks, shelves, capacity meters, and product counts.

### 📋 4. Dedicated Picking Interface
- Pickers view their assigned picking queue.
- Pick list displays required quantities and prominent **Bin Locations** (e.g. `BIN: A-01-02`).
- **Barcode Verification Step**: Pickers enter product barcode; system verifies against product SKU record before enabling quantity confirmation. Mismatches instantly trigger error logs.
- Quantity picker prevents over-picking beyond ordered limits.
- Flag discrepancies directly from bins (Missing Goods, Packaging Damage, Stock Shortage).
- Real-time task completion progress percentage bar.

### 📦 5. Dedicated Packing Dashboard
- Displays orders with completed picking staged at packing benches.
- Physical condition and SKU quantity verification for every line item.
- **Mandatory 5-Point Packing Checklist**:
  1. [x] Product quantity verified
  2. [x] Product condition verified
  3. [x] Correct order items confirmed
  4. [x] Packaging completed
  5. [x] Shipping label prepared
- Package specification inputs: Dimensions ($L \times W \times H$ cm), weight ($kg$), and package type (Standard Box, Fragile Padded, Envelope, Pallet).
- Enforces 100% checklist verification before order can be released to Dispatch.

### 🚚 6. Dispatch Management & Printable Slips
- Staging queue for all packed shipments.
- Courier carrier assignment (FedEx Express, DHL Express, UPS Worldwide, BlueDart, USPS).
- Tracking number generation and shipment cost recording.
- **Printable Dispatch Summary**: Modal and print-optimized view with warehouse header, tracking barcodes, customer delivery addresses, line items breakdown, total valuation, and executive signature lines.
- Carrier delivery confirmation tracking.

### 📈 7. Analytics & Reports
- Date range filtering: Today, Last 7 Days, Last 30 Days, All Time.
- **KPI Metrics Calculated from Real Database Records**:
  - Picking Accuracy: $\frac{\text{Correctly Picked Items}}{\text{Total Picked Items}} \times 100$
  - Packing Accuracy: $\frac{\text{Correctly Packed Items}}{\text{Total Packed Items}} \times 100$
  - Order Cycle Time: $\text{Dispatch Timestamp} - \text{Order Creation Timestamp}$ (in hours & minutes)
  - Average picking time and average packing time.
- Employee fulfillment leaderboard (pickers and packers completion rates).
- **Downloadable CSV Reports**:
  - `orders.csv` – Order history, customer details, valuations, and cycle times.
  - `inventory.csv` – Stock catalog, available/reserved counts, and bin locations.
  - `fulfillment.csv` – Picking task durations, picker names, and throughput.
  - `errors.csv` – Detailed incident reports, severities, and resolution notes.

### 🛡️ 8. Activity Logs & Error Monitoring
- Centralized audit trail recording all warehouse actions, user IDs, roles, descriptions, and IP addresses.
- Incident Resolution Desk: Filter unresolved warehouse discrepancies and record corrective action notes.

---

## 6. Project Structure

```
stockpilot/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI widgets (KPICard, StatusBadge, Modal, TopNav, Sidebar, etc.)
│   │   ├── context/            # AuthContext (JWT/RBAC) and ToastContext (alerts)
│   │   ├── layouts/            # MainLayout (responsive sidebar & top navigation)
│   │   ├── pages/              # 10 Role-based dashboard views
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── OrdersPage.jsx
│   │   │   ├── OrderDetailPage.jsx
│   │   │   ├── InventoryPage.jsx
│   │   │   ├── BinLocationsPage.jsx
│   │   │   ├── PickingPage.jsx
│   │   │   ├── PickingTaskPage.jsx
│   │   │   ├── PackingPage.jsx
│   │   │   ├── PackingTaskPage.jsx
│   │   │   ├── DispatchPage.jsx
│   │   │   ├── AnalyticsPage.jsx
│   │   │   ├── ActivityLogsPage.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── services/           # Axios API client (auth, orders, picking, packing, dispatch, etc.)
│   │   ├── tests/              # 7 Vitest frontend component test suites
│   │   ├── App.jsx             # React Router routing & ProtectedRoute
│   │   ├── index.css           # Tailwind CSS directives & theme utilities
│   │   ├── main.jsx            # Application entrypoint
│   │   └── setupTests.js       # Testing library DOM matchers
│   ├── Dockerfile              # Multi-stage production build (Node + Nginx)
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── middleware/         # auth.py (JWT verification & @require_roles decorator)
│   │   ├── models/             # 15 SQLAlchemy database models
│   │   │   ├── user.py         # User, Role
│   │   │   ├── product.py      # Product, InventoryTransaction
│   │   │   ├── bin_location.py # BinLocation
│   │   │   ├── order.py        # Order, OrderItem, OrderStatusHistory
│   │   │   ├── picking.py      # PickingTask, PickingItem
│   │   │   ├── packing.py      # PackingRecord, PackingItem
│   │   │   ├── dispatch.py     # DispatchRecord
│   │   │   └── activity.py     # ActivityLog, ErrorRecord
│   │   ├── routes/             # REST blueprints (auth, dashboard, orders, inventory, picking, etc.)
│   │   └── utils/              # logger.py, seed_data.py
│   ├── tests/                  # 8 Pytest backend test suites (17 tests)
│   ├── config.py               # Flexible database & environment configurations
│   ├── requirements.txt        # Backend dependencies
│   ├── run.py                  # API server startup & auto-seed runner
│   └── Dockerfile              # Production Python container (Gunicorn)
│
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI pipeline
│
├── docker-compose.yml          # Container orchestration (Frontend + Backend + Volume)
├── .dockerignore
├── .gitignore
├── .env.example
├── vercel.json                 # Vercel SPA rewrites configuration
└── README.md
```

---

## 7. Local Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/stockpilot.git
cd stockpilot
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the Flask server (auto-creates and seeds SQLite database on first run)
python run.py
```
*The backend API will start on `http://localhost:5000`.*

### 3. Frontend Setup
Open a new terminal:
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```
*Open `http://localhost:3000` in your browser. The Vite development proxy forwards all `/api` requests to `http://127.0.0.1:5000`.*

---

## 8. Running with Docker & Docker Compose

Run the entire full-stack system with a single command:

```bash
docker compose up --build
```

- **Frontend**: Available at `http://localhost:3000` (Served via optimized Nginx container with SPA routing fallback).
- **Backend**: Available at `http://localhost:5000` (Running multi-worker Gunicorn server).
- **Database Persistence**: SQLite database is persisted in a mounted Docker volume at `./backend/data`.

To stop the containers:
```bash
docker compose down
```

---

## 9. Automated Testing

### Backend Tests (Pytest)
Run the 17 unit and integration tests covering authentication, permissions, inventory updates, barcode checks, picking limits, packing checklists, dispatch flows, and analytics calculations:

```bash
cd backend
pytest tests -v
```

### Frontend Tests (Vitest)
Run the 12 frontend component tests covering login validation, dashboard KPIs, order lists, inventory catalogs, picking task lists, packing verification, and dispatch queues:

```bash
cd frontend
npm test
```

### Production Build Verification
Verify that the React frontend builds with zero errors:
```bash
cd frontend
npm run build
```

---

## 10. Production Deployment (Vercel & Render)

### Frontend on Vercel
1. Push your repository to GitHub.
2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Select the `stockpilot` repository.
4. Set **Root Directory** to `frontend`.
5. Under **Environment Variables**, add:
   ```env
   VITE_API_URL=https://your-stockpilot-backend.onrender.com
   ```
6. Click **Deploy**. Vercel will build the frontend using `vercel.json` for seamless client-side React Router navigation.

### Backend on Render (or Railway / Fly.io)
1. In [Render](https://render.com), create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure the service:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 run:app`
4. Set Environment Variables:
   ```env
   SECRET_KEY=generate-a-strong-random-secret
   JWT_SECRET=generate-a-strong-jwt-secret
   CORS_ORIGINS=https://your-stockpilot-frontend.vercel.app,http://localhost:3000
   DATABASE_URL=postgresql://user:password@host:5432/stockpilot_db
   ```
5. *(Optional Production Database)*: Attach a Render Managed PostgreSQL database and paste the Internal Database URL into `DATABASE_URL`. SQLAlchemy automatically handles PostgreSQL connection strings.

---

## 11. API Endpoints Reference

### Authentication
- `POST /api/auth/login` – Authenticate with username/email & password, receive JWT.
- `GET /api/auth/me` – Retrieve authenticated user profile and permissions.
- `POST /api/auth/register` – Register a new staff user.
- `PUT /api/auth/profile` – Update user profile.
- `POST /api/auth/change-password` – Update account password.

### Dashboard & Analytics
- `GET /api/dashboard/stats` – 8 KPI counts and accuracy percentages.
- `GET /api/dashboard/charts` – Daily fulfillment trends and status distribution.
- `GET /api/dashboard/recent-orders` – Recent order intake list.
- `GET /api/dashboard/delayed-orders` – Delayed orders notification queue (>24h).
- `GET /api/dashboard/low-stock-alerts` – Items below minimum threshold.
- `GET /api/analytics/summary?period={today|7d|30d|all}` – Cycle times, throughput, leaderboards.
- `GET /api/analytics/export/{orders|inventory|fulfillment|errors}` – Download operational CSV reports.

### Orders
- `GET /api/orders` – List orders with search, status, and priority filters.
- `POST /api/orders` – Create customer order with stock reservation.
- `GET /api/orders/:id` – Full order details with items, timeline, and history.
- `PUT /api/orders/:id` – Edit customer and order details.
- `POST /api/orders/:id/assign-picker` – Assign picker and create picking task.
- `POST /api/orders/:id/hold` – Put active order on hold.
- `POST /api/orders/:id/resume` – Resume held order back to workflow.
- `POST /api/orders/:id/cancel` – Cancel order and release reserved stock.

### Inventory & Bin Locations
- `GET /api/inventory/products` – Product list with category and stock filters.
- `POST /api/inventory/products` – Create new product with barcode and SKU.
- `PUT /api/inventory/products/:id` – Update product specifications.
- `DELETE /api/inventory/products/:id` – Remove product (if unreserved).
- `POST /api/inventory/products/:id/adjust-stock` – Adjust stock quantity and log transaction.
- `POST /api/inventory/lookup-barcode` – Find product by manual barcode entry.
- `GET /api/inventory/bin-locations` – List all warehouse bins with capacities.
- `POST /api/inventory/bin-locations` – Create new warehouse bin location.

### Picking Workflow
- `GET /api/picking/tasks` – List assigned picking tasks.
- `GET /api/picking/tasks/:id` – Task item details and bin locations.
- `POST /api/picking/tasks/:id/start` – Start picking execution.
- `POST /api/picking/tasks/:id/verify-barcode` – Validate barcode against item SKU.
- `POST /api/picking/tasks/:id/confirm-item` – Confirm picked quantity.
- `POST /api/picking/tasks/:id/report-error` – Log missing or damaged item.
- `POST /api/picking/tasks/:id/complete` – Complete picking and queue for packing.

### Packing Workflow
- `GET /api/packing/tasks` – List orders ready for packaging.
- `GET /api/packing/tasks/:id` – Packing inspection details.
- `POST /api/packing/tasks/:id/start` – Begin packing inspection.
- `POST /api/packing/tasks/:id/verify-item` – Verify line item condition.
- `PUT /api/packing/tasks/:id/checklist` – Update 5-point checklist state.
- `POST /api/packing/tasks/:id/report-error` – Report packaging or item defects.
- `POST /api/packing/tasks/:id/complete` – Enforce checklist, save dimensions/weight, stage for dispatch.

### Dispatch Workflow
- `GET /api/dispatch?tab={ready|history}` – Ready queue and dispatch history.
- `POST /api/dispatch/confirm` – Assign courier, record tracking number, confirm dispatch.
- `GET /api/dispatch/summary/:order_id` – Printable dispatch summary note.
- `POST /api/dispatch/:order_id/deliver` – Mark shipment as delivered.

### User Management & Audit
- `GET /api/users` – List staff users and roles.
- `POST /api/users` – Create employee account.
- `PUT /api/users/:id` – Update user details or active status.
- `GET /api/activity/logs` – Chronological warehouse activity audit trail.
- `GET /api/activity/errors` – Discrepancy incidents list.
- `POST /api/activity/errors/:id/resolve` – Resolve error incident with action notes.

---

## 12. Pushing to GitHub

To push this complete project to your GitHub repository:

```bash
# Initialize git (if not already initialized)
git init

# Add all project files
git add .

# Commit changes
git commit -m "Initial release of StockPilot: Full-stack Warehouse Management System"

# Link to your remote GitHub repository
git branch -M main
git remote add origin https://github.com/<your-username>/stockpilot.git

# Push to GitHub
git push -u origin main
```

---

## 13. License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
#   S T O C K P I L O T  
 