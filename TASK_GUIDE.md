# BillBhai Full-Stack Development & Task Guide

Welcome to the **BillBhai FSD** repository. This document serves as a complete reference for running, understanding, and extending the full-stack order, billing, and retail management application.

---

## 1. Quick Start Guide

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Setup
Run from the root directory (`BillBhai_FSD`):

```bash
# Install root orchestration dependencies
npm install

# Install backend dependencies
cd back-end && npm install && cd ..

# Install frontend dependencies
cd front-end && npm install && cd ..
```

### Running the Application

To start **both** the NestJS Backend and React Frontend concurrently:

```bash
npm run dev
```

- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **NestJS Backend API**: [http://localhost:3000/api](http://localhost:3000/api)
- **Swagger API Docs**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 2. Port Conflict Troubleshooting (`EADDRINUSE: 3000`)

If you see an error like:
```text
Error: listen EADDRINUSE: address already in use :::3000
```

This means another Node process or previous dev server is still bound to port 3000.

### Solution:

#### Option 1: Kill port using `npx` (Easiest)
```bash
npx kill-port 3000
```

#### Option 2: Kill port using terminal commands (macOS/Linux)
```bash
lsof -ti:3000 | xargs kill -9
```

Then re-run `npm run dev`.

---

## 3. Available Scripts

| Script | Location | Description |
|---|---|---|
| `npm run dev` | Root | Starts NestJS backend + React frontend concurrently |
| `npm run build` | Root | Builds both backend and frontend for production |
| `npm run dev:backend` | Root | Starts NestJS backend in watch mode (`http://localhost:3000`) |
| `npm run dev:frontend` | Root | Starts Vite React frontend (`http://localhost:5173`) |
| `npm run build:backend` | Root | Compiles TypeScript NestJS backend to `dist/` |
| `npm run build:frontend` | Root | Bundles React app using Vite to `front-end/dist/` |

---

## 4. Project Architecture & Directory Structure

```text
BillBhai_FSD/
├── package.json              # Root orchestration package (runs dev & build)
├── TASK_GUIDE.md             # Task documentation & developer guide
├── README.md                 # Project overview & demo credentials
├── back-end/                 # NestJS REST API Backend
│   ├── src/
│   │   ├── main.ts           # Server entry point & CORS configuration
│   │   ├── app.module.ts     # Main NestJS module
│   │   ├── common/
│   │   │   ├── guards/       # RolesGuard (RBAC checking x-role header)
│   │   │   └── seed/         # Initial seed dataset
│   │   └── modules/          # Feature modules (Auth, Orders, Products, etc.)
│   └── package.json
└── front-end/                # React 19 + Vite Frontend Application
    ├── index.html            # Main SPA HTML template
    ├── public/               # Logos, icons, legacy stylesheets
    ├── src/
    │   ├── main.jsx          # React app entry point
    │   ├── App.jsx           # App routing & protected routes
    │   ├── api/              # HTTP client & remote provider
    │   │   ├── config.js     # API mode config (remote/local)
    │   │   ├── httpClient.js # Fetch wrapper auto-injecting x-role header
    │   │   └── providers/    # remoteProvider.js (NestJS REST bindings)
    │   ├── components/       # AppLayout, ProtectedRoute
    │   ├── context/          # AuthContext & useAuth hook
    │   ├── pages/            # 13 Full React page views
    │   └── services/         # authService, workspaceService, dataService
    └── package.json
```

---

## 5. Demo Login Credentials & Role Routing

| Role | Username | Password | Default Route | Scoped Access Level |
|---|---|---|---|---|
| **Super User** | `chirag` | `chirag1234` | `/superuser` | Platform tenant overview & system-wide businesses |
| **Admin** | `admin` | `admin123` | `/dashboard` | Business operations, team, revenue & report analytics |
| **Cashier** | `cashier` | `cashier123` | `/cashier` | POS terminal, checkout, promo validation, customer lookup |
| **Inventory Manager** | `inventorymanager` | `inventory123` | `/inventory` | Stock tracking, low stock alerts, product catalog management |
| **Delivery Ops** | `deliveryops` | `delivery123` | `/delivery` | Order dispatch, delivery status tracking, courier assignment |
| **Return Handler** | `returnhandler` | `return123` | `/returns` | Return request approval/rejection, refund tracking |
| **Customer** | `customer` | `customer123` | `/cashier` | Self-service checkout terminal |

> **Login Aliases Supported**: `chirag@billbhai.com`, `admin@billbhai.com`, `cashier@billbhai.com`, `inventory@billbhai.com`, `delivery@billbhai.com`, `returns@billbhai.com`, `customer@billbhai.com`.

---

## 6. Full Task Checklist & Implementation Details

- [x] **NestJS Backend Setup**:
  - Integrated 11 REST controllers from `44_BillBhai` into `back-end`.
  - Configured `RolesGuard` interceptor requiring `x-role` HTTP header.
  - CORS configured to allow requests from `http://localhost:5173`.
- [x] **React Frontend Migration**:
  - Migrated SPA into `front-end` clean structure.
  - Implemented 13 complete pages: `LoginPage`, `DashboardPage`, `OrdersPage`, `InventoryPage`, `DeliveryPage`, `ReturnsPage`, `ReportsPage`, `UsersPage`, `NotificationsPage`, `ProfilePage`, `CashierPage`, `SuperuserPage`, `BusinessesPage`.
- [x] **API Client & Role Authorization**:
  - Configured `httpClient.js` to automatically extract the user's active session role and pass the `x-role` header with every request.
  - Implemented `remoteProvider.js` with full methods matching NestJS endpoints.
- [x] **POS Cashier Module**:
  - Built interactive cashier terminal with category filtering, live product search, cart quantity controls, promo validation, customer lookup, and order placement.
- [x] **Tenant & Business Management**:
  - Built Superuser portal for business portfolio management, store locations, subscription plans, and user assignments.
- [x] **Build & Verification**:
  - Clean `npm run build` producing zero build or compilation errors.

---

## 7. Backend API Reference Summary

| Module | Endpoint | Methods | Roles Allowed |
|---|---|---|---|
| **Auth** | `/api/auth/login` | `POST` | Public |
| **Companies** | `/api/companies` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin` |
| **Users** | `/api/users` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin` |
| **Customers** | `/api/customers` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin`, `cashier`, `customer` |
| **Products** | `/api/products` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin`, `cashier`, `inventorymanager` |
| **Inventory** | `/api/inventory` | `GET`, `PUT`, `POST` (adjust) | `superuser`, `admin`, `inventorymanager`, `cashier` |
| **Orders** | `/api/orders` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin`, `cashier`, `returnhandler` |
| **Bills** | `/api/orders/bills` | `GET`, `POST` | `superuser`, `admin`, `cashier` |
| **Payments** | `/api/orders/payments` | `GET`, `POST` | `superuser`, `admin`, `cashier` |
| **Deliveries** | `/api/deliveries` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin`, `deliveryops` |
| **Returns** | `/api/returns` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin`, `returnhandler` |
| **Reports** | `/api/reports/*` | `GET` | `superuser`, `admin`, `inventorymanager`, `returnhandler` |
| **Suppliers** | `/api/suppliers` | `GET`, `POST`, `PUT`, `DELETE` | `superuser`, `admin`, `inventorymanager` |

---

## 8. Future Roadmap & Extension Notes

If you want to extend this project further in the future:
1. **Persistent Database**: Connect NestJS TypeORM/Prisma to a PostgreSQL or MongoDB database instead of in-memory seed data.
2. **JWT Authentication**: Upgrade `x-role` header to standard JWT Bearer token authentication in NestJS Passport strategy.
3. **WebSockets**: Add Socket.io or NestJS Gateways for real-time order notifications across cashier and delivery terminals.
