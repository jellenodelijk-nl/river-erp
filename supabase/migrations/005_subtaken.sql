-- Add parent_id to taken for subtasks
ALTER TABLE taken ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES taken(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_taken_parent ON taken(parent_id);
