-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0006_messages_inbox.sql
-- Page 09 — Messages / Inbox (Phase 1).
--
-- Extends `conversations`/`messages` (created in 0001_init.sql) with the
-- columns the inbox needs, and adds `blocks` + `reports` tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS — archive / mute / block state + denormalized last-message time
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS archived        BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS muted           BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS blocked_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS conversations_buyer_last_message_idx
  ON conversations (buyer_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS conversations_seller_last_message_idx
  ON conversations (seller_id, last_message_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES — image attachments (jsonb array of { url, type })
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at DESC);

-- Keep conversations.last_message_at / updated_at in sync with new messages so
-- the conversation list can `ORDER BY last_message_at DESC` without an extra
-- per-row subquery, and so it re-orders correctly under concurrent writes.
CREATE OR REPLACE FUNCTION messages_touch_conversation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS messages_touch_conversation_trigger ON messages;
CREATE TRIGGER messages_touch_conversation_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION messages_touch_conversation();

-- ─────────────────────────────────────────────────────────────────────────────
-- BLOCKS — one user blocking another (disables messaging both ways)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (blocker_id <> blocked_id),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- A user can see blocks where they are either side (needed so the blocked
-- party also sees the send box disabled), but can only create/remove the
-- block they initiated.
CREATE POLICY "blocks: participant can select"
  ON blocks
  FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "blocks: blocker can insert"
  ON blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "blocks: blocker can delete"
  ON blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REPORTS — conversation reports routed to the admin moderation queue
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id  UUID        REFERENCES conversations(id) ON DELETE SET NULL,
  reason           TEXT        NOT NULL CHECK (reason IN ('spam', 'fraud', 'abuse', 'other')),
  note             TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can only see/insert reports they filed themselves. Moderation review
-- (24-admin.md) reads this table with the service-role client, bypassing RLS.
CREATE POLICY "reports: reporter can select own"
  ON reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "reports: reporter can insert"
  ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES — sending is blocked once either participant has blocked the other
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages: participants can insert" ON messages;

CREATE POLICY "messages: participants can insert"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
        AND NOT EXISTS (
          SELECT 1 FROM blocks b
          WHERE (b.blocker_id = c.buyer_id AND b.blocked_id = c.seller_id)
             OR (b.blocker_id = c.seller_id AND b.blocked_id = c.buyer_id)
        )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- STORAGE — public bucket for chat image attachments
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Any authenticated user may upload (path is namespaced by conversation id at
-- the application layer); the bucket is public so images render directly.
CREATE POLICY "message-attachments: authenticated can upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "message-attachments: public can read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'message-attachments');
