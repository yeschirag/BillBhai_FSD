BillBhai Backend Migration Plan: NestJS to Express.js
=====================================================

Document purpose
----------------
This document defines the recommended approach for migrating the current BillBhai backend from NestJS to Express.js in a controlled, step-by-step manner. The goal is to preserve current API behavior, role-based access control, validation, response formats, and frontend compatibility while reducing framework complexity and giving the team more direct control over the HTTP layer.

Current backend summary
-----------------------
The backend is currently a NestJS TypeScript application under `back-end/`. It uses:

- Nest modules, controllers, services, DTOs, decorators, and dependency injection.
- A global `/api` prefix, while keeping the root route outside the prefix.
- CORS configured for all origins with `Content-Type` and `x-role` headers.
- A global `ValidationPipe` with whitelist, forbid-non-whitelisted, and transform behavior.
- Swagger documentation generated through `@nestjs/swagger`.
- A global `RolesGuard` using the `x-role` request header for role-based access control.
- In-memory seed data for the current domain modules.
- Existing smoke/e2e testing assets, including `back-end/test/smoke.test.js`, `back-end/test/app.e2e-spec.ts`, and `back-end/docs/swagger.json`.

The current module areas are:

- Auth
- Companies
- Users
- Customers
- Products
- Inventory
- Orders
- Deliveries
- Returns
- Reports
- Suppliers

Benefits of migrating to Express.js
-----------------------------------
1. Simpler runtime model

Express has a smaller and more direct request/response model. For this project, most current controllers map cleanly to route handlers, and most service methods already contain plain business logic that can be reused with limited changes.

2. More explicit middleware control

Express makes request logging, CORS, body parsing, validation, authorization, security headers, route guards, and error handling visible in one clear pipeline. This is useful for BillBhai because RBAC through `x-role` and module-specific protections are central to the API.

3. Lower framework overhead

Removing Nest-specific decorators, reflection, modules, and dependency injection can reduce cognitive overhead for contributors who are more familiar with standard Node.js and Express patterns.

4. Easier incremental customization

Express makes it straightforward to add custom middleware, router-level rules, request context, API versioning, custom error responses, rate limiting, and observability without adapting to Nest abstractions.

5. Potentially lighter deployment footprint

An Express app can have fewer runtime dependencies than NestJS if the migration removes Nest packages, reflection metadata, and Nest CLI/build requirements. This may simplify startup behavior and deployment packaging.

6. Reusable service logic

The current service classes are already organized by domain. The migration can initially preserve these service files or convert them gradually to plain classes/functions, reducing the risk of rewriting business rules and HTTP routing at the same time.

Migration principles
--------------------
1. Preserve the public API contract first.

The frontend should continue to call the same URLs, methods, headers, query parameters, request bodies, status codes, and response shapes. Any intentional API change must be documented separately and coordinated with frontend changes.

2. Migrate one module at a time.

Do not rewrite the whole backend in one large change. Build the Express foundation first, then move modules in small, testable batches.

3. Keep service behavior stable during the first pass.

The first migration should focus on replacing Nest controllers, modules, guards, pipes, and bootstrap code. Business logic refactoring should be kept separate unless required.

4. Use tests as a contract.

Before replacing a route group, capture expected behavior using smoke tests, route-level tests, and OpenAPI/Swagger contract comparisons where practical.

5. Make middleware explicit and layered.

Express does not provide Nest-style guards, pipes, filters, or interceptors automatically. The replacement architecture must define app-level, router-level, validation, security, and error middleware clearly.

Recommended Express architecture
--------------------------------
Suggested backend structure:

