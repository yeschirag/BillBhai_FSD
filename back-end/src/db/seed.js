#!/usr/bin/env node
/* eslint-disable no-console */

// Development/demo seed. Safe to re-run: every insert is ON CONFLICT DO
// NOTHING, so existing rows (including data created through the API) are
// never touched. Passwords are stored as bcrypt hashes.

const bcrypt = require('bcryptjs');
const config = require('../config');

function connectDirect() {
  const { Client } = require('pg');
  return new Promise((resolve, reject) => {
    const client = new Client({ connectionString: config.databaseUrl });
    client.connect().then(() => resolve(client)).catch(reject);
  });
}

const COMPANIES = [
  ['BIZ-101', 'FreshKart Central', 'Arjun Mehta', 'Arjun Mehta', 'Grocery', 'owner@freshkart.in', '9870011201', 'GST101', 'Delhi, India', 'Active', 'Core POS', 14, 2, 182000, 0],
  ['BIZ-102', 'QuickStop Mart', 'Hemant Rawat', 'Hemant Rawat', 'Convenience', 'owner@quickstop.in', '9870011205', 'GST102', 'Kolkata, India', 'Trial', 'Core POS', 1, 1, 41500, 2500],
];

// [id, companyId, name, role, email, mobileNo, username, plainPassword]
const USERS = [
  ['USR-001', 'BIZ-101', 'Arjun Mehta', 'admin', 'admin@billbhai.com', '9870011201', 'admin', 'admin123'],
  ['USR-002', 'BIZ-101', 'Komal Shah', 'cashier', 'cashier@billbhai.com', '9870011202', 'cashier', 'cashier123'],
  ['USR-003', 'BIZ-101', 'Irfan Ali', 'inventorymanager', 'inventorymanager@billbhai.com', '9870011203', 'inventorymanager', 'inventory123'],
  ['USR-004', 'BIZ-101', 'Gopal Yadav', 'deliveryops', 'deliveryops@billbhai.com', '9870011204', 'deliveryops', 'delivery123'],
  ['USR-005', 'BIZ-102', 'Hemant Rawat', 'returnhandler', 'returnhandler@billbhai.com', '9870011205', 'returnhandler', 'return123'],
  ['USR-006', 'BIZ-101', 'Chirag', 'superuser', 'chirag@billbhai.com', '9870011206', 'chirag', 'chirag1234'],
  ['USR-007', 'BIZ-101', 'Demo Customer', 'customer', 'customer@demo.com', '9810001999', 'customer', 'customer123'],
];

const CUSTOMERS = [
  ['CUS-001', 'BIZ-101', '9810001001', 'Meera Shah', 'meera@example.in', '12 Rose Villa, Andheri West, Mumbai', 'Prefers cash payment'],
  ['CUS-002', 'BIZ-101', '9810001002', 'Arjun Rao', 'arjun.rao@example.in', '4 Lake View Road, Powai, Mumbai', ''],
];

const SUPPLIERS = [
  ['SUP-001', 'Agarwal Traders', '9811544101', 'agarwal@traders.in', 'Delhi', 'GSTSUP001'],
  ['SUP-002', 'Sharma Wholesale', '9891722055', 'sharma@wholesale.in', 'Delhi', 'GSTSUP002'],
  ['SUP-003', 'Fortune Dist.', '9900411233', 'fortune@dist.in', 'Mumbai', 'GSTSUP003'],
  ['SUP-004', 'City Dairy', '9800011004', 'city@dairy.in', 'Delhi', 'GSTSUP004'],
  ['SUP-005', 'SnackHub Foods', '9800011005', 'snackhub@foods.in', 'Bangalore', 'GSTSUP005'],
  ['SUP-006', 'Cool Bev', '9800011006', 'cool@bev.in', 'Pune', 'GSTSUP006'],
  ['SUP-007', 'HomeSpark Supplies', '9800011007', 'homespark@supplies.in', 'Chennai', 'GSTSUP007'],
];

