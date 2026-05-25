-- Adds the shared grocery state used by family sync and editable grocery items.
-- Safe to run after 002_grocery_checks.sql.

ALTER TABLE grocery_checks
  ADD COLUMN IF NOT EXISTS custom_items JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS deleted_keys JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS renamed_items JSONB NOT NULL DEFAULT '{}';