back-end/
  src/
    app.ts
    server.ts
    routes/
      index.ts
      auth.routes.ts
      companies.routes.ts
      users.routes.ts
      customers.routes.ts
      products.routes.ts
      inventory.routes.ts
      orders.routes.ts
      deliveries.routes.ts
      returns.routes.ts
      reports.routes.ts
      suppliers.routes.ts
    controllers/
      auth.controller.ts
      companies.controller.ts
      users.controller.ts
      customers.controller.ts
      products.controller.ts
      inventory.controller.ts
      orders.controller.ts
      deliveries.controller.ts
      returns.controller.ts
      reports.controller.ts
      suppliers.controller.ts
    services/
      auth.service.ts
      companies.service.ts
      users.service.ts
      customers.service.ts
      products.service.ts
      inventory.service.ts
      orders.service.ts
      deliveries.service.ts
      returns.service.ts
      reports.service.ts
      suppliers.service.ts
    dto/
      ...
    middleware/
      request-logger.middleware.ts
      request-context.middleware.ts
      roles.middleware.ts
      validate.middleware.ts
      not-found.middleware.ts
      error-handler.middleware.ts
    security/
      cors.ts
      helmet.ts
      rate-limit.ts
    errors/
      http-error.ts
      bad-request-error.ts
      conflict-error.ts
      forbidden-error.ts
      not-found-error.ts
      unauthorized-error.ts
    docs/
      openapi.ts
    common/
      seed/
        seed-data.ts

The exact folder names can be adjusted, but the migration should preserve clear separation between:

- HTTP app setup
- Route registration
- Route handlers/controllers
- Business services
- DTO/schema validation
- Middleware
- Error classes
- Security configuration
- API documentation

Required middleware layers
--------------------------
Express middleware must be designed as a multi-layer pipeline. The recommended order is:

1. App-level infrastructure middleware

This middleware runs for most or all requests before routes.

Required items:

- Request body parsing with `express.json()` and `express.urlencoded()`.
- CORS configuration matching current behavior: allow required frontend origins, allow methods GET/POST/PUT/PATCH/DELETE/OPTIONS, and allow `Content-Type` plus `x-role`.
- Request logging equivalent to the current Nest middleware in `main.ts`.
- Request ID or request context middleware, if the team wants better tracing.
- Static or docs middleware, if Swagger UI/OpenAPI docs remain served by the backend.

2. Security-level middleware

Security middleware should be applied globally unless a route has a clear reason to opt out.

Recommended items:

- `helmet` for common HTTP security headers.
- CORS restrictions by environment. Current `origin: '*'` is acceptable for local development, but production should use an allowlist.
- Rate limiting for sensitive or high-traffic endpoints, especially `/api/auth/login`.
- Payload size limits to prevent oversized JSON bodies.
- Optional input sanitization if user-entered text later flows into a database or generated documents.
- Consistent handling for `OPTIONS` preflight requests.

3. Router-level middleware

Router-level middleware should enforce module-specific rules before controller handlers.

Required items:

- Role-based access middleware replacing Nest `@Roles()` and `RolesGuard`.
- Per-router validation middleware replacing Nest `ValidationPipe`.
- Per-router rate limits where needed, such as stricter limits on auth and order creation.
- Optional module-specific request normalization, for example normalizing role names or company IDs.

Example conceptual mapping:

- `@Roles('superuser', 'admin')` becomes `requireRoles('superuser', 'admin')`.
- `@Body() dto: CreateProductDto` becomes `validateBody(createProductSchema)`.
- `@Param('id') id: string` becomes `req.params.id`.
- `@Query('companyId') companyId?: string` becomes `req.query.companyId`.

4. Controller/route handler layer

Controllers should remain thin. They should:

- Read params, query, headers, and body from `req`.
- Call service methods.
- Set the correct HTTP status code.
- Return JSON responses.
- Pass errors to `next(error)` or use an async-handler wrapper.

5. Not-found middleware

After all routes are registered, add a 404 middleware for unknown endpoints. This replaces implicit Nest route-not-found behavior.

6. Central error-handling middleware

The final middleware must be an Express error handler with `(err, req, res, next)`. It should:

- Convert known application errors to HTTP responses.
- Preserve current status codes for Nest exceptions: 400, 401, 403, 404, 409.
- Return a consistent JSON response shape.
- Avoid leaking stack traces in production.
- Log unexpected 500 errors.
- Include request ID if request context middleware is added.

