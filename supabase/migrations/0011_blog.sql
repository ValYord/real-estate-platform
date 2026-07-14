-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0011_blog.sql
-- Page 15 — Blog / News & Insights (MVP scope).
--
-- Adds two tables:
--   1. `blog_posts` — timely news/market articles that power `/news`,
--      `/news/[slug]` and `/news/category/[category]` (docs/en/pages/15-blog.md).
--      The Admin CMS editor (Page 24) is explicitly out of scope for this
--      migration — rows are written only by the service role (a future
--      admin route handler, or manually/seeded for now). Author info is
--      embedded directly on the row (author_name/avatar/bio/credentials)
--      rather than a separate author-profile table — Page 15 MVP scope says
--      "no full author-profile system", and Page 24 owns any richer CMS
--      author model later.
--   2. `newsletter_subscribers` — email capture for the newsletter signup
--      form (`POST /api/newsletter/subscribe`). No ESP/double-opt-in email
--      is wired up in this task — see the route handler for the "persist +
--      confirmation UI only" scope note.
--
-- RLS design:
--   `blog_posts`  — public (including anon) can SELECT only published rows
--                   (`published_at IS NOT NULL AND published_at <= NOW()`).
--                   No INSERT/UPDATE/DELETE policy exists for any role, so
--                   only the service-role key (which bypasses RLS entirely)
--                   can write — matching "no admin UI in this task, INSERT/
--                   UPDATE restricted to service role".
--   `newsletter_subscribers` — anyone (including anon) can INSERT their own
--                   subscription (the public signup form has no session).
--                   No SELECT policy exists for anon/authenticated, so the
--                   list of subscriber emails cannot be read back through
--                   the public API surface (defense against harvesting) —
--                   only the service role can read it (for a future export/
--                   ESP-sync job, out of scope here).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blog_posts (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT        NOT NULL UNIQUE,
  -- {hy, ru, en} — same "JSONB per-locale" convention as properties.title.
  title               JSONB       NOT NULL DEFAULT '{}',
  excerpt             JSONB       NOT NULL DEFAULT '{}',
  -- Sanitized HTML per locale (headings/paragraphs/images/inline CTA cards).
  -- Written only by the service role (see notice above) — there is no
  -- end-user input path into this column in this task's scope, so the
  -- usual "sanitize untrusted HTML" concern does not apply yet; Page 24's
  -- CMS editor is responsible for sanitizing on save when it ships.
  body                JSONB       NOT NULL DEFAULT '{}',
  cover_image         TEXT,
  category            TEXT        NOT NULL
                                    CHECK (category IN ('buying', 'selling', 'renting', 'financing', 'market', 'news')),
  author_name         TEXT        NOT NULL DEFAULT 'RE Platform Team',
  author_avatar       TEXT,
  author_bio          TEXT,
  author_credentials  TEXT,
  is_featured         BOOLEAN     NOT NULL DEFAULT FALSE,
  reading_time        SMALLINT    NOT NULL DEFAULT 1 CHECK (reading_time > 0),
  -- NULL = draft/unpublished (never returned by the public SELECT policy).
  published_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx
  ON blog_posts (published_at DESC);

CREATE INDEX IF NOT EXISTS blog_posts_category_published_idx
  ON blog_posts (category, published_at DESC);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts: public can select published"
  ON blog_posts
  FOR SELECT
  USING (published_at IS NOT NULL AND published_at <= NOW());

-- No INSERT/UPDATE/DELETE policy — only the service-role key (which bypasses
-- RLS) can write. Direct anon/authenticated writes are denied by default.

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT        NOT NULL UNIQUE,
  source      TEXT        NOT NULL DEFAULT 'news_index'
                            CHECK (source IN ('news_index', 'article', 'footer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_subscribers: anyone can insert"
  ON newsletter_subscribers
  FOR INSERT
  WITH CHECK (TRUE);

-- No SELECT policy — the subscriber list is never readable through the
-- public API surface (anon or authenticated); only the service role can
-- read it directly against the database.

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed data — a handful of sample published posts for local/dev/demo use.
-- Fixed UUIDs so re-running the migration is idempotent (ON CONFLICT DO
-- NOTHING). This is NOT how production content is authored (Page 24 CMS
-- owns that); it exists purely so `/news` renders real content locally.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO blog_posts (
  id, slug, title, excerpt, body, cover_image, category,
  author_name, author_avatar, author_bio, author_credentials,
  is_featured, reading_time, published_at, updated_at
) VALUES
(
  '9c1f0d2a-0001-4a11-8b0a-000000000001',
  'yerevan-market-trends-2026',
  '{"hy": "Երևանի շուկայի տրենդները 2026", "ru": "Тренды рынка Еревана в 2026", "en": "Yerevan market trends in 2026"}',
  '{"hy": "Գները կայունացել են 2026 թ. առաջին կիսամյակում։", "ru": "Цены стабилизировались в первом полугодии 2026 года.", "en": "Prices have stabilized in the first half of 2026."}',
  '{"en": "<h2 id=\"overview\">Overview</h2><p>The Yerevan residential market has stabilized after two years of rapid growth. Average price per square meter in Arabkir and Kentron held steady quarter over quarter.</p><h2 id=\"whats-driving-it\">What is driving it</h2><p>Lower mortgage rates and a steady supply of new developments are keeping the market balanced. <a href=\"/search?district=Arabkir\">See active listings in Arabkir</a> to explore current inventory.</p><h3 id=\"buyer-takeaway\">Buyer takeaway</h3><p>Buyers now have more time to compare options before committing.</p>"}',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=630&fit=crop',
  'market',
  'Lilit Harutyunyan', NULL,
  'Lilit covers the Yerevan residential market and writes the platform''s quarterly trend reports.',
  'Senior Market Analyst',
  TRUE, 6, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
),
(
  '9c1f0d2a-0001-4a11-8b0a-000000000002',
  'first-time-buyer-checklist',
  '{"hy": "Առաջին անգամ գնորդի ստուգաթերթ", "ru": "Чек-лист для первого покупателя", "en": "First-time buyer checklist"}',
  '{"en": "Everything you need to check before making an offer on your first home."}',
  '{"en": "<h2 id=\"before-you-start\">Before you start</h2><p>Get pre-approved for financing and set a realistic budget before you begin touring properties.</p><h2 id=\"during-the-viewing\">During the viewing</h2><p>Inspect plumbing, wiring and building common areas. Ask about heating costs.</p><h2 id=\"making-an-offer\">Making an offer</h2><p>Compare recent sales in the district before negotiating.</p>"}',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=630&fit=crop',
  'buying',
  'Davit Sargsyan', NULL,
  'Davit has helped hundreds of first-time buyers navigate the Armenian property market.',
  'Buyer Relations Lead',
  FALSE, 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
),
(
  '9c1f0d2a-0001-4a11-8b0a-000000000003',
  'staging-your-home-to-sell-fast',
  '{"hy": "Ինչպես ձևավորել տունը արագ վաճառքի համար", "ru": "Как подготовить дом к быстрой продаже", "en": "Staging your home to sell fast"}',
  '{"en": "Small, low-cost changes that make a big difference to buyers."}',
  '{"en": "<h2 id=\"declutter\">Declutter first</h2><p>Remove personal items and excess furniture so rooms feel larger.</p><h2 id=\"light-and-paint\">Light and paint</h2><p>Fresh neutral paint and good lighting are the highest-return improvements before listing.</p>"}',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&h=630&fit=crop',
  'selling',
  'Anahit Petrosyan', NULL,
  'Anahit is a staging consultant who partners with sellers across Yerevan.',
  'Staging Consultant',
  FALSE, 4, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'
),
(
  '9c1f0d2a-0001-4a11-8b0a-000000000004',
  'renting-vs-buying-in-2026',
  '{"hy": "Վարձակալություն թե՞ գնում 2026-ին", "ru": "Аренда или покупка в 2026 году", "en": "Renting vs. buying in 2026"}',
  '{"en": "A practical comparison for people weighing their next move."}',
  '{"en": "<h2 id=\"the-math\">The math</h2><p>Compare your expected time in the city against the break-even point for buying closing costs.</p><h2 id=\"flexibility\">Flexibility</h2><p>Renting keeps you flexible if your job or family situation may change soon.</p>"}',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=630&fit=crop',
  'renting',
  'Vahe Grigoryan', NULL,
  'Vahe writes about housing affordability and tenant rights.',
  'Housing Policy Writer',
  FALSE, 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days'
),
(
  '9c1f0d2a-0001-4a11-8b0a-000000000005',
  'understanding-mortgage-rates',
  '{"hy": "Հասկանալ հիփոթեքային տոկոսադրույքները", "ru": "Разбираемся в ипотечных ставках", "en": "Understanding mortgage rates"}',
  '{"en": "How fixed and variable rates affect your monthly payment."}',
  '{"en": "<h2 id=\"fixed-vs-variable\">Fixed vs. variable</h2><p>Fixed rates offer predictability; variable rates can start lower but change over time.</p><h2 id=\"what-lenders-check\">What lenders check</h2><p>Income stability, down payment size, and existing debt all affect your offered rate.</p>"}',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=630&fit=crop',
  'financing',
  'Nare Avetisyan', NULL,
  'Nare is a financial writer focused on residential lending in Armenia.',
  'Mortgage Finance Writer',
  FALSE, 4, NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'
),
(
  '9c1f0d2a-0001-4a11-8b0a-000000000006',
  'platform-adds-armenian-map-search',
  '{"hy": "Հարթակը ավելացրել է քարտեզային որոնում", "ru": "Платформа добавила поиск на карте", "en": "Platform adds map-based search"}',
  '{"en": "A quick look at the new map search experience."}',
  '{"en": "<h2 id=\"whats-new\">What is new</h2><p>Search results now render as pins on an interactive map alongside the list view.</p>"}',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&h=630&fit=crop',
  'news',
  'RE Platform Team', NULL,
  'Product updates from the RE Platform team.',
  NULL,
  FALSE, 2, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
),
(
  '9c1f0d2a-0001-4a11-8b0a-000000000007',
  'draft-upcoming-feature',
  '{"en": "Draft: upcoming feature preview"}',
  '{"en": "This draft is not yet published and must never appear on the public site."}',
  '{"en": "<h2 id=\"draft\">Draft</h2><p>Placeholder content for an unpublished article, used to verify the RLS published-only policy.</p>"}',
  NULL,
  'news',
  'RE Platform Team', NULL, NULL, NULL,
  FALSE, 1, NULL, NOW()
)
ON CONFLICT (id) DO NOTHING;
