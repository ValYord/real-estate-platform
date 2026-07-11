/**
 * Static check for the Page 09 (Messages / Inbox) Supabase migration
 * (supabase/migrations/0006_messages_inbox.sql).
 *
 * There is no live Supabase instance in CI to exercise RLS against, so this
 * is the "documented RLS check" referenced in the task's acceptance
 * criteria: it asserts, by reading the migration SQL itself, that:
 *   - `blocks` and `reports` both enable Row Level Security, and
 *   - every policy on them scopes rows to `auth.uid()` (the acting user),
 *     never granting unrestricted SELECT/INSERT.
 *   - `messages` INSERT is re-guarded to also deny blocked pairs.
 *
 * (`conversations`/`messages` base RLS — participants-only via buyer_id/
 * seller_id — was added in 0002_rls_policies.sql and is not re-asserted
 * here; see that file for those policies.)
 *
 * Manual verification checklist (run against a real Supabase project before
 * shipping to production, since `supabase db push` isn't part of this CI):
 *   1. As user A, `select * from blocks` — only rows where A is blocker or
 *      blocked should return; other users' blocks must not appear.
 *   2. As user A (not a participant of conversation X), attempt
 *      `insert into messages (conversation_id, sender_id, body) values (X, A, '...')`
 *      — must be rejected by RLS (42501).
 *   3. Block user B as user A, then attempt `insert into messages` as B into
 *      a shared conversation — must be rejected.
 *   4. As user A, `select * from reports` — only rows where A is the
 *      reporter should return.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const migrationSql = readFileSync(
  join(__dirname, '../supabase/migrations/0006_messages_inbox.sql'),
  'utf-8',
)

describe('0006_messages_inbox.sql — RLS is enabled', () => {
  it('enables RLS on blocks', () => {
    expect(migrationSql).toMatch(/ALTER TABLE blocks ENABLE ROW LEVEL SECURITY/)
  })

  it('enables RLS on reports', () => {
    expect(migrationSql).toMatch(/ALTER TABLE reports ENABLE ROW LEVEL SECURITY/)
  })
})

describe('0006_messages_inbox.sql — blocks policies scope to auth.uid()', () => {
  it('SELECT policy restricts to the blocker or the blocked user', () => {
    const match = migrationSql.match(
      /CREATE POLICY "blocks: participant can select"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = blocker_id')
    expect(match?.[1]).toContain('auth.uid() = blocked_id')
  })

  it('INSERT policy requires the caller to be the blocker', () => {
    const match = migrationSql.match(
      /CREATE POLICY "blocks: blocker can insert"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = blocker_id')
  })

  it('a user cannot block themselves (CHECK constraint)', () => {
    expect(migrationSql).toMatch(/CHECK \(blocker_id <> blocked_id\)/)
  })
})

describe('0006_messages_inbox.sql — reports policies scope to auth.uid()', () => {
  it('SELECT policy restricts to the reporter only', () => {
    const match = migrationSql.match(
      /CREATE POLICY "reports: reporter can select own"[\s\S]*?USING \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = reporter_id')
  })

  it('INSERT policy requires the caller to be the reporter', () => {
    const match = migrationSql.match(
      /CREATE POLICY "reports: reporter can insert"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = reporter_id')
  })

  it('reason is constrained to the documented enum', () => {
    expect(migrationSql).toMatch(
      /reason\s+TEXT\s+NOT NULL CHECK \(reason IN \('spam', 'fraud', 'abuse', 'other'\)\)/,
    )
  })
})

describe('0006_messages_inbox.sql — blocked pairs cannot message each other', () => {
  it('re-defines the messages INSERT policy to deny blocked pairs', () => {
    expect(migrationSql).toMatch(/DROP POLICY IF EXISTS "messages: participants can insert"/)
    const match = migrationSql.match(
      /CREATE POLICY "messages: participants can insert"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain('auth.uid() = sender_id')
    expect(match?.[1]).toContain('FROM blocks b')
  })
})

describe('0006_messages_inbox.sql — storage bucket policies', () => {
  it('only authenticated users may upload to message-attachments', () => {
    const match = migrationSql.match(
      /CREATE POLICY "message-attachments: authenticated can upload"[\s\S]*?WITH CHECK \(([\s\S]*?)\);/,
    )
    expect(match).not.toBeNull()
    expect(match?.[1]).toContain("auth.role() = 'authenticated'")
  })
})
