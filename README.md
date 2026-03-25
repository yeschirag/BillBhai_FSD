# BillBhai – Order & Billing System

A web-based order and billing management system featuring role-based access control and functional CRUD operations.

## Getting Started

Open `front-end/index.html` in your browser to launch the application's landing page, or go directly to `front-end/pages/login.html`.

## Features
- **Role-Based UI:** The dashboard dynamically changes based on `Super User` and `Admin` permissions.
- **Super User Access:** Full CRUD access to all modules including Users, Reports, Returns, and Delivery.
- **Admin Access:** Restricted exclusively to store-level operations (Inventory and Orders). 
- **Simulated CRUD:** Add, Edit, and Delete functionalities working dynamically without page reloads utilizing structured JS data arrays.
- **Client-Side Validations:** All forms handle inputs dynamically protecting against empty insertions.

## Login Credentials

Use the following simulated accounts to experience the custom roles:

| Role       | Username   | Password     |
|------------|------------|--------------|
| Super User | superuser  | super123     |
| Super User | sarthak    | sarthak123   |
| Admin      | admin      | admin123     |
| Admin      | mohit      | mohit123     |
| Admin      | aditya     | aditya123    |
| User       | chirag     | chirag1234   |
| User       | satyam     | satyam123    |

> ⚠️ **Note:** These are simulated development credentials managed strictly via `localStorage` states. Do not run this format securely in any production ecosystem.
