-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002_rls_policies.sql
-- Complete Row Level Security (RLS) policies for all Phase 1 tables.
--
-- Design principles:
--   • Users can read/write only their own rows (profiles, favorites, notifications).
--   • Active properties are publicly readable by everyone (including anonymous).
--   • Property owners have full control over their own listings and media.
--   • Conversation participants (buyer + seller) can read/write their thread.
--   • Message senders can insert; both participants can read.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────

-- Authenticated users can view their own profile
CREATE POLICY "profiles: owner can select"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- A new profile can only be inserted for the currently authenticated user
CREATE POLICY "profiles: owner can insert"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "profiles: owner can update"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPERTIES
-- ─────────────────────────────────────────────────────────────────────────────

-- Active listings are publicly readable (no authentication required)
CREATE POLICY "properties: active listings are public"
  ON properties
  FOR SELECT
  USING (status = 'active');

-- Owners can always read all their own listings (any status)
CREATE POLICY "properties: owner can select own"
  ON properties
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Owners can create listings assigned to themselves
CREATE POLICY "properties: owner can insert"
  ON properties
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owners can edit their own listings
CREATE POLICY "properties: owner can update"
  ON properties
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Owners can delete their own listings
CREATE POLICY "properties: owner can delete"
  ON properties
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PROPERTY_MEDIA
-- ─────────────────────────────────────────────────────────────────────────────

-- Media is visible when the parent property is active OR the viewer is the owner
CREATE POLICY "property_media: viewable with property"
  ON property_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = property_media.property_id
        AND (p.status = 'active' OR p.owner_id = auth.uid())
    )
  );

-- Only the property owner can add media
CREATE POLICY "property_media: owner can insert"
  ON property_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = property_media.property_id
        AND p.owner_id = auth.uid()
    )
  );

-- Only the property owner can update media
CREATE POLICY "property_media: owner can update"
  ON property_media
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = property_media.property_id
        AND p.owner_id = auth.uid()
    )
  );

-- Only the property owner can delete media
CREATE POLICY "property_media: owner can delete"
  ON property_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = property_media.property_id
        AND p.owner_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- FAVORITES
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can view only their own saved properties
CREATE POLICY "favorites: user can select own"
  ON favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save properties for themselves only
CREATE POLICY "favorites: user can insert"
  ON favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own saved properties
CREATE POLICY "favorites: user can delete"
  ON favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Both parties can read their shared conversations
CREATE POLICY "conversations: participants can select"
  ON conversations
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- The buyer initiates a conversation (buyer_id must match the caller)
CREATE POLICY "conversations: buyer can insert"
  ON conversations
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Either participant can update conversation metadata (e.g. updated_at)
CREATE POLICY "conversations: participants can update"
  ON conversations
  FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────────────────────────────────────

-- Both conversation participants can read messages
CREATE POLICY "messages: participants can select"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- A participant can send messages; sender_id must match their auth identity
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
    )
  );

-- Either participant can mark messages as read
CREATE POLICY "messages: participants can update"
  ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- Users can read only their own notifications
CREATE POLICY "notifications: user can select own"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (update is_read)
CREATE POLICY "notifications: user can update own"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "notifications: user can delete own"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);
