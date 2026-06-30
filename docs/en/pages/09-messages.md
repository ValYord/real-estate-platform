# Page 09 — Messages / Inbox 🟢 Phase 1

> **Spec depth level.** Deep (v3) — follows the `03-property.md` gold standard structure.

**URL.** `/messages` (thread: `/messages/[conversationId]`) — example: `/hy/messages/551`
**Roles.** User+ (login required). Guest → login wall.
**Primary goal (lead nurturing).** In-platform correspondence between a buyer and a seller/agent about a specific property. The property page creates the lead; this page **keeps** it on the platform and lets the conversation mature toward a viewing/deal (which happens off-platform).

---

## 0. Overview

Messages is the site's **app-like** page: a two-pane inbox (left: conversation list, right: active thread), updated via Realtime. Each conversation is tied to a **specific property** (`property_id`), with a pinned property card at the top of the thread so context is never lost.

The page requires login (auth-gated SSR shell). The conversation list and thread are client components with a Supabase Realtime subscription: a new message appears without refresh, the list re-orders, and the unread badge and header inbox counter update live. Optimistic send + retry, image attachment (Supabase Storage), reveal phone (lead track), block/report/archive.

The layout is app-style: minimal/absent footer, full-height panes (`h-[calc(100vh-64px)]`).

---

## 1. User scenarios

**Scenario A — Buyer Aram (mobile).** Aram wrote to the seller from the property page. The next day he opens `/messages` from a push/email. On mobile he sees the list, taps a conversation → the thread opens (with a "‹ Back" button). He reads the reply, writes "Can I view it on Saturday?", taps [Send]. The bubble appears as "sending…" → ✓.

**Scenario B — Seller Maria (desktop).** Maria has 6 active conversations. On desktop she sees 2 unread in the left list (bold + badge). She clicks the first: the thread + pinned property card open on the right. She attaches a floor-plan image ([📎]) and sends it. In another conversation she sees spam: "⋯" → [Report].

**Scenario C — Seller David (block).** A user keeps bothering David. From the thread's "⋯" he taps **[Block]**, confirm. The send box is disabled on both sides, the conversation is hidden. → `POST /api/blocks`.

---

## 2. Layout & visual structure

### Desktop (≥1024px) — two-pane

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────────────┬─────────────────────────────────────┤
│ ◄ LIST (w-[360px])   │ ► THREAD (flex-1)                    │
│ Messages    [🔍]      │ ┌── Pinned property card (sticky)──┐ │
│ [All·Unread·Arch.]   │ │ 🖼 52M֏ · 2rm · Arabkir   [→]    │ │
│ ┌──────────────────┐ │ └──────────────────────────────────┘ │
│ │🖼 David      14:20│ │ Thread header: David ✓  ● online "⋯"│ │
│ │  "Hi, avail…" ②   │ │ ─────────────────────────────────── │ │
│ ├──────────────────┤ │      ┌─────────────┐  (left=them)    │ │
│ │🖼 Maria      Yest.│ │      │ Hi…         │                 │ │
│ │  "Thank y…"       │ │      └─────────────┘                 │ │
│ ├──────────────────┤ │  (right=me)  ┌─────────────┐ ✓✓      │ │
│ │ …                │ │              │ Still avail?│         │ │
│ └──────────────────┘ │              └─────────────┘         │ │
│                      │ ─────────────────────────────────── │ │
│                      │ [📎] [Write a message…]      [Send]  │ │
└──────────────────────┴─────────────────────────────────────┘
```

### Mobile (<768px) — single pane

```
LIST view:                  THREAD view:
┌──────────────────────┐    ┌──────────────────────┐
│ Messages     [🔍]     │    │ ‹ David ✓  ● "⋯"     │
│ [All·Unread·Arch.]   │    │ 🖼 52M֏·2rm·Arabkir  │
│ ┌──────────────────┐ │    ├──────────────────────┤
│ │🖼 David  14:20 ② │ │ →  │   ┌──────────┐        │
│ │  "Hi, avail…"    │ │    │   │ Hi…      │        │
│ ├──────────────────┤ │    │   └──────────┘        │
│ │🖼 Maria   Yest.   │ │    │      ┌──────────┐ ✓✓  │
│ │                  │ │    │      │ Avail?   │     │
│ └──────────────────┘ │    │      └──────────┘     │
└──────────────────────┘    ├──────────────────────┤
                            │ [📎][Write…]   [Send] │
                            └──────────────────────┘
