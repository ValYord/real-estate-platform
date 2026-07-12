-- ─────────────────────────────────────────────────────────────────────────
-- Migration 0009_tours.sql
-- Page 27 — Schedule a Tour (MVP scope — see docs/design/27-schedule-tour-handoff.md §1).
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tours (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_id   UUID        REFERENCES profiles(id) ON DELETE SET NULL, -- NULL for guest requesters
  tour_type      TEXT        NOT NULL CHECK (tour_type IN ('in_person', 'video')),
  requested_at   TIMESTAMPTZ NOT NULL,
  name           TEXT        NOT NULL,
  phone          TEXT        NOT NULL,
  note           TEXT,
  -- Single value in MVP (no confirm/decline/counter-propose workflow — see
  -- handoff §1 C4). Extend this CHECK the same way 0007_notifications_phase1.sql
  -- extended notifications_type_check, if/when that workflow ships.
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status = 'pending'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tours ENABLE ROW LEVEL SECURITY;

-- Requester can read their own tour requests (logged-in requesters only —
-- guests have no auth.uid() and can't read anything back, by design).
CREATE POLICY "tours: requester can select own"
  ON tours FOR SELECT
  USING (auth.uid() = requester_id);

-- Listing owner/agent can read requests made against their own listings.
CREATE POLICY "tours: owner can select own listings requests"
  ON tours FOR SELECT
  USING (auth.uid() = owner_id);

-- Defense-in-depth INSERT policy for any future user-scoped client path
-- (today's POST /api/tours always inserts via the service-role admin client,
-- per §6, precisely because guest rows have requester_id = NULL and no
-- auth.uid() to check) — same rationale as notifications' own INSERT policy
-- in 0007_notifications_phase1.sql.
CREATE POLICY "tours: requester can insert own"
  ON tours FOR INSERT
  WITH CHECK (auth.uid() = requester_id OR requester_id IS NULL);

CREATE INDEX IF NOT EXISTS tours_owner_created_idx
  ON tours (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tours_requester_idx
  ON tours (requester_id)
  WHERE requester_id IS NOT NULL;

-- "Already requested" de-dup (states table in the ticket's acceptance
-- criteria): one pending request per (property, requester) for logged-in
-- users, one pending request per (property, phone) for guests. The route
-- (§6) catches the resulting unique_violation (23505) and returns 409.
CREATE UNIQUE INDEX IF NOT EXISTS tours_one_pending_per_user
  ON tours (property_id, requester_id)
  WHERE requester_id IS NOT NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS tours_one_pending_per_guest_phone
  ON tours (property_id, phone)
  WHERE requester_id IS NULL AND status = 'pending';

-- Extend the existing notifications type CHECK (same pattern as
-- 0007_notifications_phase1.sql) to allow the new producer this task adds.
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
      'new_review',
      'tour_requested'
    ));
