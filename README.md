# BillBhai - Order and Billing System

BillBhai is a web-based order and billing management prototype with role-based access control and functional CRUD workflows.

## Getting Started

1. Open front-end/index.html in a browser.
2. Click Login, or directly open front-end/login.html.
3. Use any credential from the table below.

## Features

- Role-based page access and action-level permissions.
- Functional modules for Orders, Inventory, Returns, Delivery, Users, Reports, and Profile.
- Dynamic CRUD behavior without full page reload.
- Client-side input validation for forms.
- Session-based login state using localStorage.

## Login Credentials (All Actors)

Use these demo accounts to log in as each actor:

| Actor | Role Label in App | Username | Password | Default Landing Page |
|---|---|---|---|---|
| Super User | Super User | superuser | super123 | dashboard.html |
| Admin | Admin | admin | admin123 | dashboard.html |
| Cashier | Cashier | cashier | cashier123 | orders.html |
| Return Handler | Return Handler | returnhandler | return123 | returns.html |
| Inventory Manager | Inventory Manager | inventorymanager | inventory123 | inventory.html |
| Delivery Operations | Delivery Ops | deliveryops | delivery123 | delivery.html |
| Customer | Customer | customer | customer123 | profile.html |
| Customer (Demo User) | Customer | chirag | chirag1234 | profile.html |

## Notes

- These are development/demo credentials only.
- Authentication is simulated on the client side.
- Data and session state are stored in localStorage and are not production secure.