// [id, supplierId, name, category, barcode, price, size, description]
const PRODUCTS = [
  ['P001', 'SUP-001', 'Basmati Rice', 'Groceries', 'BAR001', 380, '5kg', 'Premium basmati rice'],
  ['P002', 'SUP-002', 'Toor Dal', 'Groceries', 'BAR002', 120, '1kg', 'Yellow split pigeon peas'],
  ['P003', 'SUP-003', 'Refined Oil', 'Groceries', 'BAR003', 155, '1L', 'Refined sunflower oil'],
  ['P004', 'SUP-004', 'Amul Butter', 'Dairy', 'BAR004', 275, '500g', 'Pasteurised butter'],
  ['P005', 'SUP-004', 'Milk', 'Dairy', 'BAR005', 60, '1L', 'Full cream milk'],
  ['P006', 'SUP-005', 'Bread Loaf', 'Snacks', 'BAR006', 45, 'Regular', 'Whole wheat bread'],
  ['P007', 'SUP-005', 'Maggi Noodles', 'Snacks', 'BAR007', 54, 'Pack of 4', 'Instant noodles'],
  ['P008', 'SUP-006', 'Tea Powder', 'Beverages', 'BAR008', 160, '250g', 'Premium tea'],
  ['P009', 'SUP-006', 'Coffee Jar', 'Beverages', 'BAR009', 180, '100g', 'Instant coffee'],
  ['P010', 'SUP-001', 'Atta Flour', 'Groceries', 'BAR010', 248, '5kg', 'Whole wheat flour'],
  ['P011', 'SUP-002', 'Sugar', 'Groceries', 'BAR011', 48, '1kg', 'Refined sugar'],
  ['P012', 'SUP-004', 'Paneer', 'Dairy', 'BAR012', 78, '200g', 'Fresh cottage cheese'],
  ['P013', 'SUP-004', 'Curd Cup', 'Dairy', 'BAR013', 26, '200g', 'Fresh curd'],
  ['P014', 'SUP-005', 'Potato Chips', 'Snacks', 'BAR014', 20, 'Classic', 'Salted potato chips'],
  ['P015', 'SUP-005', 'Biscuits', 'Snacks', 'BAR015', 12, 'Single Pack', 'Glucose biscuits'],
  ['P016', 'SUP-006', 'Orange Juice', 'Beverages', 'BAR016', 42, '500ml', 'Fresh orange juice'],
  ['P017', 'SUP-006', 'Mineral Water', 'Beverages', 'BAR017', 20, '1L', 'Packaged drinking water'],
  ['P018', 'SUP-007', 'Bath Soap', 'Home Care', 'BAR018', 34, 'Single', 'Herbal bath soap'],
  ['P019', 'SUP-007', 'Dishwash Liquid', 'Home Care', 'BAR019', 58, '250ml', 'Lemon dishwash liquid'],
  ['P020', 'SUP-007', 'Detergent Powder', 'Home Care', 'BAR020', 96, '1kg', 'Washing powder'],
];

// [id, productId, stock, reorderLevel, location]
const INVENTORY = [
  ['INV-001', 'P001', 145, 20, 'Shelf A1'],
  ['INV-002', 'P002', 230, 20, 'Shelf A2'],
  ['INV-003', 'P003', 18, 20, 'Shelf A3'],
  ['INV-004', 'P005', 14, 20, 'Shelf B3'],
  ['INV-005', 'P010', 122, 15, 'Shelf A4'],
  ['INV-006', 'P011', 64, 10, 'Shelf A5'],
  ['INV-007', 'P012', 21, 25, 'Shelf B1'],
  ['INV-008', 'P013', 88, 10, 'Shelf B2'],
  ['INV-009', 'P014', 172, 15, 'Shelf C1'],
  ['INV-010', 'P015', 154, 15, 'Shelf C2'],
  ['INV-011', 'P016', 37, 10, 'Shelf D1'],
  ['INV-012', 'P017', 9, 15, 'Shelf D2'],
  ['INV-013', 'P019', 48, 10, 'Shelf E1'],
  ['INV-014', 'P020', 0, 10, 'Shelf E2'],
];

