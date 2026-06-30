# Էջ 09 — Messages / Inbox (Հաղորդագրություններ) 🟢 Phase 1

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ի կառուցվածքին։

**URL.** `/messages` (թել՝ `/messages/[conversationId]`) — օրինակ՝ `/hy/messages/551`
**Roles.** User+ (login պարտադիր)։ Guest → login wall։
**Primary goal (lead nurturing).** Գնորդի և վաճառողի/գործակալի միջև in-platform նամակագրությունը՝ կոնկրետ գույքի շուրջ։ Property էջը ստեղծում է lead-ը; այս էջը **պահում է** այն հարթակում և թույլ տալիս զրույցը հասունանալ դեպի դիտում/գործարք (որը տեղի է ունենում հարթակից դուրս)։

---

## 0. Ակնարկ (Overview)

Messages-ը կայքի **app-like** էջն է՝ two-pane inbox (ձախ՝ conversation list, աջ՝ active thread), Realtime-ով թարմացվող։ Ամեն զրույց կապված է **կոնկրետ գույքի** հետ (`property_id`)՝ thread-ի վերևում pinned property card-ով, որ համատեքստը երբեք չկորչի։

Էջը պահանջում է login (auth-gated SSR shell)։ Conversation list-ն ու thread-ը client component-ներ են Supabase Realtime subscription-ով՝ նոր message-ը հայտնվում է առանց refresh, list-ը re-order-վում, unread badge-ը և header-ի inbox counter-ը live update-վում են։ Optimistic send + retry, image attachment (Supabase Storage), reveal phone (lead track), block/report/archive։

Layout-ը app-style է՝ minimal/բացակա footer, full-height panes (`h-[calc(100vh-64px)]`)։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Գնորդ Արամը (mobile).** Արամը property էջից գրել է վաճառողին։ Հաջորդ օրը push/email-ից բացում է `/messages`։ Mobile-ում տեսնում է list, սեղմում զրույցի վրա → thread բացվում է («‹ Հետ» button-ով)։ Կարդում է պատասխանը, գրում «Կարո՞ղ եմ շաբաթ օրը դիտել», սեղմում [Ուղարկել]։ Bubble-ը հայտնվում է «sending…» → ✓։

**Սցենար Բ — Վաճառող Մարիան (desktop).** Մարիան 6 ակտիվ զրույց ունի։ Desktop-ում ձախ list-ում տեսնում 2 unread (bold + badge)։ Սեղմում առաջինը՝ աջում բացվում thread + pinned property card։ Կցում է հատակագծի նկար ([📎]), ուղարկում։ Մյուս զրույցում spam է տեսնում՝ «⋯» → [Բողոքել]։

**Սցենար Գ — Վաճառող Դավիթը (block).** Դավիթին մի օգտատեր անընդհատ անհանգստացնում է։ Thread-ի «⋯»-ից սեղմում **[Արգելափակել]**, confirm։ Send box-ը երկու կողմում disabled, զրույցը թաքնվում է։ → `POST /api/blocks`։

---

## 2. Layout & visual structure

