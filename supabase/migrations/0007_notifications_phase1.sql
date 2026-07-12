-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007_notifications_phase1.sql
-- Page 22 — Notifications (Phase 1: display / read / delete).
--
-- The `notifications` table itself and its base RLS (select/update/delete
-- own rows only) already exist — see 0001_init.sql and 0002_rls_policies.sql
-- (`notifications: user can select own` / `... update own` / `... delete
-- own`, all scoped to `auth.uid() = user_id`). This migration adds what
-- Page 22 needs on top of that:
--   1. A CHECK constraint pinning `type` to the notification types documented
--      in docs/en/pages/22-notifications.md §3.3.
--   2. An INSERT policy scoped to `auth.uid() = user_id` — defense in depth
--      for future producer code that creates notification rows from a
--      user-scoped client (this task does not implement those producers;
--      most real inserts will go through the service-role client, which
--      bypasses RLS entirely).
--   3. Indexes for the two read paths Page 22 adds: the cursor-paginated
--      list (GET /api/notifications) and the unread badge/count
--      (GET /api/notifications/unread-count).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
      'message',
      'price_drop',
      'saved_search_match',
      'listing_approved',
      'listing_rejected',
      'listing_expiring',
      'new_review'
    ));

DROP POLICY IF EXISTS "notifications: user can insert own" ON notifications;

CREATE POLICY "notifications: user can insert own"
  ON notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Powers GET /api/notifications (cursor pagination newest-first per user).
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);

-- Powers GET /api/notifications/unread-count and the `unread` filter tab —
-- partial index keeps it small since most rows end up read.
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON notifications (user_id)
  WHERE is_read = FALSE;
