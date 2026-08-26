-- BillBhai initial PostgreSQL schema.
--
-- Derived from the de-facto in-memory model that shipped with the NestJS
-- prototype and the first Express migration (see legacy-nest/ for reference):
-- companies, users, customers, suppliers, products, inventory, orders,
-- order_items, bills, payments, deliveries, returns.
--
-- Design notes:
-- * Primary keys keep the human-readable business codes (ORD-4829, BILL-001…)
--   that the API contract and the frontend already rely on. They are generated
--   database-side from sequences so concurrent inserts can never collide.
-- * Money is numeric(x,2); stock/quantities are integers guarded by CHECKs.
-- * Timestamps are timestamptz everywhere; created_at/updated_at are managed
--   by defaults plus a trigger.
-- * Status vocabularies mirror exactly the option lists the frontend ships
--   (DeliveryPage, ReturnsPage, UsersPage, BusinessesPage, OrdersPage).
-- * products.company_id / suppliers are intentionally tenant-agnostic today;
--   a NULL company_id means "shared catalog item". Inventory is per-company.

BEGIN;

-- ---------------------------------------------------------------------------
-- Sequences backing the business-coded identifiers
-- ---------------------------------------------------------------------------

CREATE SEQUENCE company_id_seq   START WITH 103;  -- seeds end at BIZ-102
CREATE SEQUENCE user_id_seq      START WITH 8;    -- seeds end at USR-007
CREATE SEQUENCE customer_id_seq  START WITH 3;    -- seeds end at CUS-002
CREATE SEQUENCE supplier_id_seq  START WITH 8;    -- seeds end at SUP-007
CREATE SEQUENCE product_id_seq   START WITH 21;   -- seeds end at P020
CREATE SEQUENCE inventory_id_seq START WITH 15;   -- seeds end at INV-014
CREATE SEQUENCE order_id_seq     START WITH 4830; -- above every legacy counter
CREATE SEQUENCE order_item_id_seq START WITH 3;   -- seeds end at OI-0002
CREATE SEQUENCE bill_id_seq      START WITH 3;    -- seeds end at BILL-002
CREATE SEQUENCE payment_id_seq   START WITH 3;    -- seeds end at PAY-002
CREATE SEQUENCE delivery_id_seq  START WITH 2;    -- seeds end at DLV-001
CREATE SEQUENCE return_id_seq    START WITH 222;  -- legacy ended at RET-221

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Tenants
-- ---------------------------------------------------------------------------

