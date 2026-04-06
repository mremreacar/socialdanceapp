CREATE TABLE IF NOT EXISTS profile_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_blocks_unique UNIQUE (blocker_profile_id, blocked_profile_id),
  CONSTRAINT profile_blocks_not_self CHECK (blocker_profile_id <> blocked_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocker
  ON profile_blocks(blocker_profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_blocks_blocked
  ON profile_blocks(blocked_profile_id);

ALTER TABLE profile_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_blocks_select_own ON profile_blocks;
CREATE POLICY profile_blocks_select_own
  ON profile_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_profile_id = auth.uid());

DROP POLICY IF EXISTS profile_blocks_insert_own ON profile_blocks;
CREATE POLICY profile_blocks_insert_own
  ON profile_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_profile_id = auth.uid());

DROP POLICY IF EXISTS profile_blocks_delete_own ON profile_blocks;
CREATE POLICY profile_blocks_delete_own
  ON profile_blocks
  FOR DELETE
  TO authenticated
  USING (blocker_profile_id = auth.uid());
