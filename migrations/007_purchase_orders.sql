CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES agent_runs(id),
  product_id UUID REFERENCES products(id),
  supplier TEXT NOT NULL,
  qty NUMERIC(10,2) NOT NULL,
  price_per_unit_aud NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'received', 'cancelled')),
  agent_reason TEXT,
  approve_token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS purchase_orders_approve_token_idx ON purchase_orders(approve_token);
CREATE INDEX IF NOT EXISTS purchase_orders_run_id_idx ON purchase_orders(run_id);