CREATE TABLE companies (
  id            text PRIMARY KEY DEFAULT 'BIZ-' || lpad(nextval('company_id_seq')::text, 3, '0'),
  name          text NOT NULL,
  owner         text NOT NULL DEFAULT 'Unknown Owner',
  admin_name    text NOT NULL DEFAULT 'Unassigned',
  type          text NOT NULL DEFAULT 'Retail',
  email         text NOT NULL DEFAULT '',
  phone         text NOT NULL DEFAULT '',
  gst_no        text NOT NULL DEFAULT '',
  address       text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'Trial'
                CHECK (status IN ('Active', 'Trial', 'Opening Soon', 'Suspended', 'Closed')),
  products_plan text NOT NULL DEFAULT 'Core POS',
  tenure_months integer NOT NULL DEFAULT 0 CHECK (tenure_months >= 0),
  stores_count  integer NOT NULL DEFAULT 0 CHECK (stores_count >= 0),
  profit        numeric(14,2) NOT NULL DEFAULT 0 CHECK (profit >= 0),
  payment_due   numeric(12,2) NOT NULL DEFAULT 0 CHECK (payment_due >= 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff accounts. Passwords are bcrypt hashes; never returned by the API.
-- ---------------------------------------------------------------------------

CREATE TABLE users (
  id            text PRIMARY KEY DEFAULT 'USR-' || lpad(nextval('user_id_seq')::text, 3, '0'),
  company_id    text NOT NULL REFERENCES companies(id),
  name          text NOT NULL,
  role          text NOT NULL DEFAULT 'cashier'
                CHECK (role IN ('superuser', 'admin', 'cashier', 'customer',
                                'inventorymanager', 'deliveryops', 'returnhandler')),
  email         text NOT NULL DEFAULT '',
  mobile_no     text NOT NULL DEFAULT '',
  username      text NOT NULL,
  password_hash text NOT NULL,
  status        text NOT NULL DEFAULT 'Active'
                CHECK (status IN ('Active', 'Inactive', 'Suspended')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Usernames are stored canonical-lowercase by the service layer.
CREATE UNIQUE INDEX idx_users_username ON users (lower(username));
CREATE INDEX idx_users_company ON users (company_id);

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Customers. Phone lookup must stay unambiguous inside a tenant, but
-- walk-ins without a phone number are allowed (partial unique index).
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
  id         text PRIMARY KEY DEFAULT 'CUS-' || lpad(nextval('customer_id_seq')::text, 3, '0'),
  company_id text NOT NULL REFERENCES companies(id),
  phone      text NOT NULL DEFAULT '',
  name       text NOT NULL DEFAULT 'Walk-in',
  email      text NOT NULL DEFAULT '',
  address    text NOT NULL DEFAULT '',
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_customers_company_phone ON customers (company_id, phone)
  WHERE phone <> '';
CREATE INDEX idx_customers_company ON customers (company_id);

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Suppliers (shared across tenants, as in the original design)
-- ---------------------------------------------------------------------------

CREATE TABLE suppliers (
  id         text PRIMARY KEY DEFAULT 'SUP-' || lpad(nextval('supplier_id_seq')::text, 3, '0'),
  name       text NOT NULL,
  mobile_no  text NOT NULL DEFAULT '',
  email      text NOT NULL DEFAULT '',
  address    text NOT NULL DEFAULT '',
  gst_no     text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Products. supplier_id optional; company_id NULL = shared catalog item.
-- Deleting a supplier keeps its products (SET NULL).
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id          text PRIMARY KEY DEFAULT 'P' || lpad(nextval('product_id_seq')::text, 3, '0'),
  supplier_id text REFERENCES suppliers(id) ON DELETE SET NULL,
  name        text NOT NULL,
  category    text NOT NULL DEFAULT 'General',
  barcode     text,
  price       numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  size        text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  company_id  text REFERENCES companies(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_products_barcode ON products (barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';
CREATE INDEX idx_products_supplier ON products (supplier_id);
CREATE INDEX idx_products_company ON products (company_id);
CREATE INDEX idx_products_category ON products (category);

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-company stock levels. One row per (product, company). The derived
-- "status" label is computed at read time, never stored.
-- ---------------------------------------------------------------------------

CREATE TABLE inventory (
  id            text PRIMARY KEY DEFAULT 'INV-' || lpad(nextval('inventory_id_seq')::text, 3, '0'),
  product_id    text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  company_id    text NOT NULL REFERENCES companies(id),
  stock         integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_level integer NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  location      text NOT NULL DEFAULT '',
  last_updated  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_product_company_unique UNIQUE (product_id, company_id)
);

CREATE INDEX idx_inventory_company ON inventory (company_id);
CREATE INDEX idx_inventory_product ON inventory (product_id);
-- Serves GET /inventory/low-stock directly.
CREATE INDEX idx_inventory_low_stock ON inventory (company_id)
  WHERE stock <= reorder_level;

CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders + line items. Customer/staff identity is nullable with denormalized
-- name/address snapshots so order history survives reference deletion.
-- ---------------------------------------------------------------------------

CREATE TABLE orders (
  id               text PRIMARY KEY DEFAULT 'ORD-' || lpad(nextval('order_id_seq')::text, 4, '0'),
  company_id       text NOT NULL REFERENCES companies(id),
  customer_id      text REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    text NOT NULL DEFAULT '',
  customer_address text NOT NULL DEFAULT '',
  staff_id         text REFERENCES users(id) ON DELETE SET NULL,
  order_date       timestamptz NOT NULL DEFAULT now(),
  order_type       text NOT NULL DEFAULT 'pickup',
  checkout_mode    text NOT NULL DEFAULT '',
  status           text NOT NULL DEFAULT 'Processing'
                   CHECK (status IN ('Pending', 'Processing', 'Delivered', 'Cancelled', 'Completed')),
  discount_amount  numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  promo_code       text,
  payment_method   text NOT NULL DEFAULT 'Pending',
  total            numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  items_count      integer NOT NULL DEFAULT 0 CHECK (items_count >= 0),
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_company_date ON orders (company_id, order_date DESC);
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_staff ON orders (staff_id);

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id           text PRIMARY KEY DEFAULT 'OI-' || lpad(nextval('order_item_id_seq')::text, 4, '0'),
  order_id     text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   text REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL DEFAULT '',
  quantity     integer NOT NULL CHECK (quantity > 0),
  item_price   numeric(10,2) NOT NULL CHECK (item_price >= 0)
);

CREATE INDEX idx_order_items_order ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- ---------------------------------------------------------------------------
-- Bills (one per order) and payments (one per bill, as per the POS flow).
-- NO ACTION on orders→bills keeps paid history alive: an order that has been
-- billed cannot be silently deleted.
-- ---------------------------------------------------------------------------

CREATE TABLE bills (
  bill_no         text PRIMARY KEY DEFAULT 'BILL-' || lpad(nextval('bill_id_seq')::text, 3, '0'),
  order_id        text NOT NULL UNIQUE REFERENCES orders(id),
  company_id      text NOT NULL REFERENCES companies(id),
  bill_date       timestamptz NOT NULL DEFAULT now(),
  tax_amount      numeric(10,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  discount_amount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bills_order ON bills (order_id);
CREATE INDEX idx_bills_company_date ON bills (company_id, bill_date DESC);

CREATE TABLE payments (
  id             text PRIMARY KEY DEFAULT 'PAY-' || lpad(nextval('payment_id_seq')::text, 3, '0'),
  bill_no        text NOT NULL UNIQUE REFERENCES bills(bill_no) ON DELETE CASCADE,
  company_id     text NOT NULL REFERENCES companies(id),
  payment_date   timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL,
  payment_status text NOT NULL DEFAULT 'Paid'
                 CHECK (payment_status IN ('Paid', 'Partial', 'Failed', 'Refunded')),
  amount_paid    numeric(12,2) NOT NULL CHECK (amount_paid >= 0),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_bill ON payments (bill_no);
CREATE INDEX idx_payments_company_date ON payments (company_id, payment_date DESC);

-- ---------------------------------------------------------------------------
-- Deliveries. A delivery fulfills an order; deleting the order removes it.
-- ---------------------------------------------------------------------------

CREATE TABLE deliveries (
  id            text PRIMARY KEY DEFAULT 'DLV-' || lpad(nextval('delivery_id_seq')::text, 3, '0'),
  order_id      text REFERENCES orders(id) ON DELETE CASCADE,
  company_id    text NOT NULL REFERENCES companies(id),
  customer      text NOT NULL DEFAULT 'Walk-in',
  address       text NOT NULL DEFAULT '',
  partner       text NOT NULL DEFAULT 'Unassigned',
  partner_phone text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending', 'In Transit', 'Delivered', 'Cancelled')),
  eta_min       integer CHECK (eta_min IS NULL OR eta_min >= 0),
  dispatched_at timestamptz NOT NULL DEFAULT now(),
  delivered_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_company_status ON deliveries (company_id, status);
CREATE INDEX idx_deliveries_order ON deliveries (order_id);

CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Returns. Financial/audit records: deleting an order keeps the return
-- (SET NULL) rather than destroying refund history.
-- ---------------------------------------------------------------------------

CREATE TABLE returns (
  id           text PRIMARY KEY DEFAULT 'RET-' || lpad(nextval('return_id_seq')::text, 4, '0'),
  order_id     text REFERENCES orders(id) ON DELETE SET NULL,
  company_id   text NOT NULL REFERENCES companies(id),
  staff_id     text REFERENCES users(id) ON DELETE SET NULL,
  reason       text NOT NULL DEFAULT 'Return requested',
  product      text NOT NULL DEFAULT '',
  qty          integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  return_type  text NOT NULL DEFAULT 'refund'
               CHECK (return_type IN ('refund', 'replacement', 'credit')),
  amount       numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status       text NOT NULL DEFAULT 'Pending'
               CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Refunded', 'Closed')),
  requested_by text NOT NULL DEFAULT 'Customer',
  return_date  timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_returns_company_status ON returns (company_id, status);
CREATE INDEX idx_returns_order ON returns (order_id);

CREATE TRIGGER trg_returns_updated BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