```

- Mobile: list → click → thread (slide-in), "‹" = return to list (URL push/pop).
- Pinned card sticky at the top of the thread; send box sticky at the bottom.

### Design tokens (for this page)

| Element | Tailwind / value |
|------|------------------|
| List pane | `w-[360px] border-r border-gray-200 overflow-y-auto` |
| Conversation row | `flex gap-3 p-3 hover:bg-gray-50 cursor-pointer` |
| Active row | `bg-primary/5 border-l-2 border-primary` |
| Unread row | `font-semibold` + dot `bg-primary` |
| Unread badge | `bg-primary text-white text-xs rounded-full px-1.5 min-w-5 text-center` |
| Property thumb | `w-12 h-12 rounded-lg object-cover` |
| Pinned card | `sticky top-0 bg-white border-b p-3 flex gap-3 z-10` |
| My bubble | `bg-primary text-white rounded-2xl rounded-br-sm px-4 py-2 ml-auto max-w-[70%]` |
| Their bubble | `bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[70%]` |
| Read receipt | `text-xs text-white/70` (✓ / ✓✓) |
| Day separator | `text-center text-xs text-gray-400 my-3` |
| System message | `text-center text-xs text-gray-400 italic my-2` |
| Send box | `sticky bottom-0 bg-white border-t p-3 flex gap-2 items-end` |
| Textarea | `flex-1 resize-none rounded-xl border px-3 py-2 max-h-32` |
| [Send] | `bg-primary text-white h-10 w-10 rounded-full` (icon) |

---

## 3. Section-by-section

### 3.1 Conversation list (left pane)

- **Header.** "Messages" + **[🔍 Search]** (filter by name/property title).
- **Tabs/filters.** "All · Unread · Archive" (active `border-b-2 border-primary`).
- **Each conversation row.**
  - **Property thumbnail** (property's first image, `w-12 h-12`).
  - The other party's **name/avatar** + (agent: ✓ verified badge).
  - **Last message preview** (1-line truncate) + time/date (today: time, yesterday: "Yesterday", older: date).
  - **Unread badge** (unread count) + bold row + primary dot.
  - Property title mini: "2 rm · Arabkir".
  - **"⋯" menu.** Archive · Block · Report · Delete.
- Click → opens the thread in the right pane (URL → `/messages/[conversationId]`).
- **States.** loading (skeleton rows) · empty (see 3.6) · active selected · unread.

### 3.2 Thread (right pane)

- **Pinned property card (sticky at top).**
  - Small image + price + key facts + status badge; click → `/property/[id]`.
  - Status changed (sold/pending): inline notice "This property is reserved/sold".
  - Deleted property: "Property removed", the thread stays readable.
- **Thread header.** The other party's name/avatar (→ agent profile if agent) + online indicator (Realtime presence) + **"⋯"** (Block, Report, Archive, Mute).
- **Message bubbles.**
  - My messages: right (primary), the other's: left (neutral).
  - Each bubble: text, time, read receipt (✓ sent / ✓✓ read).
  - Image attachment: thumbnail → lightbox.
  - Day separator ("Today", "Yesterday", date).
  - System messages: "Conversation started on [date]" / "Phone revealed".
- **Send box (sticky at bottom).**
  - **Textarea** (Enter = send, Shift+Enter = new line) + length limit (~2000 chars).
  - **[📎 Attach image]** → file picker → upload to Supabase Storage → preview chip → send.
  - **[Send]** primary (icon button) → `POST /api/messages`.
  - Optimistic append + "sending…" state; fail → bubble "failed to send ⟲ retry".
- **Quick actions (thread header / pinned card).**
  - **[📞 Reveal phone]** → reveal the seller's number (system message + `lead_count++` + `phone_revealed` event).
  - **[📅 Schedule a viewing]** (Phase 2).

### 3.3 Block / Report / Archive (thread "⋯" menu)

- **[🚫 Block user]** → confirm → neither side can write anymore, conversation hidden → `POST /api/blocks`. Send box disabled + "You have blocked this user".
- **[⚑ Report]** → report modal (reason: spam, fraud, abuse …) → admin moderation queue (`24-admin.md`).
- **[🗃 Archive]** → conversation moves to the Archive tab (not deleted).
- **[🔕 Mute]** → disables push/email notifications for this thread.

### 3.4 How a conversation starts (from property contact)

- `/property/[id]` (`03-property.md`) contact card's **[💬 Send message]** →
  - **Guest** → login modal (`/auth/login?redirect=/property/[id]`).
  - **User** → check whether a conversation already exists for this (property + buyer + seller):
    - Exists → open the existing thread.
    - Doesn't exist → `POST /api/conversations { propertyId }` + a prefilled draft "Hi, I'm interested in this property. Is it still available?".
- An owner can't write to themselves (self-message disabled).

### 3.5 Realtime updates (Supabase Realtime)

- **Subscribe.** `messages` table (filter: conversation_id IN the user's conversations) → a new message appears without refresh.
- **Typing indicator** (Realtime presence/broadcast): "typing…" (optional P1.5).
- **Read receipts.** On opening a thread: `read=true` mark → the other side sees ✓✓ live.
- **List re-order.** New message → conversation moves to the top of the list + unread badge live.
- **Header counter.** The 🔔/inbox badge updates via Realtime on every page.

### 3.6 Empty states

- **No conversations.** Inbox empty: icon + "You don't have any messages yet" + "Find a property and write to the seller" → **[Search properties]** → `/search`.
- **No thread selected** (desktop, list exists but nothing opened): placeholder "Select a conversation on the left".
- **Guest** → login wall: **[Sign in]** → `/auth/login?redirect=/messages`.

---

## 4. Full list of page states

| State | What is shown |
|-------|---------------------|
| **Loading list** | Conversation row skeleton (×6 shimmer) |
| **List loaded, no thread** (desktop) | Placeholder "Select a conversation on the left" |
| **Thread open** | Pinned card + bubbles + send box |
| **Empty inbox** | Icon + "You don't have any messages yet" + [Search properties] |
| **Guest** | Login wall |
| **Sending** | Optimistic bubble "sending…" → ✓ |
| **Send failed** | Bubble "failed to send ⟲ retry" |
| **Blocked** | Send box disabled + "You have blocked this user" |
| **Property sold/deleted** | Pinned card notice; thread readable |
| **Rate-limited** | Send disabled + toast "Too many messages" |
| **Realtime new message** | Bubble appears live + list re-order + unread badge |

---

## 5. Technical depth

### Component tree

```
<MessagesPage> (Server Component shell, SSR, auth-gated)
 ├─ <ConversationList>                               (client, Realtime)
 │   ├─ <ListHeader search filterTab />
 │   └─ <ConversationRow conv unread />               (×N)
 ├─ <Thread conversationId>                           (client, Realtime)
 │   ├─ <PinnedPropertyCard property />
 │   ├─ <ThreadHeader peer online onMenu />
 │   ├─ <MessageList messages />
 │   │   ├─ <DaySeparator />
 │   │   ├─ <MessageBubble msg mine readReceipt />    (×M)
 │   │   └─ <SystemMessage />
 │   └─ <SendBox onSend onAttach />
 │       └─ <AttachmentPreview />
 ├─ <BlockReportMenu />   (modal)
 ├─ <EmptyInbox />        (conditional)
 └─ <MessagesLoginWall /> (conditional: guest)
