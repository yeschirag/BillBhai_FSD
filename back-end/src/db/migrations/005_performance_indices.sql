-- ---------------------------------------------------------------------------
-- Migration 005: Performance Indices
-- Adds missing indices to speed up large scans on frequently filtered columns.
-- ---------------------------------------------------------------------------

BEGIN;

-- Orders are heavily filtered by company_id and status (e.g. pending vs completed)
CREATE INDEX IF NOT EXISTS idx_orders_company_status ON orders (company_id, status);

-- Deliveries are filtered by company_id and status
CREATE INDEX IF NOT EXISTS idx_deliveries_company_status ON deliveries (company_id, status);

-- Returns are filtered by company_id and status
CREATE INDEX IF NOT EXISTS idx_returns_company_status ON returns (company_id, status);

-- Inventory low-stock checks can be accelerated
CREATE INDEX IF NOT EXISTS idx_inventory_company_stock ON inventory (company_id, stock);

COMMIT;
