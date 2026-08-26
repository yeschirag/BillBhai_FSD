-- V2 billing: split payments + held bills (additive; no data is touched).
--
-- 1. A bill can now be settled across several payment rows (cash + UPI,
--   partial deposits, …). The old UNIQUE constraint allowed exactly one
--   payment per bill, so it is dropped; the FK and index remain.
-- 2. held_bills parks a POS cart server-side so it can be resumed on any
--   device. The cart payload is JSONB — the client owns its shape; the
--   server only guarantees integrity of the envelope.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_bill_no_key;

CREATE SEQUENCE held_bill_id_seq START WITH 1;

CREATE TABLE held_bills (
  id         text PRIMARY KEY DEFAULT 'HOLD-' || lpad(nextval('held_bill_id_seq')::text, 4, '0'),
  company_id text NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  staff_id   text REFERENCES users(id) ON DELETE SET NULL,
  label      text NOT NULL DEFAULT '',
  cart       jsonb NOT NULL,
  total      numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_held_bills_company ON held_bills (company_id, created_at DESC);

CREATE TRIGGER trg_held_bills_updated BEFORE UPDATE ON held_bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
