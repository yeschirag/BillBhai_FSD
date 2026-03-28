# BillBhai - Order and Billing System

BillBhai is a web-based order and billing management prototype with role-based access control and functional CRUD workflows.

## Getting Started

1. Open front-end/pages/index.html in a browser.
2. Click Login, or directly open front-end/pages/login.html.
3. Use any credential from the table below.

## Folder Structure

- `front-end/pages/index.html` (landing page)
- `front-end/pages/` (all app pages)
- `front-end/styles/` (all css files)
- `front-end/scripts/` (all js files)
- `front-end/public/` (logo and static media)
- `front-end/data/` (editable json seed files)

## Features

- Role-based page access and action-level permissions.
- Functional modules for Orders, Inventory, Returns, Delivery, Users, Reports, and Profile.
- Super User business-portfolio overview to see all client businesses using BillBhai products.
- Super User lands first on Super User Portal (`front-end/pages/superuser.html`) instead of Dashboard.
- Business and operational data now load from editable JSON files in `front-end/data/`.
- Businesses now support in-app CRUD and detail drill-down (view/edit/delete + add business).
- Inside each business detail page, nested CRUD is available for business users, store locations, and payment history entries.
- CRUD actions now use compact modal forms/confirmations (no browser prompt/confirm dialogs).
- Dynamic CRUD behavior without full page reload.
- Client-side input validation for forms.
- Session-based login state using localStorage.

## Editable Data Files

Update these files directly to control initial app data:

- `front-end/data/orders.json`
- `front-end/data/inventory.json`
- `front-end/data/deliveries.json`
- `front-end/data/returns.json`
- `front-end/data/users.json`
- `front-end/data/businesses.json`
- `front-end/data/business_data.json`

## Login Credentials (All Actors)

Use these demo accounts to log in as each actor:

| Actor | Role Label in App | Username | Password | Default Landing Page |
|---|---|---|---|---|
| Super User (Platform Owner) | Super User | chirag | chirag1234 | pages/superuser.html |
| Admin | Admin | admin | admin123 | pages/dashboard.html |
| Admin (Legacy Login) | Admin | superuser | super123 | pages/dashboard.html |
| Cashier | Cashier | cashier | cashier123 | pages/orders.html |
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
- If deployed on Vercel, set Root Directory to `front-end` (not `front-end/pages`) so `styles`, `scripts`, `public`, and `data` are included.
- `front-end/index.html` now redirects to `front-end/pages/index.html`.