### Desktop (≥1024px) — two-pane

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├──────────────────────┬─────────────────────────────────────┤
│ ◄ LIST (w-[360px])   │ ► THREAD (flex-1)                    │
│ Հաղորդագր.  [🔍]      │ ┌── Pinned property card (sticky)──┐ │
│ [Բոլորը·Չկարդ.·Արխ.] │ │ 🖼 52M֏ · 2սեն · Արաբկիր  [→]    │ │
│ ┌──────────────────┐ │ └──────────────────────────────────┘ │
│ │🖼 Դավիթ      14:20│ │ Thread header: Դավիթ ✓  ● online «⋯»│ │
│ │  «Բարև, հաս…» ②   │ │ ─────────────────────────────────── │ │
│ ├──────────────────┤ │      ┌─────────────┐  (left=նա)      │ │
│ │🖼 Մարիա      Երեկ │ │      │ Բարև…       │                 │ │
│ │  «Շնորհակ…»       │ │      └─────────────┘                 │ │
│ ├──────────────────┤ │  (right=ես)  ┌─────────────┐ ✓✓      │ │
│ │ …                │ │              │ Հաս. է դեռ? │         │ │
│ └──────────────────┘ │              └─────────────┘         │ │
│                      │ ─────────────────────────────────── │ │
│                      │ [📎] [Գրիր հաղորդագրություն…] [Ուղարկ]│ │
└──────────────────────┴─────────────────────────────────────┘
```

### Mobile (<768px) — մեկ pane

```
LIST view:                  THREAD view:
┌──────────────────────┐    ┌──────────────────────┐
│ Հաղորդագր.   [🔍]     │    │ ‹ Դավիթ ✓  ● «⋯»     │
│ [Բոլորը·Չկարդ.·Արխ.] │    │ 🖼 52M֏·2սեն·Արաբկիր │
│ ┌──────────────────┐ │    ├──────────────────────┤
│ │🖼 Դավիթ  14:20 ② │ │ →  │   ┌──────────┐        │
│ │  «Բարև, հաս…»     │ │    │   │ Բարև…    │        │
│ ├──────────────────┤ │    │   └──────────┘        │
│ │🖼 Մարիա   Երեկ    │ │    │      ┌──────────┐ ✓✓  │
│ └──────────────────┘ │    │      │ Հաս. է?  │     │
└──────────────────────┘    │      └──────────┘     │
                            ├──────────────────────┤
                            │ [📎][Գրիր…]  [Ուղ.]  │
                            └──────────────────────┘
