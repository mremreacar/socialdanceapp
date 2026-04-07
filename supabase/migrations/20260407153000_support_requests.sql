CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'closed')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_requests_profile_id
  ON support_requests(profile_id);

CREATE INDEX IF NOT EXISTS idx_support_requests_status
  ON support_requests(status);

CREATE INDEX IF NOT EXISTS idx_support_requests_created_at
  ON support_requests(created_at DESC);

CREATE OR REPLACE FUNCTION set_support_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_requests_updated_at ON support_requests;
CREATE TRIGGER trg_support_requests_updated_at
BEFORE UPDATE ON support_requests
FOR EACH ROW
EXECUTE FUNCTION set_support_requests_updated_at();

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_requests_insert_own ON support_requests;
CREATE POLICY support_requests_insert_own
  ON support_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS support_requests_select_own ON support_requests;
CREATE POLICY support_requests_select_own
  ON support_requests
  FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS support_requests_update_own ON support_requests;
CREATE POLICY support_requests_update_own
  ON support_requests
  FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());
