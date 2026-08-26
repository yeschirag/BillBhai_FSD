# BillBhai - Full-Stack Order and Billing System

BillBhai is a full-stack billing, inventory, delivery, and operations web application built with **React 19**, **Express 5**, and **PostgreSQL**.

For detailed task documentation, port troubleshooting, and developer guides, see [TASK_GUIDE.md](./TASK_GUIDE.md).

---

## Getting Started

### 0. Backend prerequisites (one-time)

The API persists to PostgreSQL. See [back-end/README.md](./back-end/README.md) for the
full setup guide — in short: install PostgreSQL, create a `billbhai` database,
copy `back-end/.env.example` to `back-end/.env`, then run:

```bash
cd back-end && npm install && npm run db:setup
```

### 1. Run full-stack dev server (Backend + Frontend):
```bash
npm run dev
```
- **React Frontend**: [http://localhost:5173](http://localhost:5173)
- **Express Backend API**: [http://localhost:3000/api](http://localhost:3000/api)

### 2. If port 3000 is blocked (`EADDRINUSE`):
```bash
npx kill-port 3000
```
Then run `npm run dev` again.

---

## Folder Structure

- `back-end/` - Express REST API Server (Port 3000) + PostgreSQL schema/migrations
- `front-end/` - React 19 + Vite Frontend SPA (Port 5173)
- `package.json` - Root dev runner (`npm run dev`, `npm run build`)
- `TASK_GUIDE.md` - Complete task documentation and API guide

---

## Demo Credentials (All Actors)

| Actor | Role Label | Username | Password | Default Route |
|---|---|---|---|---|
| Super User | Super User | `chirag` | `chirag1234` | `/superuser` |
| Admin | Admin | `admin` | `admin123` | `/dashboard` |
| Cashier | Cashier | `cashier` | `cashier123` | `/cashier` |
| Inventory Manager | Inventory Manager | `inventorymanager` | `inventory123` | `/inventory` |
| Delivery Operations | Delivery Ops | `deliveryops` | `delivery123` | `/delivery` |
| Return Handler | Return Handler | `returnhandler` | `return123` | `/returns` |
| Customer | Customer | `customer` | `customer123` | `/cashier` |

**Login Email Aliases**: `chirag@billbhai.com`, `admin@billbhai.com`, `cashier@billbhai.com`, `inventory@billbhai.com`, `delivery@billbhai.com`, `returns@billbhai.com`, `customer@billbhai.com`.
