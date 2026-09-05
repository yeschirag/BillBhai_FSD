# Graph Report - BillBhai_FSD  (2026-09-05)

## Corpus Check
- 227 files · ~230,084 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1379 nodes · 2690 edges · 85 communities (77 shown, 4 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 132 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- UI Components
- Seed Data
- Test Infrastructure
- Inventory DTOs
- Product DTOs & Controller
- Backend Dependencies
- Supplier DTOs & Controller
- Customers Controller
- Deliveries Controller
- Companies Controller
- Bill & Order Services
- Frontend Dependencies
- Order & Bill Repositories
- Auth & Company Services
- Product Service
- Returns Controller
- TypeScript Config
- UI Primitives
- Customer Service
- Dev Dependencies
- Auth Controller Decorators
- NestJS Modules
- Returns Decorators
- Auth Context
- Workspace Helpers
- Database Pool & Transactions
- App Root Layout
- Express Router Setup
- Returns DTOs
- Reports Service
- Legacy App Controller
- JWT Guards
- NestJS Modules 2
- Reports Controller
- Express App Config
- Auth Service
- User DTOs
- Customer Repository
- API Providers
- Theme & Navigation
- Database Seeding
- Inventory Repository
- Product Repository
- Generic Service
- Order Delivery Service
- E2E Test Helpers
- User Repository
- Node Test Setup
- JWT Auth Service
- Community 49
- Config Utils
- Auth Middleware
- Company Repository
- Delivery Repository
- Read-Only Route Guard
- Billing Route Guard
- Supplier Service
- Delivery Service
- Returns Repository
- Supplier Repository
- Write Route Guard
- Read Route Guard
- Admin Route Guard
- User Route Guard
- TSConfig Exclude
- ESLint Config
- DB Migrations
- Error Handling
- Hold Repository
- Route Guard 2
- Route Guard 3
- Auth Seed Middleware
- NestJS TSConfig
- Auth Service Route
- Service Route
- Dashboard Data
- Test Seed Data
- Test Assertions
- Community 78
- Community 80
- Community 81

## God Nodes (most connected - your core abstractions)
1. `Roles()` - 72 edges
2. `notFound()` - 42 edges
3. `HttpError` - 36 edges
4. `react` - 29 edges
5. `belongsToScope()` - 27 edges
6. `useWorkspaceData()` - 24 edges
7. `compilerOptions` - 22 edges
8. `OrdersService` - 21 edges
9. `resolveCompanyScope()` - 21 edges
10. `mapRow()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `getById()` --calls--> `notFound()`  [EXTRACTED]
  back-end/src/services/companies.service.js → back-end/src/utils/http.js
- `list()` --calls--> `resolveCompanyScope()`  [EXTRACTED]
  back-end/src/services/deliveries.service.js → back-end/src/services/scope.js
- `getByProduct()` --calls--> `notFound()`  [EXTRACTED]
  back-end/src/services/inventory.service.js → back-end/src/utils/http.js
- `getByBarcode()` --calls--> `notFound()`  [EXTRACTED]
  back-end/src/services/products.service.js → back-end/src/utils/http.js
- `getById()` --calls--> `notFound()`  [EXTRACTED]
  back-end/src/services/products.service.js → back-end/src/utils/http.js

## Import Cycles
- None detected.

## Communities (85 total, 4 thin omitted)

### Community 0 - "UI Components"
Cohesion: 0.06
Nodes (86): ConfirmDialog(), DonutBreakdown(), EmptyState(), Modal(), PageState(), ToastHost(), listeners, push() (+78 more)

### Community 1 - "Seed Data"
Cohesion: 0.07
Nodes (40): Roles(), seedBills, seedCompanies, seedCustomers, seedDeliveries, seedOrderItems, seedOrders, seedPayments (+32 more)

### Community 2 - "Test Infrastructure"
Cohesion: 0.04
Nodes (36): { chromium, firefox, webkit }, createContext(), fs, getExtraHeadersFromEnv(), http, os, path, author (+28 more)

### Community 3 - "Inventory DTOs"
Cohesion: 0.09
Nodes (21): seedInventory, AdjustStockDto, ApiProperty, IsNumber, IsOptional, IsString, Min, UpdateInventoryDto (+13 more)

### Community 4 - "Product DTOs & Controller"
Cohesion: 0.09
Nodes (23): CreateProductDto, ApiProperty, IsNumber, IsOptional, IsString, Min, UpdateProductDto, ProductsController (+15 more)

### Community 5 - "Backend Dependencies"
Cohesion: 0.05
Nodes (39): author, dependencies, bcryptjs, compression, cors, dotenv, express, express-rate-limit (+31 more)

### Community 6 - "Supplier DTOs & Controller"
Cohesion: 0.09
Nodes (24): seedSuppliers, CreateSupplierDto, ApiProperty, IsEmail, IsOptional, IsString, UpdateSupplierDto, SuppliersController (+16 more)

### Community 7 - "Customers Controller"
Cohesion: 0.10
Nodes (22): CustomersController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Delete, Get (+14 more)

### Community 8 - "Deliveries Controller"
Cohesion: 0.10
Nodes (22): DeliveriesController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Delete, Get (+14 more)

### Community 9 - "Companies Controller"
Cohesion: 0.10
Nodes (23): CompaniesController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Delete, Get (+15 more)

### Community 10 - "Bill & Order Services"
Cohesion: 0.14
Nodes (30): getProfile(), attachItems(), calculatePromoDiscount(), computeTotals(), create(), createBill(), createPayment(), db (+22 more)

### Community 11 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, react, react-dom, react-router-dom, recharts, devDependencies, oxlint, @types/react (+21 more)

### Community 12 - "Order & Bill Repositories"
Cohesion: 0.11
Nodes (23): findBillByNo(), findBills(), findItemsByOrderIds(), findOrderById(), findOrders(), findPaymentByBillNo(), findPayments(), findPaymentsByBillNo() (+15 more)

### Community 13 - "Auth & Company Services"
Cohesion: 0.12
Nodes (25): create(), create(), createHold(), rejectHoldLabel(), create(), normalizeRole(), resolveCreateCompany(), ALLOWED_ROLES (+17 more)

### Community 14 - "Product Service"
Cohesion: 0.11
Nodes (20): create(), db, getByBarcode(), getById(), { HttpError, notFound }, importCsv(), inventoryRepo, list() (+12 more)

### Community 15 - "Returns Controller"
Cohesion: 0.12
Nodes (13): ReturnsController, ApiOperation, ApiSecurity, ApiTags, Body, Controller, Delete, Get (+5 more)

### Community 16 - "TypeScript Config"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+14 more)

### Community 17 - "UI Primitives"
Cohesion: 0.12
Nodes (16): Badge(), Button(), Card(), CardContent(), CardDescription(), CardHeader(), CardTitle(), GaugeChart() (+8 more)

### Community 18 - "Customer Service"
Cohesion: 0.13
Nodes (21): getByPhone(), list(), adjust(), assertVisible(), db, getById(), getByProduct(), { HttpError, notFound } (+13 more)

### Community 19 - "Dev Dependencies"
Cohesion: 0.10
Nodes (19): cloudinary, concurrently, dependencies, cloudinary, devDependencies, concurrently, name, private (+11 more)

### Community 20 - "Auth Controller Decorators"
Cohesion: 0.12
Nodes (15): ApiBody, ApiResponse, AuthController, ApiOperation, ApiSecurity, ApiTags, Body, Controller (+7 more)

### Community 21 - "NestJS Modules"
Cohesion: 0.13
Nodes (14): AppModule, Module, AuthModule, Module, CompaniesModule, Module, CustomersModule, Module (+6 more)

### Community 22 - "Returns Decorators"
Cohesion: 0.15
Nodes (13): ApiOperation, ApiSecurity, ApiTags, Body, Controller, Delete, Get, HttpCode (+5 more)

### Community 23 - "Auth Context"
Cohesion: 0.20
Nodes (16): AuthProvider(), AuthContext, ADMIN_AND_ABOVE_ROLES, ALL_OPERATION_ROLES, authConfig, authenticateUser(), clearSession(), DEFAULT_AUTH_CONFIG (+8 more)

### Community 24 - "Workspace Helpers"
Cohesion: 0.16
Nodes (11): collectProductsMap(), createBusinessMap(), fetchBusinessFallback(), getCurrentCompanyId(), getCurrentRole(), getCurrentUser(), getTargetBusinessId(), normalizeCompanyRecord() (+3 more)

### Community 25 - "Database Pool & Transactions"
Cohesion: 0.14
Nodes (12): checkConnection(), config, { Pool }, query(), withTransaction(), create(), db, getById() (+4 more)

### Community 26 - "App Root Layout"
Cohesion: 0.29
Nodes (10): App(), AppRoot(), AppLayout(), ProtectedRoute(), useAuth(), LandingPage(), LoginPage(), NotFoundPage() (+2 more)

### Community 27 - "Express Router Setup"
Cohesion: 0.13
Nodes (14): authRoutes, companiesRoutes, customersRoutes, db, deliveriesRoutes, express, inventoryRoutes, ordersRoutes (+6 more)

### Community 28 - "Returns DTOs"
Cohesion: 0.29
Nodes (10): CreateReturnDto, ApiProperty, IsIn, IsNumber, IsOptional, IsString, Min, UpdateReturnDto (+2 more)

### Community 29 - "Reports Service"
Cohesion: 0.19
Nodes (8): db, inventoryStatus(), reportsRepo, { resolveCompanyScope }, returnsSummary(), salesSummary(), scopeFrom(), topProducts()

### Community 30 - "Legacy App Controller"
Cohesion: 0.23
Nodes (6): AppController, Controller, Get, AppService, Injectable, Redirect

### Community 31 - "JWT Guards"
Cohesion: 0.19
Nodes (6): ROLES_KEY, AuthJwtGuard, Injectable, RolesGuard, Injectable, verifyToken()

### Community 32 - "NestJS Modules 2"
Cohesion: 0.19
Nodes (10): InventoryModule, Module, OrdersModule, Module, ReportsModule, Module, ReportsService, Injectable (+2 more)

### Community 33 - "Reports Controller"
Cohesion: 0.21
Nodes (6): ReportsController, ApiOperation, ApiSecurity, ApiTags, Controller, Get

### Community 34 - "Express App Config"
Cohesion: 0.15
Nodes (12): apiLimiter, app, authLimiter, compression, config, cors, express, helmet (+4 more)

### Community 35 - "Auth Service"
Cohesion: 0.19
Nodes (11): bcrypt, companiesRepo, config, db, deriveUsername(), { HttpError }, jwt, login() (+3 more)

### Community 36 - "User DTOs"
Cohesion: 0.30
Nodes (9): seedUsers, CreateUserDto, ApiProperty, IsEmail, IsIn, IsOptional, IsString, UpdateUserDto (+1 more)

### Community 37 - "Customer Repository"
Cohesion: 0.29
Nodes (8): findAll(), findById(), findByPhone(), insert(), { mapRow }, toCustomer(), update(), mapRow()

### Community 38 - "API Providers"
Cohesion: 0.27
Nodes (6): apiConfig, getActiveRole(), request(), apiProvider, localProvider, RegisterBusinessPage()

### Community 39 - "Theme & Navigation"
Cohesion: 0.21
Nodes (8): MAIN_NAV_KEYS, MANAGEMENT_NAV_KEYS, NAV_ICONS, ROLE_LABELS, NAV_ITEMS, ThemeContext, ThemeProvider(), useTheme()

### Community 40 - "Database Seeding"
Cohesion: 0.18
Nodes (9): bcrypt, COMPANIES, config, CUSTOMERS, INVENTORY, PRODUCTS, seed(), SUPPLIERS (+1 more)

### Community 41 - "Inventory Repository"
Cohesion: 0.31
Nodes (9): computeStatus(), findAll(), findById(), findByProduct(), findLowStock(), insert(), { mapRow }, toInventoryItem() (+1 more)

### Community 42 - "Product Repository"
Cohesion: 0.31
Nodes (8): applyPaging(), findAll(), findByBarcode(), findById(), insert(), { mapRow }, toProduct(), update()

### Community 43 - "Generic Service"
Cohesion: 0.24
Nodes (9): create(), db, getById(), { HttpError, notFound }, normalizeFields(), remove(), repo, toNumber() (+1 more)

### Community 44 - "Order Delivery Service"
Cohesion: 0.25
Nodes (10): assertVisible(), db, getById(), getByOrderId(), { HttpError, notFound }, list(), remove(), repo (+2 more)

### Community 45 - "E2E Test Helpers"
Cohesion: 0.22
Nodes (10): assert, { Client }, fs, json(), login(), path, request(), ROOT (+2 more)

### Community 46 - "User Repository"
Cohesion: 0.31
Nodes (6): findAll(), findById(), insert(), { mapRow }, toUser(), update()

### Community 47 - "Node Test Setup"
Cohesion: 0.22
Nodes (5): args, fs, nodeModules, path, { spawn }

### Community 48 - "JWT Auth Service"
Cohesion: 0.28
Nodes (4): generateToken(), JwtPayload, AuthService, Injectable

### Community 50 - "Config Utils"
Cohesion: 0.22
Nodes (6): app, config, db, util, config, path

### Community 51 - "Auth Middleware"
Cohesion: 0.22
Nodes (6): jwt, { asyncHandler }, authMiddleware, express, router, service

### Community 52 - "Company Repository"
Cohesion: 0.36
Nodes (7): FIELD_MAP, findAll(), findById(), insert(), { mapRow }, toCompany(), update()

### Community 53 - "Delivery Repository"
Cohesion: 0.39
Nodes (7): findAll(), findById(), findByOrderId(), insert(), { mapRow }, toDelivery(), update()

### Community 54 - "Read-Only Route Guard"
Cohesion: 0.22
Nodes (8): { asyncHandler }, authMiddleware, express, READ_ROLES, router, service, UPDATE_ROLES, WRITE_ROLES

### Community 55 - "Billing Route Guard"
Cohesion: 0.22
Nodes (8): { asyncHandler }, authMiddleware, BILLING_ROLES, express, READ_ROLES, router, service, WRITE_ROLES

### Community 56 - "Supplier Service"
Cohesion: 0.31
Nodes (8): assertVisible(), db, getById(), { notFound }, remove(), repo, { resolveCompanyScope, resolveCreateCompany, belongsToScope }, update()

### Community 57 - "Delivery Service"
Cohesion: 0.31
Nodes (8): assertVisible(), db, getById(), { HttpError, notFound }, remove(), repo, { resolveCompanyScope, resolveCreateCompany, belongsToScope }, update()

### Community 58 - "Returns Repository"
Cohesion: 0.43
Nodes (6): findAll(), findById(), insert(), { mapRow }, toReturn(), update()

### Community 59 - "Supplier Repository"
Cohesion: 0.43
Nodes (6): findAll(), findById(), insert(), { mapRow }, toSupplier(), update()

### Community 60 - "Write Route Guard"
Cohesion: 0.25
Nodes (7): { asyncHandler }, authMiddleware, express, ROLES, router, service, WRITE_ROLES

### Community 61 - "Read Route Guard"
Cohesion: 0.25
Nodes (7): { asyncHandler }, authMiddleware, express, READ_ROLES, router, service, WRITE_ROLES

### Community 62 - "Admin Route Guard"
Cohesion: 0.25
Nodes (7): { asyncHandler }, authMiddleware, express, ROLES, router, service, WRITE_ROLES

### Community 63 - "User Route Guard"
Cohesion: 0.25
Nodes (7): { asyncHandler }, authMiddleware, express, READ_ROLES, router, service, WRITE_ROLES

### Community 64 - "TSConfig Exclude"
Cohesion: 0.25
Nodes (7): exclude, extends, dist, node_modules, **/*spec.ts, test, ./tsconfig.json

### Community 65 - "ESLint Config"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 66 - "DB Migrations"
Cohesion: 0.29
Nodes (5): config, fs, MIGRATIONS_DIR, path, runMigrations()

### Community 67 - "Error Handling"
Cohesion: 0.48
Nodes (5): errorHandler(), { mapPgError }, badRequest(), conflict(), mapPgError()

### Community 68 - "Hold Repository"
Cohesion: 0.48
Nodes (5): findAll(), findById(), insert(), toHold(), update()

### Community 69 - "Route Guard 2"
Cohesion: 0.29
Nodes (6): { asyncHandler }, authMiddleware, express, ROLES, router, service

### Community 70 - "Route Guard 3"
Cohesion: 0.29
Nodes (6): { asyncHandler }, authMiddleware, express, ROLES, router, service

### Community 71 - "Auth Seed Middleware"
Cohesion: 0.33
Nodes (5): authMiddleware, express, jwt, router, { seedUsers, seedProducts, seedOrders }

### Community 72 - "NestJS TSConfig"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 73 - "Auth Service Route"
Cohesion: 0.33
Nodes (5): { asyncHandler }, authService, express, router, asyncHandler()

### Community 74 - "Service Route"
Cohesion: 0.33
Nodes (5): { asyncHandler }, authMiddleware, express, router, service

### Community 75 - "Dashboard Data"
Cohesion: 0.60
Nodes (3): getActiveBusinessDashboardData(), getFallbackBusinessData(), normalizeOrder()

### Community 76 - "Test Seed Data"
Cohesion: 0.50
Nodes (3): seedOrders, seedProducts, seedUsers

### Community 77 - "Test Assertions"
Cohesion: 0.83
Nodes (3): assert(), request(), run()

## Knowledge Gaps
- **371 isolated node(s):** `http`, `fs`, `os`, `path`, `{ chromium, firefox, webkit }` (+366 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 555 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Roles()` connect `Seed Data` to `NestJS Modules 2`, `Reports Controller`, `Inventory DTOs`, `Product DTOs & Controller`, `User DTOs`, `Supplier DTOs & Controller`, `Customers Controller`, `Deliveries Controller`, `Companies Controller`, `Returns Controller`, `Returns Decorators`, `Returns DTOs`, `JWT Guards`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Why does `react` connect `UI Components` to `ESLint Config`, `API Providers`, `Theme & Navigation`, `UI Primitives`, `Auth Context`, `App Root Layout`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **Why does `ReturnsController` connect `Returns Controller` to `Returns DTOs`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `http`, `fs`, `os` to the rest of the system?**
  _371 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06368985808238145 - nodes in this community are weakly interconnected._
- **Should `Seed Data` be split into smaller, more focused modules?**
  _Cohesion score 0.07003129890453834 - nodes in this community are weakly interconnected._
- **Should `Test Infrastructure` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._