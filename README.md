# BillBhai - Order and Billing System

BillBhai is a web-based billing, inventory, delivery, and operations prototype with role-based access control, editable JSON seed data, and local live-sync between role views.

## Getting Started

1. Serve `front-end/pages` with any static server or open the deployed preview.
2. Open `front-end/pages/index.html` or go directly to `front-end/pages/login.html`.
3. Use any credential from the table below.

Note: the app now fetches editable JSON from `front-end/pages/data/`, so opening pages directly as `file://` may block data loading in some browsers.

## Folder Structure

- `front-end/pages/index.html` (landing page)
- `front-end/pages/` (deployment root with pages + local assets)
- `front-end/pages/styles/` (all css files)
- `front-end/pages/scripts/` (all js files)
- `front-end/pages/public/` (logo and static media)
- `front-end/pages/data/` (editable json seed files)

## Features

- Role-based page access and action-level permissions.
- Functional modules for Orders, Inventory, Returns, Delivery, Users, Reports, and Profile.
- Super User business-portfolio overview to see all client businesses using BillBhai products.
- Super User lands first on Super User Portal (`front-end/pages/superuser.html`) instead of Dashboard.
- Business and operational data now load from editable JSON files in `front-end/pages/data/`.
- Login credentials/aliases, notification feeds, cashier catalog, and landing-page marketing content are also JSON-driven.
- Dashboard, inventory, and report charts now compute from live business datasets instead of hardcoded demo arrays.
- Inventory Manager has a dedicated stock-focused dashboard view that only shows inventory-related KPIs, charts, and tables.
- Businesses now support in-app CRUD and detail drill-down (view/edit/delete + add business).
- Inside each business detail page, nested CRUD is available for business users, store locations, and payment history entries.
- CRUD actions now use compact modal forms/confirmations (no browser prompt/confirm dialogs).
- Dynamic CRUD behavior without full page reload.
- Cashier checkout now syncs into the same scoped business datasets used by admin/ops dashboards and decrements matching inventory items.
- Cashier product tiles are JSON-driven, including their display emojis/icons, so catalog visuals can be edited from data files too.
- Same-browser tab updates propagate through `localStorage` + `BroadcastChannel` live sync.
- Admin, Inventory Manager, Delivery Ops, Return Handler, and Cashier all respect active business scope to avoid cross-business leakage.
- Landing page sections, notification center items, and demo auth users can be updated without touching JavaScript source.
- Profile activity now reflects current session context and live recent business activity instead of staying fully static.
- Client-side input validation for forms.
- Session-based login state using localStorage.

## Editable Data Files

Update these files directly to control initial app data:

- `front-end/pages/data/orders.json`
- `front-end/pages/data/inventory.json`
- `front-end/pages/data/deliveries.json`
- `front-end/pages/data/returns.json`
- `front-end/pages/data/users.json`
- `front-end/pages/data/businesses.json`
- `front-end/pages/data/business_data.json`
- `front-end/pages/data/cashier_data.json`
- `front-end/pages/data/auth_users.json`
- `front-end/pages/data/notifications.json`
- `front-end/pages/data/landing_content.json`

On every fresh reload, these JSON files are treated as the baseline seed state. Runtime edits still work in-app through `localStorage`, but a full reload resets back to the JSON source of truth.

## Login Credentials (All Actors)

Use these demo accounts to log in as each actor:

| Actor | Role Label in App | Username | Password | Default Landing Page |
|---|---|---|---|---|
| Super User (Platform Owner) | Super User | chirag | chirag1234 | pages/superuser.html |
| Admin | Admin | admin | admin123 | pages/dashboard.html |
| Admin (Legacy Login) | Admin | superuser | super123 | pages/dashboard.html |
| Cashier | Cashier | cashier | cashier123 | pages/cashier.html |
| Return Handler | Return Handler | returnhandler | return123 | pages/returns.html |
| Inventory Manager | Inventory Manager | inventorymanager | inventory123 | pages/inventory.html |
| Delivery Operations | Delivery Ops | deliveryops | delivery123 | pages/delivery.html |
| Customer | Customer | customer | customer123 | pages/profile.html |

Accepted login ID aliases (same password as mapped account):

- chirag@billbhai.com -> chirag
- super, superuser@billbhai.com -> superuser
- admin@billbhai.com -> admin
- cashier@billbhai.com -> cashier
- returns, returnhandler@billbhai.com -> returnhandler
- inventory, inventorymanager@billbhai.com -> inventorymanager
- delivery, deliveryops@billbhai.com -> deliveryops
- user, customer@billbhai.com -> customer

## Role Hierarchy

- Super User (chirag): platform-level account with full system access and Businesses overview.
- Admin: business-level account for store operations.

## Notes

- These are development/demo credentials only.
- Authentication is simulated on the client side.
- Data and session state are stored in localStorage and are not production secure.
- Multi-tab "real-time" sync in this project is same-browser and same-origin only.
- If deployed on Vercel, set Root Directory to `front-end/pages`.
- This project is configured so all required assets (`styles`, `scripts`, `public`, `data`) are inside `front-end/pages`.