Important: Express will not catch errors from rejected promises unless handlers are wrapped correctly or Express 5 async behavior is confirmed and used consistently. A shared `asyncHandler` utility is recommended.

Step-by-step migration plan
---------------------------
Phase 0: Confirm scope and baseline

1. Freeze or document the current API behavior.
2. Save the current `back-end/docs/swagger.json` as the initial contract baseline.
3. Run existing tests and smoke tests against the Nest backend.
4. Record the current route list, required roles, status codes, and representative payloads.
5. Identify frontend pages/scripts that call the backend, especially `front-end/pages/scripts/api-client.js` and page-specific scripts.

Phase 1: Prepare the Express foundation

1. Add Express dependencies and TypeScript support.
2. Create `src/app.ts` to configure middleware and register routes.
3. Create `src/server.ts` to start the HTTP server on the existing port, currently 3000.
4. Preserve `/api` as the backend API prefix.
5. Preserve the root route behavior. Current e2e coverage expects GET `/` to redirect to `/api`; either keep that behavior or update tests only if the behavior is intentionally changed.
6. Add app-level middleware:
   - JSON body parser
   - URL-encoded body parser
   - CORS
   - request logger
   - request ID/context, if selected
7. Add security middleware:
   - helmet
   - environment-specific CORS allowlist
   - body size limit
   - rate limiter for auth and optional global API throttling
8. Add not-found and error-handling middleware.

Phase 2: Create shared Express replacements for Nest features

1. Replace Nest exception classes with local HTTP error classes.
2. Replace `RolesGuard` and `@Roles()` with `requireRoles(...)` middleware.
3. Replace `ValidationPipe` and DTO decorators with explicit validation schemas.
4. Decide whether validation will use `zod`, `joi`, `yup`, `express-validator`, or continued `class-validator` with manual invocation.
5. Add an async route wrapper to route errors into centralized error handling.
6. Add response helper conventions only if they reduce duplication without hiding normal Express behavior.

Phase 3: Port low-risk modules first

Start with modules that have simple CRUD behavior and fewer cross-module dependencies:

1. Products
2. Suppliers
3. Companies
4. Users
5. Customers

For each module:

1. Create an Express router.
2. Move controller method behavior into route handlers.
3. Attach `requireRoles(...)` middleware based on the current controller decorators.
4. Attach request validation middleware for create/update routes.
5. Reuse the existing service behavior as much as possible.
6. Add route-level tests for success cases, forbidden access, missing role headers, validation failures, not found, and conflict cases.
7. Run smoke tests after each migrated module.

Phase 4: Port workflow-heavy modules

After simple modules are stable, migrate:

1. Inventory
2. Orders
3. Deliveries
4. Returns
5. Reports
6. Auth

Orders should receive extra care because it includes order creation, promotions, bills, payments, counters, and route ordering where specific paths such as `/orders/bills/all` must be registered before generic `/:id` routes.

Auth should receive extra care because it is security-sensitive and may receive rate limiting earlier than other route groups.

Phase 5: Rebuild API documentation

1. Choose the OpenAPI generation approach for Express.
2. Options include:
   - Manually maintained OpenAPI JSON/YAML.
   - `swagger-jsdoc` plus JSDoc annotations.
   - Schema-driven OpenAPI generation if using Zod or another schema library.
3. Preserve the current Swagger UI route at `/api` if the team wants compatibility with the existing developer workflow.
4. Compare the new OpenAPI output against `back-end/docs/swagger.json`.

Phase 6: Remove Nest dependencies

Only after all routes and tests are passing:

1. Remove Nest runtime dependencies:
   - `@nestjs/common`
   - `@nestjs/core`
   - `@nestjs/platform-express`
   - `@nestjs/config`, if no longer used
   - `@nestjs/swagger`, if replaced
   - `reflect-metadata`, if no longer needed
   - `rxjs`, if no longer needed
2. Remove Nest dev dependencies:
   - `@nestjs/cli`
   - `@nestjs/schematics`
   - `@nestjs/testing`