```

- Mobile՝ list → click → thread (slide-in), «‹» = վերադարձ list-ին (URL push/pop)։
- Pinned card sticky thread-ի վերևում; send box sticky ներքևում։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
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
| [Ուղարկել] | `bg-primary text-white h-10 w-10 rounded-full` (icon) |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Conversation list (ձախ pane)

- **Header.** «Հաղորդագրություններ» + **[🔍 Որոնել]** (filter by name/property title)։
- **Tabs/filters.** «Բոլորը · Չկարդացված · Արխիվ» (active `border-b-2 border-primary`)։
- **Ամեն conversation տող.**
  - **Property thumbnail** (գույքի առաջին նկար, `w-12 h-12`)։
  - Մյուս կողմի **անուն/avatar** + (agent՝ ✓ verified badge)։
  - **Last message preview** (1 տող truncate) + ժամ/ամսաթիվ (today՝ ժամ, երեկ՝ «Երեկ», ավելի հին՝ ամսաթիվ)։
  - **Unread badge** (չկարդացված քանակ) + bold տող + primary dot։
  - Property title mini՝ «2 սեն. · Արաբկիր»։
  - **«⋯» menu.** Արխիվացնել · Block · Report · Ջնջել։
- Click → բացում thread աջ pane-ում (URL → `/messages/[conversationId]`)։
- **States.** loading (skeleton rows) · empty (տես 3.6) · active selected · unread։

### 3.2 Thread (աջ pane)

- **Pinned property card (sticky վերևում).**
  - Փոքր նկար + գին + key facts + status badge; click → `/property/[id]`։
  - Status փոխվել է (sold/pending)՝ inline notice «Այս գույքն ամրագրված/վաճառված է»։
  - Deleted property՝ «Գույքը հանված է», thread-ը մնում է readable։
- **Thread header.** Մյուս կողմի անուն/avatar (→ agent profile եթե agent) + online indicator (Realtime presence) + **«⋯»** (Block, Report, Archive, Mute)։
- **Message bubbles.**
  - Իմ հաղորդագրությունները՝ աջ (primary), մյուսինը՝ ձախ (neutral)։
  - Ամեն bubble՝ տեքստ, ժամ, read receipt (✓ ուղարկված / ✓✓ կարդացված)։
  - Image attachment՝ thumbnail → lightbox։
  - Day separator («Այսօր», «Երեկ», ամսաթիվ)։
  - System messages՝ «Զրույցը սկսված է [date]» / «Հեռախոսը բացահայտված է»։
- **Send box (sticky ներքև).**
  - **Textarea** (Enter = ուղարկել, Shift+Enter = նոր տող) + length limit (~2000 նիշ)։
  - **[📎 Կցել նկար]** → file picker → upload Supabase Storage → preview chip → ուղարկել։
  - **[Ուղարկել]** primary (icon button) → `POST /api/messages`։
  - Optimistic append + «sending…» վիճակ; fail → bubble «չուղարկվեց ⟲ կրկնել»։
- **Quick actions (thread header / pinned card).**
  - **[📞 Բացահայտել հեռախոսը]** → reveal seller-ի համարը (system message + `lead_count++` + `phone_revealed` event)։
  - **[📅 Պայմանավորվել դիտման մասին]** (Phase 2)։

### 3.3 Block / Report / Archive (thread «⋯» menu)

- **[🚫 Արգելափակել օգտատիրոջը]** → confirm → երկու կողմն այլևս չեն կարող գրել, conversation hidden → `POST /api/blocks`։ Send box disabled + «Դու արգելափակել ես այս օգտատիրոջը»։
- **[⚑ Բողոքել]** → report modal (պատճառ՝ սպամ, խարդախություն, վիրավորանք …) → admin moderation queue (`24-admin.md`)։
- **[🗃 Արխիվացնել]** → conversation տեղափոխվում Archive tab (չի ջնջվում)։
- **[🔕 Mute]** → անջատում push/email ծանուցումն այս thread-ի համար։

### 3.4 Ինչպես է սկսվում conversation-ը (property contact-ից)

- `/property/[id]` (`03-property.md`) contact card-ի **[💬 Գրել հաղորդագրություն]** →
  - **Guest** → login modal (`/auth/login?redirect=/property/[id]`)։
  - **User** → ստուգում՝ արդեն կա՞ conversation այս (property + buyer + seller)-ի համար.
    - Կա → բացում առկա thread-ը։
    - Չկա → `POST /api/conversations { propertyId }` + prefilled draft «Բարև, հետաքրքրված եմ այս գույքով։ Հասանելի՞ է դեռ»։
- Owner չի կարող գրել ինքն իրեն (self-message disabled)։

### 3.5 Realtime updates (Supabase Realtime)

- **Subscribe.** `messages` table (filter՝ conversation_id IN user-ի conversations) → նոր message-ը հայտնվում առանց refresh։
- **Typing indicator** (Realtime presence/broadcast)՝ «գրում է…» (optional P1.5)։
- **Read receipts.** Thread բացելիս՝ `read=true` mark → մյուս կողմին ✓✓ live։
- **List re-order.** Նոր message → conversation բարձրանում ցուցակի վերև + unread badge live։
- **Header counter.** 🔔/inbox badge-ը update-վում Realtime-ով ամեն էջում։

### 3.6 Empty states

- **Չկա conversation.** Inbox empty՝ icon + «Դեռ հաղորդագրություն չունես» + «Գտիր գույք ու գրիր վաճառողին» → **[Որոնել գույք]** → `/search`։
- **Չընտրված thread** (desktop, list կա բայց ոչինչ բացված)՝ placeholder «Ընտրիր զրույց ձախից»։
- **Guest** → login wall՝ **[Մուտք գործել]** → `/auth/login?redirect=/messages`։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading list** | Conversation row skeleton (×6 shimmer) |
| **List loaded, no thread** (desktop) | Placeholder «Ընտրիր զրույց ձախից» |
| **Thread open** | Pinned card + bubbles + send box |
| **Empty inbox** | Icon + «Դեռ հաղորդագրություն չունես» + [Որոնել գույք] |
| **Guest** | Login wall |
| **Sending** | Optimistic bubble «sending…» → ✓ |
| **Send failed** | Bubble «չուղարկվեց ⟲ կրկնել» |
| **Blocked** | Send box disabled + «Դու արգելափակել ես այս օգտատիրոջը» |
| **Property sold/deleted** | Pinned card notice; thread readable |
| **Rate-limited** | Send disabled + toast «Չափից շատ հաղորդագրություն» |
| **Realtime new message** | Bubble հայտնվում live + list re-order + unread badge |

---

## 5. Տեխնիկական խորություն (Technical)

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
 ├─ <EmptyInbox />        (պայմանով)
 └─ <MessagesLoginWall /> (պայմանով՝ guest)
```

