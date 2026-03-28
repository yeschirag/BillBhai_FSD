# BillBhai - Order and Billing System

BillBhai is a web-based order and billing management prototype with role-based access control and functional CRUD workflows.

## Getting Started

1. Open front-end/index.html in a browser.
2. Click Login, or directly open front-end/login.html.
3. Use any credential from the table below.

## Features

- Role-based page access and action-level permissions.
- Functional modules for Orders, Inventory, Returns, Delivery, Users, Reports, and Profile.
- Super User business-portfolio overview to see all client businesses using BillBhai products.
- Super User lands first on Businesses overview (`businesses.html`) instead of Dashboard.
- Business module includes hardcoded multi-tenant data (stores, users, payment history, tenure, profit, payment due).
- Businesses now support in-app CRUD and detail drill-down (view/edit/delete + add business).
- Inside each business detail page, nested CRUD is available for business users, store locations, and payment history entries.
- Dynamic CRUD behavior without full page reload.
- Client-side input validation for forms.
- Session-based login state using localStorage.

## Login Credentials (All Actors)

Use these demo accounts to log in as each actor:

| Actor | Role Label in App | Username | Password | Default Landing Page |
|---|---|---|---|---|
| Super User (Platform Owner) | Super User | chirag | chirag1234 | dashboard.html |
| Admin | Admin | admin | admin123 | dashboard.html |
| Admin (Legacy Login) | Admin | superuser | super123 | dashboard.html |
| Cashier | Cashier | cashier | cashier123 | orders.html |
| Return Handler | Return Handler | returnhandler | return123 | returns.html |
| Inventory Manager | Inventory Manager | inventorymanager | inventory123 | inventory.html |
| Delivery Operations | Delivery Ops | deliveryops | delivery123 | delivery.html |
| Customer | Customer | customer | customer123 | profile.html |

## Role Hierarchy

- Super User (chirag): platform-level account with full system access and Businesses overview.
- Admin: business-level account for store operations.

## Notes

- These are development/demo credentials only.
- Authentication is simulated on the client side.
- Data and session state are stored in localStorage and are not production secure.