```

### Data fields used

`conversations(id, property_id, buyer_id, seller_id, archived, muted, blocked_by, created_at, last_message_at)` · `messages(id, conversation_id, sender_id, body, attachments(json), read, created_at)`. Computed: `unread_count` (per user), `peer` (the other party), property thumb joined from `property_media`.

### API contracts

**`GET /api/conversations`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 551,
      "property": { "id": 8423, "thumb": "...", "price": 52000000,
                    "currency": "AMD", "title": "2 սեն. · Արաբկիր",
                    "status": "active" },
      "peer": { "id": 12, "name": "Davit", "avatar": "...",
                "role": "agent", "verified": true, "online": true },
      "lastMessage": { "body": "Բարև, հասանելի՞ է դեռ", "createdAt": "...",
                       "mine": false },
      "unreadCount": 2,
      "archived": false
    }
  ]
}
// 401 { "error": "auth_required" }
```

**`POST /api/conversations`** → `{ "propertyId": 8423 }` → `201 { "conversationId": 551 }` (existing → `200`)

**`GET /api/conversations/[id]/messages?before=<cursor>`** → `200 { "items": Message[], "nextCursor": "..." }` (paginated)

**`POST /api/messages`**
```jsonc
// request { "conversationId": 551, "body": "Հասանելի՞ է դեռ", "attachments": [] }
// 201     { "id": 9981, "createdAt": "..." }
// 401     { "error": "auth_required" }
// 403     { "error": "blocked" }       → send box disabled
// 429     { "error": "rate_limited" }  → toast
```

