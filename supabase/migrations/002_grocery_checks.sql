-- One row per user storing the set of checked grocery item keys.
-- Run this in the Supabase SQL Editor after 001_initial.sql.

CREATE TABLE IF NOT EXISTS grocery_checks (
  user_token  TEXT   PRIMARY KEY,
  keys        JSONB  NOT NULL DEFAULT '[]'
);

ALTER TABLE grocery_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON grocery_checks;
CREATE POLICY "anon_all" ON grocery_checks
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
