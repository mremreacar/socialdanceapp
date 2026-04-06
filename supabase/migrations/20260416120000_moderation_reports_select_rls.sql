-- Önceki migration yalnızca INSERT içeriyorsa: mobil POST + return=representation RLS’e takılır.
-- RETURNING satırları SELECT politikası gerektirir.

DROP POLICY IF EXISTS moderation_reports_select_reporter_own ON moderation_reports;
CREATE POLICY moderation_reports_select_reporter_own
  ON moderation_reports
  FOR SELECT
  TO authenticated
  USING (reporter_profile_id = auth.uid());
