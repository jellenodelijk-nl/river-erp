-- Add parent_id to projecten for sub-projects
ALTER TABLE projecten ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES projecten(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_projecten_parent ON projecten(parent_id);