3. Remove or replace `nest-cli.json`.
4. Update package scripts:
   - `build`
   - `start`
   - `start:dev`
   - `start:prod`
   - `test:e2e`
5. Update README instructions.

Phase 7: Final verification and cleanup

1. Run unit tests, route tests, e2e tests, and smoke tests.
2. Run frontend flows against the Express backend.
3. Confirm OpenAPI docs are available and accurate.
4. Confirm all protected routes reject missing or unauthorized `x-role` values.
5. Confirm validation rejects unknown fields where the current Nest `ValidationPipe` rejects them.
6. Confirm production startup uses the compiled Express server.
7. Remove unused Nest imports, decorators, and files only after equivalent Express code exists.

Testing and safety nets
-----------------------
1. API contract tests

Create tests that verify each route keeps the same:

- URL
- HTTP method
- required headers
- query parameters
- request body requirements
- response status
- response shape
- error status and error shape

2. Smoke tests

Keep and expand `back-end/test/smoke.test.js`. It already validates:

- Auth login
- Product listing
- Order creation
- Order listing
- Order detail lookup

Recommended additions:

- Missing `x-role` should return 403 on protected routes.
- Wrong role should return 403.
- Invalid login should return 401.
- Invalid create/update payload should return 400.
- Unknown resource should return 404.
- Duplicate resource conflicts should return 409.

3. Route-level integration tests

Use `supertest` against the Express app exported from `src/app.ts`. This avoids needing a real network port for most tests.

4. Validation parity tests

The current Nest validation strips unknown fields, rejects non-whitelisted fields, and transforms values. Express validation must intentionally match or intentionally change this behavior. Tests should cover:

- Required fields.
- Optional fields.
- Numeric fields.
- Minimum values.
- Unknown fields.
- Nested arrays, especially order items.

5. RBAC tests

Every route with a current `@Roles(...)` decorator should have tests for:

- Allowed role.
- Missing `x-role`.
- Disallowed role.
- Role casing and whitespace normalization.

This is important because the current guard normalizes roles by trimming, lowercasing, and removing whitespace.

6. Error-handling tests

Test that the centralized error middleware maps application errors correctly:

- Bad request: 400
- Unauthorized: 401
- Forbidden: 403
- Not found: 404
- Conflict: 409
- Unexpected error: 500

7. Swagger/OpenAPI comparison

Use the existing `back-end/docs/swagger.json` as a baseline. During migration, compare new docs to old docs to catch route, method, parameter, schema, and status code drift.

8. Frontend regression testing

Run the frontend pages that depend on backend APIs, especially:

- Login
- Dashboard
- Products
- Inventory
- Orders
- Cashier
- Returns
- Delivery
- Reports
- Users
- Businesses

9. Parallel-run safety net

For a cautious migration, run the Nest backend and Express backend on different ports temporarily. Send the same smoke-test requests to both and compare responses before switching the frontend to Express.

10. Rollback plan

Keep the Nest backend runnable until the Express backend passes contract, smoke, and frontend checks. Avoid deleting Nest files in early phases.

Middleware design details
-------------------------
App-level middleware should include:

- `express.json({ limit: '1mb' })` or another agreed size.
- `express.urlencoded({ extended: true })`.
- CORS using environment-specific allowed origins.
- Request logger matching the existing format or a structured logger.
- Optional request ID middleware.

Security-level middleware should include:

- `helmet()`.
- Auth/login rate limit.
- Optional global API rate limit.
- Strict production CORS allowlist.
- Payload size limits.
- Safe error messages in production.

Router-level middleware should include:

- `requireRoles(...roles)` for protected endpoints.
- `validateBody(schema)` for POST/PUT/PATCH payloads.
- `validateQuery(schema)` where query parameters are required or typed.
- `validateParams(schema)` where path parameters need format checks.
- Feature-specific middleware only when a module requires it.

Error middleware should include:

- A not-found handler for unmatched routes.
- A centralized error handler as the last middleware.
- A shared `HttpError` shape with `statusCode`, `message`, and optional `details`.
- Logging for unexpected errors.
- Consistent JSON response structure across all modules.

