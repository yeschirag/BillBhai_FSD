# BillBhai - Developer Migration & Bug Fixing Guide

> **Internal Engineering Handbook**: Step-by-Step Security Remediation, Bug Fixing, Architecture Refactoring, and NestJS to Express + React Migration Roadmap.

---

## Table of Contents
1. [Executive Summary & Current State Audit](#1-executive-summary--current-state-audit)
2. [Critical Bugs & Security Vulnerabilities Audit](#2-critical-bugs--security-vulnerabilities-audit)
3. [Phase 1: Security Hardening & Bug Fixes](#3-phase-1-security-hardening--bug-fixes)
4. [Phase 2: Database Persistence Integration (Prisma + PostgreSQL)](#4-phase-2-database-persistence-integration-prisma--postgresql)
5. [Phase 3: Migration from NestJS to Express.js Backend](#5-phase-3-migration-from-nestjs-to-expressjs-backend)
6. [Phase 4: React 19 Frontend Refactoring & Integration](#6-phase-4-react-19-frontend-refactoring--integration)
7. [Phase 5: Verification & Quality Assurance Checklist](#7-phase-5-verification--quality-assurance-checklist)

---

## 1. Executive Summary & Current State Audit

### Current Stack Overview
- **Frontend**: React 19 + Vite SPA (`front-end/`), custom layout with CSS modules, `httpClient.js` fetch wrapper, `AuthContext` for local authentication state.
- **Backend**: NestJS REST API server (`back-end/`), TypeScript, REST controllers, custom `RolesGuard` intercepting requests via an unverified `x-role` HTTP header.
- **Database / Data Persistence**: In-memory seed arrays (`seed-data.ts`), fallback to browser `localStorage` when backend operations fail or restart.

### Key Architectural Deficiencies
1. **Insecure Authorization**: Authentication relies on client-provided `x-role` header flags without cryptographic signature verification (JWT or session token).
2. **Data Volatility**: Server state resides in Node process memory; restarting the server wipes all mutations (orders created, inventory adjusted, products added).
3. **Lack of Input Sanitization & DTO Pipe Enforcement**: Incoming request payloads are not validated strictly against schemas in all endpoints.
4. **Front-end / Back-end State Desynchronization**: React client state falls back to local storage silently, masking API failures from the end user.

---

## 2. Critical Bugs & Security Vulnerabilities Audit

### Bug #1: Header-Based RBAC Bypassing (Critical Security Vulnerability)
- **Location**: `back-end/src/common/guards/roles.guard.ts`
- **Issue**:
  ```typescript
  const headerValue = request.headers['x-role'];
  ```
  Any HTTP client can send `x-role: superuser` or `x-role: admin` in request headers to bypass backend access control completely.
- **Impact**: Full system compromise, unauthorized price manipulation, deletion of business tenants, unauthorized refund approvals.
- **Fix**: Replace `x-role` header checking with JWT Bearer Token verification via secret key signing.

### Bug #2: In-Memory Data Loss on Backend Restart
- **Location**: `back-end/src/common/seed/seed-data.ts`
- **Issue**: Orders, products, and user mutations modify JavaScript arrays in process memory (`this.orders.push(newOrder)`).
- **Impact**: Server restart or deployment resets all operational data to initial seed state.
- **Fix**: Implement Prisma ORM with PostgreSQL database persistence.

### Bug #3: Frontend AbortController Race Conditions on Rapid Search
- **Location**: `front-end/src/pages/CashierPage.jsx` & `front-end/src/api/httpClient.js`
- **Issue**: Rapid typing in product search fires concurrent `fetch()` requests without canceling previous pending requests, causing out-of-order state overwrites.
- **Fix**: Implement proper debouncing (300ms) and request cancellation using `AbortController` in custom React hooks.

### Bug #4: Unhandled Floating Point Rounding in Financial Calculations
- **Location**: `back-end/src/modules/orders/orders.service.ts` & `front-end/src/pages/CashierPage.jsx`
- **Issue**: Monetary amounts use standard JS `Number` arithmetic (e.g. `0.1 + 0.2 = 0.30000000000000004`), leading to fractional cent discrepancy in tax & total calculations.
- **Fix**: Store and compute all currency values in integer cents (`subtotalCents`, `taxCents`, `totalCents`) or use `decimal.js`.

### Bug #5: Memory Leak in Chart.js Instances on Tab Navigation
- **Location**: `front-end/src/pages/DashboardPage.jsx` & `ReportsPage.jsx`
- **Issue**: Re-rendering dashboard charts without explicitly destroying previous Chart.js instances creates canvas memory leaks.
- **Fix**: Wrap chart instances in `useEffect` cleanup return functions or use `react-chartjs-2` clean ref bindings.

---

## 3. Phase 1: Security Hardening & Bug Fixes

### 1.1 Implement JWT Authentication & Password Hashing

#### Install Dependencies
```bash
cd back-end
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

#### JWT Utility Implementation (`src/common/utils/jwt.util.ts`)
```typescript
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'billbhai-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = '8h';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  companyId?: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
```

#### Authenticated User Guard (`src/common/guards/auth.guard.ts`)
```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { verifyToken } from '../utils/jwt.util';

@Injectable()
export class AuthJwtGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header token');
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyToken(token);
      request.user = decoded; // Attach authenticated user to request context

      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      const userRole = decoded.role.toLowerCase().replace(/\s+/g, '');
      const allowedRoles = requiredRoles.map((r) => r.toLowerCase().replace(/\s+/g, ''));

      if (!allowedRoles.includes(userRole)) {
        throw new ForbiddenException(`Access denied for role: ${decoded.role}`);
      }

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
```

---

## 4. Phase 2: Database Persistence Integration (Prisma + PostgreSQL)

### 2.1 Prisma Schema Setup (`prisma/schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPERUSER
  ADMIN
  CASHIER
  INVENTORY_MANAGER
  DELIVERY_OPS
  RETURN_HANDLER
  CUSTOMER
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
  REFUNDED
}

model Company {
  id        String    @id @default(uuid())
  name      String
  plan      String    @default("Standard")
  status    String    @default("Active")
  createdAt DateTime  @default(now())
  users     User[]
  products  Product[]
  orders    Order[]
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String
  role      Role     @default(CASHIER)
  companyId String?
  company   Company? @relation(fields: [companyId], references: [id])
  createdAt DateTime @default(now())
}

model Product {
  id          String   @id @default(uuid())
  sku         String   @unique
  name        String
  category    String
  priceCents  Int
  stock       Int
  reorderPoint Int     @default(10)
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  createdAt   DateTime @default(now())
}

model Order {
  id           String      @id @default(uuid())
  orderNo      String      @unique
  customerName String
  subtotalCents Int
  taxCents     Int
  totalCents   Int
  status       OrderStatus @default(PENDING)
  companyId    String
  company      Company     @relation(fields: [companyId], references: [id])
  createdAt    DateTime    @default(now())
}
```

---

## 5. Phase 3: Migration from NestJS to Express.js Backend

### Why Migrate to Express?
- **Lightweight Overhead**: Reduces process startup time from ~1.8s (NestJS DI bootstrap) to ~120ms (Express).
- **Lower Memory Footprint**: Decreases idle RAM consumption from ~120MB to ~30MB, optimizing serverless deployment cost.
- **Unopinionated Control**: Direct access to middleware stack without complex decorator/provider overhead.

### 5.1 Express Project Directory Structure (`express-backend/`)
```text
express-backend/
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── database.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── error.js
│   │   ├── rateLimiter.js
│   │   └── logger.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   ├── productController.js
│   │   └── reportController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── productRoutes.js
│   │   └── index.js
│   ├── services/
│   │   ├── orderService.js
│   │   └── productService.js
│   └── app.js
├── package.json
└── server.js
```

### 5.2 Express App Setup (`src/app.js`)
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { errorHandler } = require('./middleware/error');

const app = express();

// Core Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
```

### 5.3 Express Authorization Middleware (`src/middleware/auth.js`)
```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'billbhai-secret-key';

function authenticateJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User unauthenticated' });
    }
    const userRole = String(req.user.role).toLowerCase().replace(/\s+/g, '');
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase().replace(/\s+/g, ''));

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ success: false, message: `Access denied for role: ${req.user.role}` });
    }
    next();
  };
}

module.exports = { authenticateJwt, authorizeRoles };
```

### 5.4 Order Controller in Express (`src/controllers/orderController.js`)
```javascript
const orderService = require('../services/orderService');

async function getOrders(req, res, next) {
  try {
    const { companyId, status, page, limit } = req.query;
    const orders = await orderService.listOrders({ companyId, status, page, limit });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  try {
    const newOrder = await orderService.createOrder(req.body, req.user);
    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOrders, createOrder };
```

### 5.5 Express Order Routes (`src/routes/orderRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const { authenticateJwt, authorizeRoles } = require('../middleware/auth');
const { getOrders, createOrder } = require('../controllers/orderController');

router.use(authenticateJwt);

router.get('/', authorizeRoles('superuser', 'admin', 'cashier', 'returnhandler'), getOrders);
router.post('/', authorizeRoles('superuser', 'admin', 'cashier', 'customer'), createOrder);

module.exports = router;
```

---

## 6. Phase 4: React 19 Frontend Refactoring & Integration

### 6.1 Refactored HTTP Client (`front-end/src/api/httpClient.js`)
```javascript
import { apiConfig } from './config.js';

export async function request(path, options = {}) {
  const token = localStorage.getItem('authToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(`${apiConfig.baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
      return { ok: false, status: response.status, error: data.message || 'API Request Failed' };
    }
    return { ok: true, status: response.status, data: data.data || data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message || 'Network connectivity error' };
  }
}
```

---

## 7. Phase 5: Verification & Quality Assurance Checklist

| Module | Verification Step | Command / Test | Expected Outcome |
|---|---|---|---|
| **Security** | Header Spoofing Test | `curl -H "x-role: superuser" http://localhost:3000/api/orders` | HTTP 401 Unauthorized |
| **Auth** | JWT Generation & Login | `POST /api/auth/login` | Returns signed JWT bearer token |
| **Express Backend** | Server Bootstrap | `node server.js` | Express app listens on port 3000 in <150ms |
| **Database** | Order Persistence | `POST /api/orders` then restart process | Data persists across server restarts |
| **React Frontend** | POS Cashier Checkout | Add items to cart & click Checkout | Orders created, bill printed, cart cleared |
| **Build System** | Production Bundle | `npm run build` | Zero TypeScript/Vite bundling errors |

---
*End of Developer Guide.*
