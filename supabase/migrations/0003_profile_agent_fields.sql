-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0003_profile_agent_fields.sql
-- Adds agent-specific columns to profiles table.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS agency_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS license_no  TEXT;