Suggested error response shape:

{
  "statusCode": 404,
  "message": "Product PRD-001 not found",
  "error": "Not Found"
}

This matches Nest-style responses closely enough for frontend compatibility, but the exact shape should be confirmed before implementation.

Known limitations and risks
---------------------------
1. Loss of Nest dependency injection

Express does not provide a built-in dependency injection container. Services must be instantiated manually, wired through a lightweight local container, or connected through another DI library. Manual wiring is simplest for this project but can become harder as dependencies grow.

2. Loss of decorators and metadata

Nest decorators currently define routes, roles, validation, and Swagger metadata. Express requires these to be represented explicitly in route files, middleware, and documentation schemas.

3. Validation behavior may drift

Nest `ValidationPipe` behavior is easy to underestimate. Express validation must intentionally preserve unknown-field rejection, type transformation, nested validation, and numeric rules.

4. Error response differences

Nest exceptions automatically produce HTTP responses. Express needs explicit error classes and a final error handler. Without this, status codes and response shapes may become inconsistent.

5. Swagger documentation will need a replacement strategy

`@nestjs/swagger` will no longer generate docs from decorators. OpenAPI must be maintained manually or generated from another source.

6. More boilerplate

Express is smaller but less opinionated. The team will write and maintain more route registration, middleware wiring, validation wrappers, and error mapping code.

7. Route ordering matters

Express route order is explicit. Specific routes such as `/orders/bills/all` and `/orders/payments/all` must be registered before generic routes like `/orders/:id`.

8. Security protections become the team's responsibility

Nest global guards and pipes currently enforce important protections. In Express, missing a middleware on one route can create an authorization or validation gap.

9. Existing Nest tests must be rewritten

Tests that depend on `@nestjs/testing` and `INestApplication` will need to use the exported Express app with `supertest`.

10. In-memory state remains a limitation

The current backend uses in-memory seed data. Migrating to Express does not solve persistence, concurrency, or restart-reset behavior. Database persistence should be treated as a separate project unless explicitly included in this migration.

Decision questions before implementation
----------------------------------------
The following decisions should be answered before code migration begins:

1. Should the Express backend continue using TypeScript?

Recommendation: Yes. The current backend is already TypeScript, and keeping TypeScript reduces migration risk.

2. Which validation library should replace Nest `ValidationPipe`?

Recommendation: Use Zod for explicit schemas, TypeScript-friendly validation, and possible OpenAPI generation support.

3. Should the API keep the exact current Nest-style error response shape?

Recommendation: Yes for the first migration pass, unless the frontend is updated at the same time.

4. Should Swagger remain available at `/api`?

Recommendation: Yes initially, because the current backend advertises Swagger docs at `http://localhost:3000/api`.

5. Should CORS remain `origin: '*'`?

Recommendation: Keep it only for local development. Use an environment-based allowlist for production.

6. Should the migration preserve the current `x-role` authorization model?

Recommendation: Yes for parity. A more secure token/session-based model can be planned separately.

7. Should the migration be a replacement in `back-end/` or a temporary parallel app under a new folder?

Recommendation: Build the Express app inside `back-end/src` while keeping Nest files until parity is proven, or create a temporary `back-end/src-express` if the team wants both apps runnable side by side.

8. Should API versioning be introduced now?

Recommendation: No, unless there is a current product need. Preserve `/api` first and consider `/api/v1` later.

Recommended first implementation milestone
------------------------------------------
The first coding milestone should be small:

1. Add Express app/server foundation.
2. Add app-level middleware, security middleware, not-found middleware, and centralized error middleware.
3. Port only the root route and auth login route.
4. Add supertest coverage for:
   - GET `/`
   - POST `/api/auth/login` success
   - POST `/api/auth/login` invalid credentials
   - unknown route 404
   - centralized error shape
5. Keep the Nest app available until this foundation is verified.

After that, migrate one module at a time using the existing smoke test as the main confidence loop.
