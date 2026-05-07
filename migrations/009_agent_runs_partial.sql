ALTER TABLE agent_runs DROP CONSTRAINT IF EXISTS agent_runs_status_check;
ALTER TABLE agent_runs ADD CONSTRAINT agent_runs_status_check
  CHECK (status IN ('success', 'error', 'partial', 'running'));

ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS partial_state JSONB;
