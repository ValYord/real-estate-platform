-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0007_contact_messages.sql
-- Page 23 (Static pages) — /contact form submissions.
--
-- Design:
--   • Anyone (anonymous or authenticated) may INSERT a contact message —
--     the public contact form has no login wall.
--   • Nobody may SELECT/UPDATE/DELETE via the client. Reading and triaging
--     submissions is an Admin-only concern (Page 24, not built in this
--     task) and goes through the service-role key from a trusted server
--     context, which bypasses RLS entirely.
--   • `status` defaults to 'new' so a future moderation queue can filter on
--     it without a schema change.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS contact_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT,
  subject     TEXT        NOT NULL
                CHECK (subject IN ('general', 'support', 'partnership', 'complaint')),
  body        TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'read', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Anonymous and authenticated visitors can submit the contact form.
-- No USING clause is needed for INSERT-only policies; WITH CHECK (true)
-- allows any row shape that already passed the column CHECK constraints.
CREATE POLICY "contact_messages: anyone can insert"
  ON contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Intentionally NO SELECT / UPDATE / DELETE policy for anon/authenticated:
-- with RLS enabled and no permissive policy for those commands, all such
-- queries are denied by default. Only the service-role key (used from a
-- trusted server context) can read or triage submissions.
