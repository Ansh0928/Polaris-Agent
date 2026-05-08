CREATE TABLE IF NOT EXISTS agent_memory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  run_id UUID REFERENCES agent_runs(id),
  written_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS memory_history_key_idx ON agent_memory_history(key);
CREATE INDEX IF NOT EXISTS memory_history_written_at_idx ON agent_memory_history(written_at DESC);
