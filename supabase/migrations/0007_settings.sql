-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007_settings.sql
-- Page 21 — Settings (Phase 1).
--
-- Adds the columns the Settings page needs to `profiles` (this project's
-- `users` entity — see 0001_init.sql). RLS is already fully covered by the
-- "profiles: owner can select/insert/update" policies added in
-- 0002_rls_policies.sql (Postgres RLS is row-level, not column-level, so no
-- new policy is required for these new columns — a user can already only
-- read/update the row where `auth.uid() = id`).
-- ─────────────────────────────────────────────────────────────────────────────

-- Preferences tab: interface language, display currency, color theme.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'hy'
    CHECK (lang IN ('hy', 'ru', 'en'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'AMD'
    CHECK (currency IN ('AMD', 'USD', 'EUR', 'RUB'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light', 'dark', 'system'));

-- Notification settings tab: master email/push toggles + per-event-type prefs.
-- Shape: { emailEnabled, pushEnabled, types: { <eventType>: { email, push } } }
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{
    "emailEnabled": true,
    "pushEnabled": true,
    "types": {
      "message":           { "email": true,  "push": true  },
      "price_drop":        { "email": true,  "push": false },
      "saved_search":      { "email": true,  "push": false },
      "listing_status":    { "email": true,  "push": true  },
      "listing_expiring":  { "email": true,  "push": false },
      "review":            { "email": true,  "push": true  },
      "marketing":         { "email": false, "push": false }
    }
  }'::jsonb;

-- Privacy tab: who can contact me + hide phone number on public listings.
-- Shape: { contactPreference: 'everyone' | 'registered' | 'no_one', hidePhone: boolean }
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS privacy JSONB NOT NULL DEFAULT '{
    "contactPreference": "everyone",
    "hidePhone": false
  }'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE — public bucket for profile avatars (§3.2 avatar uploader).
-- Mirrors the message-attachments bucket pattern from 0006_messages_inbox.sql.
-- app/api/upload/avatar/route.ts writes to `avatars/<user-id>/<file>` using the
-- session-scoped client, so the INSERT/UPDATE/DELETE policies below restrict
-- writes to the caller's own folder (object path's 2nd segment == auth.uid(),
-- the 1st segment being the redundant literal "avatars" folder prefix).
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars: public can read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars: owner can upload own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "avatars: owner can update own folder"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "avatars: owner can delete own folder"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[2] = auth.uid()::text);
