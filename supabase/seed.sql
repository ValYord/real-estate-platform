-- ─────────────────────────────────────────────────────────────────────────────
-- supabase/seed.sql — local/dev-only seed data.
--
-- Automatically applied by `supabase db reset` (Supabase CLI convention);
-- never run against a hosted/production project. It is NOT a migration and
-- is not part of `supabase db push`.
--
-- Page 22 (Notifications) does not implement the producers that create
-- notification rows in production (new message, price drop, saved-search
-- match, listing status change) — this stubs a few rows for the first
-- profile in the database so the header bell / `/notifications` page have
-- something to render during manual testing.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  demo_user UUID;
  demo_property UUID;
  demo_conversation UUID;
BEGIN
  SELECT id INTO demo_user FROM profiles ORDER BY created_at LIMIT 1;
  IF demo_user IS NULL THEN
    RETURN;
  END IF;

  -- Reuse a real property/conversation when one exists so the "click →
  -- navigate" flow lands on a real page; otherwise fall back to a random id,
  -- which conveniently also exercises the "stale target" toast (doc §3.5).
  SELECT id INTO demo_property FROM properties ORDER BY created_at LIMIT 1;
  SELECT id INTO demo_conversation FROM conversations
    WHERE buyer_id = demo_user OR seller_id = demo_user
    ORDER BY created_at LIMIT 1;

  INSERT INTO notifications (user_id, type, title, body, is_read, metadata, created_at)
  VALUES
    (
      demo_user, 'message', 'New message from Tigran', NULL, FALSE,
      jsonb_build_object(
        'conversationId', COALESCE(demo_conversation, gen_random_uuid())::text,
        'name', 'Tigran'
      ),
      NOW() - INTERVAL '2 minutes'
    ),
    (
      demo_user, 'price_drop', 'Price dropped 5% on "Kentron, 3 rooms"', NULL, FALSE,
      jsonb_build_object(
        'propertyId', COALESCE(demo_property, gen_random_uuid())::text,
        'title', 'Kentron, 3 rooms',
        'percent', 5
      ),
      NOW() - INTERVAL '1 hour'
    ),
    (
      demo_user, 'listing_approved', 'Your "Arabkir, 2 rooms" listing was approved', NULL, TRUE,
      jsonb_build_object(
        'propertyId', COALESCE(demo_property, gen_random_uuid())::text,
        'title', 'Arabkir, 2 rooms'
      ),
      NOW() - INTERVAL '1 day'
    ),
    (
      demo_user, 'listing_expiring', '"Arabkir, 2 rooms" expires in 3 days', NULL, TRUE,
      jsonb_build_object(
        'propertyId', gen_random_uuid()::text,
        'title', 'Arabkir, 2 rooms'
      ),
      NOW() - INTERVAL '3 days'
    );
END $$;