### Data fields used

`conversations(id, property_id, buyer_id, seller_id, archived, muted, blocked_by, created_at, last_message_at)` · `messages(id, conversation_id, sender_id, body, attachments(json), read, created_at)`։ Computed՝ `unread_count` (per user), `peer` (մյուս կողմը), property thumb-ը join `property_media`-ից։

### API contract-ներ

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

**Realtime channel.** `messages:conversation_id=eq.[id]` (insert/update); presence channel՝ online + typing։

### Validation (zod)

```ts
const messageSchema = z.object({
  conversationId: z.number().int().positive(),
  body: z.string().min(1, "Դատարկ հաղորդագրություն").max(2000),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.enum(["image/jpeg","image/png","image/webp"]),
  })).max(5).optional(),
});
```

- **Anti-spam.** Նոր user՝ սահմանափակ outbound conversations/ժամ; նույն seller-ին կրկնակի spam guard; captcha առաջին message-ի ժամանակ (նոր հաշիվ)։
- **Attachment limits.** Միայն image (jpg/png/webp), max ~5MB, max 5/message; չթույլատրված type → error toast։
- **Read receipts.** Thread բացելիս batch `read=true`; մյուս կողմին ✓✓ Realtime-ով։
- **Notifications.** Նոր message → push (P4) + email (եթե offline, Resend, throttled) + `/notifications` entry։

---

## 6. Responsive

- **≥1024px (lg).** Two-pane՝ list `w-[360px]` + thread `flex-1`, երկուսն էլ տեսանելի։
- **768–1023px (md).** Two-pane, list ավելի նեղ (`w-[300px]`)։
- **<768px (sm).** Մեկ pane՝ list ↔ thread navigation, «‹ Հետ» button; send box-ը keyboard-ի վերևում fixed; footer բացակա (app-like)։

---

## 7. Accessibility

- Conversation list՝ `role="list"`, ամեն row keyboard-հասանելի (Enter = open), unread-ը `aria-label="2 չկարդացված"`-ով։
- Message list՝ `aria-live="polite"` նոր bubble-ի համար (չափավոր, ոչ ամեն keystroke)։
- Send box textarea՝ `aria-label="Գրիր հաղորդագրություն"`; [Ուղարկել] icon՝ `aria-label="Ուղարկել"`։
- «⋯» menu՝ ARIA menu pattern, ESC փակում, focus return։
- Attachment՝ alt տեքստ; read receipt-ը `aria-label="Կարդացված"`; contrast ≥ 4.5:1; touch target ≥ 44px։

---

## 8. SEO & meta

- **noindex, nofollow** — անձնական, auth-gated (`robots: noindex, nofollow`)։
- `<title>` = «Հաղորդագրություններ | {brand}» (unread քանակով՝ «(2) Հաղորդագրություններ»)։
- Չունի structured data; email notification-ները՝ valid SPF/DKIM, `List-Unsubscribe` mute-ի համար։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `inbox_view` | Էջի load | `unread_count` |
| `conversation_open` | Thread բացում | `conversation_id, property_id` |
| `message_sent` | [Ուղարկել] success | `conversation_id` |
| `message_send_failed` | Send error | `conversation_id, code` |
| `attachment_sent` | Image upload + send | `conversation_id` |
| `phone_revealed` | [📞 Բացահայտել] | `property_id, conversation_id` |
| `conversation_archived` | [🗃 Արխիվացնել] | `conversation_id` |
| `user_blocked` | [🚫 Արգելափակել] | `target_user_id` |
| `conversation_reported` | [⚑ Բողոքել] | `conversation_id, reason` |
| `realtime_message_received` | Realtime insert | `conversation_id` |