async function seed(client) {
  for (const c of COMPANIES) {
    await client.query(
      `INSERT INTO companies (id, name, owner, admin_name, type, email, phone, gst_no, address,
                             status, products_plan, tenure_months, stores_count, profit, payment_due)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO NOTHING`,
      c,
    );
  }

  for (const [id, companyId, name, role, email, mobileNo, username, password] of USERS) {
    const hash = bcrypt.hashSync(password, 10);
    await client.query(
      `INSERT INTO users (id, company_id, name, role, email, mobile_no, username, password_hash, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Active')
       ON CONFLICT (id) DO NOTHING`,
      [id, companyId, name, role, email, mobileNo, username, hash],
    );
  }

  for (const c of CUSTOMERS) {
    await client.query(
      `INSERT INTO customers (id, company_id, phone, name, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      c,
    );
  }

  for (const s of SUPPLIERS) {
    await client.query(
      `INSERT INTO suppliers (id, name, mobile_no, email, address, gst_no)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      s,
    );
  }

  for (const p of PRODUCTS) {
    await client.query(
      `INSERT INTO products (id, supplier_id, name, category, barcode, price, size, description, company_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'BIZ-101')
       ON CONFLICT (id) DO NOTHING`,
      p,
    );
  }

  for (const [id, productId, stock, reorderLevel, location] of INVENTORY) {
    await client.query(
      `INSERT INTO inventory (id, product_id, company_id, stock, reorder_level, location)
       VALUES ($1,$2,'BIZ-101',$3,$4,$5)
       ON CONFLICT (id) DO NOTHING`,
      [id, productId, stock, reorderLevel, location],
    );
  }

  // Two starter orders mirroring what the previous in-memory backend served.
  await client.query(
    `INSERT INTO orders (id, company_id, customer_id, customer_name, staff_id, order_type,
                        checkout_mode, status, payment_method, total, items_count)
     VALUES ('ORD-4801','BIZ-101','CUS-001','Meera Shah','USR-002','pickup','takeaway_now',
             'Processing','Cash',120,1),
            ('ORD-4802','BIZ-101','CUS-002','Arjun Rao','USR-002','delivery','delivery_now',
             'Processing','UPI',340,1)
     ON CONFLICT (id) DO NOTHING`,
  );

  await client.query(
    `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, item_price)
     VALUES ('OI-0001','ORD-4801','P001','Basmati Rice',1,120),
            ('OI-0002','ORD-4802','P002','Toor Dal',1,340)
     ON CONFLICT (id) DO NOTHING`,
  );

  await client.query(
    `INSERT INTO deliveries (id, order_id, company_id, customer, address, partner, partner_phone,
                            status, eta_min)
     VALUES ('DLV-001','ORD-4802','BIZ-101','Arjun Rao','4 Lake View Road, Powai, Mumbai',
             'Dunzo','9822004411','In Transit',35)
     ON CONFLICT (id) DO NOTHING`,
  );
}

if (require.main === module) {
  // SKIP_DB_SEED=1 opts out of demo data at boot — for real deployments that
  // want an empty database. Migrations always run.
  if (process.env.SKIP_DB_SEED === '1') {
    console.log('[seed] skipped (SKIP_DB_SEED=1)');
  } else {
    (async () => {
      const client = await connectDirect();
      try {
        await seed(client);
        console.log('[seed] done (existing rows left untouched)');
      } finally {
        await client.end();
      }
    })().catch((err) => {
      console.error('[seed] FAILED:', err.message);
      process.exit(1);
    });
  }
}

module.exports = { seed };
