-- Admin paneli (social_dance_admin) ile aynı şema; mobil şikayetler burada birikir.
CREATE TABLE IF NOT EXISTS moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('user', 'conversation')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
  reporter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES dm_conversations(id) ON DELETE SET NULL,
  reported_message_id UUID REFERENCES dm_messages(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  resolution_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT moderation_reports_target_check CHECK (
    (report_type = 'user' AND reported_profile_id IS NOT NULL) OR
    (report_type = 'conversation' AND conversation_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status
  ON moderation_reports(status);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_type
  ON moderation_reports(report_type);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter
  ON moderation_reports(reporter_profile_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reported
  ON moderation_reports(reported_profile_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_conversation
  ON moderation_reports(conversation_id);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_created_at
  ON moderation_reports(created_at DESC);

ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderation_reports_insert_own ON moderation_reports;
CREATE POLICY moderation_reports_insert_own
  ON moderation_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_profile_id = auth.uid());

-- POST ... Prefer: return=representation dönüşü için (RETURNING satırı SELECT politikasından geçer)
DROP POLICY IF EXISTS moderation_reports_select_reporter_own ON moderation_reports;
CREATE POLICY moderation_reports_select_reporter_own
  ON moderation_reports
  FOR SELECT
  TO authenticated
  USING (reporter_profile_id = auth.uid());
