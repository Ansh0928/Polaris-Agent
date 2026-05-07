CREATE TABLE IF NOT EXISTS decision_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES agent_runs(id),
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  tool_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS decision_log_run_id_idx ON decision_log(run_id);
