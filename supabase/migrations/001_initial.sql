-- Run this once in the Supabase SQL Editor (or via the Supabase CLI).
-- It creates the two tables and enables Row Level Security with open
-- policies so the anon key can read/write.  A user_token (random UUID
-- stored in localStorage) partitions each device's data without requiring
-- accounts.  Swap the policies for auth.uid()-based ones when you add auth.

-- ── recipes ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recipes (
  id           UUID        PRIMARY KEY,
  user_token   TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  ingredients  JSONB       NOT NULL DEFAULT '[]',
  directions   TEXT[]      NOT NULL DEFAULT '{}',
  servings     INTEGER     NOT NULL DEFAULT 4,
  prep_time    INTEGER,
  cook_time    INTEGER,
  source_url   TEXT,
  tags         TEXT[],
  tools        TEXT[],
  image_url    TEXT,
  date_added   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_made    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS recipes_user_token_idx ON recipes (user_token);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON recipes;
CREATE POLICY "anon_all" ON recipes
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── meal_plans ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_plans (
  id          TEXT        PRIMARY KEY,
  user_token  TEXT        NOT NULL,
  date        DATE        NOT NULL,
  meal_type   TEXT        NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  recipe_id   UUID        REFERENCES recipes (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS meal_plans_user_token_idx ON meal_plans (user_token);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all" ON meal_plans;
CREATE POLICY "anon_all" ON meal_plans
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