**`PATCH /api/conversations/[id]`** → `{ archived? , muted? , read? }` → `200`

**`POST /api/blocks`** → `{ "userId": 12 }` → `200`
**`POST /api/reports`** → `{ "conversationId": 551, "reason": "spam", "note": "..." }` → `202`
**`POST /api/properties/[id]/reveal-phone`** → `200 { "phone": "+374..." }` (lead track + system message)

**Realtime channel.** `messages:conversation_id=eq.[id]` (insert/update); presence channel: online + typing.

### Validation (zod)

```ts
const messageSchema = z.object({
  conversationId: z.number().int().positive(),
  body: z.string().min(1, "Empty message").max(2000),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.enum(["image/jpeg","image/png","image/webp"]),
  })).max(5).optional(),
});
```

- **Anti-spam.** New user: limited outbound conversations/hour; repeat-spam guard for the same seller; captcha on the first message (new account).
- **Attachment limits.** Images only (jpg/png/webp), max ~5MB, max 5/message; disallowed type → error toast.
- **Read receipts.** On opening a thread, batch `read=true`; the other side sees ✓✓ via Realtime.
- **Notifications.** New message → push (P4) + email (if offline, Resend, throttled) + `/notifications` entry.

---

## 6. Responsive

- **≥1024px (lg).** Two-pane: list `w-[360px]` + thread `flex-1`, both visible.
- **768–1023px (md).** Two-pane, list narrower (`w-[300px]`).
- **<768px (sm).** Single pane: list ↔ thread navigation, "‹ Back" button; send box fixed above the keyboard; footer absent (app-like).

---

## 7. Accessibility

- Conversation list: `role="list"`, each row keyboard-accessible (Enter = open), unread with `aria-label="2 unread"`.
- Message list: `aria-live="polite"` for a new bubble (moderate, not every keystroke).
- Send box textarea: `aria-label="Write a message"`; [Send] icon: `aria-label="Send"`.
- "⋯" menu: ARIA menu pattern, ESC closes, focus return.
- Attachment: alt text; read receipt: `aria-label="Read"`; contrast ≥ 4.5:1; touch target ≥ 44px.

---

## 8. SEO & meta

- **noindex, nofollow** — personal, auth-gated (`robots: noindex, nofollow`).
- `<title>` = "Messages | {brand}" (with unread count: "(2) Messages").
- No structured data; email notifications: valid SPF/DKIM, `List-Unsubscribe` for mute.

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `inbox_view` | Page load | `unread_count` |
| `conversation_open` | Thread open | `conversation_id, property_id` |
| `message_sent` | [Send] success | `conversation_id` |
| `message_send_failed` | Send error | `conversation_id, code` |
| `attachment_sent` | Image upload + send | `conversation_id` |
| `phone_revealed` | [📞 Reveal] | `property_id, conversation_id` |
| `conversation_archived` | [🗃 Archive] | `conversation_id` |
| `user_blocked` | [🚫 Block] | `target_user_id` |
| `conversation_reported` | [⚑ Report] | `conversation_id, reason` |
| `realtime_message_received` | Realtime insert | `conversation_id` |
