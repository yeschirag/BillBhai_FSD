-- V2 backend foundations (additive only — no existing column changes).
--
-- 1. stock_movements: an append-only ledger of WHY stock changed. The
--    inventory row stays the fast current-state read; the ledger answers
--    "stock history" and lets us audit that inventory and order history
--    never disagree.
-- 2. products.gst_rate / purchase_price: per-product financials so invoices
--    can show GST line items and reports can compute profit margins.

CREATE TABLE stock_movements (
  id            bigserial PRIMARY KEY,
  company_id    text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id    text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta         integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reason        text NOT NULL CHECK (reason IN ('sale', 'adjustment', 'return', 'correction')),
  reference_id  text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_product ON stock_movements (company_id, product_id, created_at DESC);
CREATE INDEX idx_movements_company_time ON stock_movements (company_id, created_at DESC);

ALTER TABLE products
  ADD COLUMN gst_rate       numeric(5,2) NOT NULL DEFAULT 0 CHECK (gst_rate >= 0),
  ADD COLUMN purchase_price numeric(10,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0);
