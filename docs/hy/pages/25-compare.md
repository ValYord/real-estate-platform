# Էջ 25 — Compare Properties (Համեմատում) 🟡 Phase 2

> **Spec խորության մակարդակ.** Deep (v3) — հետևում է `03-property.md` gold standard-ի կառուցվածքին։

**URL.** `/compare` (shareable՝ `/compare?ids=12,45,78`) — օրինակ՝ `/hy/compare?ids=8423,8501,8677`
**Roles.** Բոլորը (Guest-ն էլ կարող է համեմատել; պահելու/գրելու համար՝ login)։
**Primary goal (decision support).** Մինչև 4 գույք կողք-կողքի աղյուսակում՝ որ օգտատերը արագ տեսնի **տարբերությունները** (գին, մակերես, սենյակ, հարկ, հարմարություններ, տեղ) և որոշի, թե որ գույքին հետապնդի։ Highlight differences-ը կրճատում է cognitive load-ը. մարդը գործ չունի «նույնը» սյունակների հետ, տեսնում է միայն որտեղ են տարբերվում։

---

## 0. Ակնարկ (Overview)

Compare-ը **decision-support** գործիք է որոնման ձագարի վերջում։ Մարդը արդեն ունի 2–4 թեկնածու (favorites-ից կամ search-ից) և ուզում է կողք-կողքի դնել։ Աղյուսակը ձախ ունի sticky row-labels սյունակ, ապա ամեն գույք առանձին column (max 4)։ Highlight toggle-ը նշում է, որտեղ արժեքները տարբեր են, և numeric row-երում կանաչով՝ best value-ն (ամենաէժան գին, ամենամեծ մակերես)։

Selection state-ը պահվում է client-side (Zustand + URL `?ids=`)։ URL-ը **shareable** է. recipient-ը (guest էլ) բացում է նույն համեմատությունը առանց login-ի։ Տվյալները batch fetch-վում են `GET /api/properties?ids=...`-ով, ապա render SSR/CSR hybrid (page shell SSR SEO landing-ի համար, table client interactivity-ի համար)։

Guest-ը կարող է համեմատել ու share անել; ♡ պահելու կամ 💬 գրելու համար՝ login modal։

---

## 1. Օգտագործման սցենարներ (User scenarios)

**Սցենար Ա — Վարձակալ Մարիան (desktop).** Մարիան favorites-ում 3 բնակարան է նշել «⚖ Համեմատել» checkbox-ով, floating compare bar-ից սեղմել **[Համեմատել →]**։ Աղյուսակում միացնում է **[Highlight differences]**՝ տեսնում, որ մեկը 5 m²-ով մեծ է բայց 1 հարկ վերև։ Կանաչ նշումից տեսնում ամենաէժան գինը, սեղմում այդ column-ի **[💬 Գրել]**։

**Սցենար Բ — Գնորդ Արամը (share).** Արամը 4 տուն է համեմատում, ուզում է կնոջ կարծիքը։ Սեղմում **[⤴ Share]** → copy link `/compare?ids=...`, ուղարկում WhatsApp-ով։ Կինը (guest) բացում է link-ը հեռախոսում, horizontal scroll-ով դիտում սյունակները։

**Սցենար Գ — Ներդրող Դավիթը (max + sold).** Դավիթը փորձում է 5-րդ գույք ավելացնել → toast «Կարելի է համեմատել առավելագույնը 4 գույք»։ Մեկ column-ում տեսնում «Այլևս հասանելի չէ» (sold), սեղմում **[✕ Հեռացնել]**, ապա **[+ Ավելացնել]**-ով նորը modal-ից։

---

## 2. Layout & visual structure

### Desktop (≥1024px)

```
┌────────────────────────────────────────────────────────────┐
│ HEADER (sticky, h-16)                                       │
├────────────────────────────────────────────────────────────┤
│ Breadcrumbs · Գլխավոր › Համեմատում                          │
│ H1 «Համեմատում» 3/4   [+Ավելացնել][⤴Share][🖨][Highlight◉] │
├──────────┬─────────────┬─────────────┬─────────────────────┤
│ (sticky) │ 🖼 [✕][♡][💬]│ 🖼 [✕][♡][💬]│ 🖼 [✕][♡][💬]      │
│ labels   │ Բնակ. Արաբկիր│ Բնակ. Կենտրոն│ Բնակ. Աջափնյակ      │
├──────────┼─────────────┼─────────────┼─────────────────────┤
│ Գին      │ 52,000,000 ֏│ 58,000,000 ֏│ 47,000,000 ֏ ✓էժան  │
│ Գին/m²   │ 693K ֏      │ 725K ֏      │ 626K ֏              │
│ Մակերես  │ 75 m²       │ 80 m² ✓մեծ  │ 75 m²              │
│ Սենյակ   │ 2           │ 3           │ 2                  │
│ Հարկ     │ 4/9         │ 6/12        │ 2/5                │
│ Տարի     │ 2018        │ 2021        │ 2009              │
│ Կահույք  │ ✓           │ ✓           │ —                  │
│ Վերելակ  │ ✓           │ ✓           │ —                  │
│ Ավտոկայ. │ —           │ ✓           │ ✓                  │
│ Թաղամաս  │ Արաբկիր     │ Կենտրոն     │ Աջափնյակ           │
│ FOOTER                                                      │
└──────────┴─────────────┴─────────────┴─────────────────────┘
```

### Mobile (<768px) — horizontal scroll

```
┌──────────────────────────┐
│ HEADER (h-14)            │
├──────────────────────────┤
│ ‹ Հետ  Համեմատում 3/4    │
│ [+][⤴][Highlight ◉]      │
├────────┬─────────────────┤
│(sticky)│ 🖼[✕][♡][💬]→→→ │ ← swipe columns
│ labels │ Բնակ. Արաբկիր   │
├────────┼─────────────────┤
│ Գին    │ 52M ֏           │
│ Մակ.   │ 75 m²           │
│ Սենյ.  │ 2               │
│ Կահ.   │ ✓               │
│ …      │ …               │
│ FOOTER                   │
└────────┴─────────────────┘
```

- Row-labels սյունակը `sticky left-0 bg-white z-10`; columns՝ horizontal scroll (`overflow-x-auto`)։
- Mobile-ում labels սյունակ նեղ (`w-24`), յուրաքանչյուր property column `min-w-[160px]`։

### Design tokens (այս էջի համար)

| Տարր | Tailwind / արժեք |
|------|------------------|
| H1 | `text-2xl font-semibold text-gray-900` |
| Count «3/4» | `text-base text-gray-500 ml-2` |
| Table | `w-full border-collapse` |
| Label cell | `sticky left-0 bg-white text-sm text-gray-500 font-medium p-3 border-b` |
| Value cell | `text-sm text-gray-900 p-3 border-b text-center` |
| Column header | `p-3 border-b align-top min-w-[200px]` |
| Photo | `w-full h-28 rounded-lg object-cover cursor-pointer` |
| [✕ Հեռացնել] | `text-gray-400 hover:text-red-500 text-xs` |
| [♡] / [💬] | `h-8 rounded-lg border text-xs px-2` |
| Diff highlight | `bg-amber-50` (cell-ը, որ տարբեր է) |
| Same (dim) | `text-gray-400` |
| Best value | `text-green-600 font-medium` + ✓ |
| ✓ amenity | `text-green-600` · `—` missing `text-gray-300` |
| Highlight toggle | `inline-flex items-center gap-2 text-sm` + switch |
| Empty illustration | `w-32 h-32 text-gray-300` (⚖) |
| Compare bar (floating) | `fixed bottom-4 inset-x-4 bg-gray-900 text-white rounded-xl p-3 shadow-lg` |

---

## 3. Բաժին առ բաժին (Section-by-section)

### 3.1 Page header

- **Breadcrumbs.** `Գլխավոր › Համեմատում`։
- **H1.** «Համեմատում» + ընտրված գույքերի քանակ՝ «Համեմատում 3/4»։
- **[+ Ավելացնել գույք]** (եթե < 4)՝ modal՝ որոնել/ընտրել ընտրանուց կամ search-ից։
- **[⤴ Share]** → copy link `/compare?ids=...` (FB, Telegram, WhatsApp, email)։
- **[🖨 Տպել / Export]** → print-friendly view / PDF։
- **[Highlight differences]** toggle (տես 3.4)։

### 3.2 Comparison table (հիմնական մարմին)

- **Layout.** Ձախ՝ sticky row-labels սյունակ; յուրաքանչյուր գույք՝ առանձին column (max 4)։ Columns horizontal scroll mobile-ում; labels sticky ձախում։
- **Column header (ամեն գույքի).**
  - **Photo** (առաջին նկար) → click → `/property/[id]`։
  - Վերնագիր + հասցե (truncate)։
  - **[✕ Հեռացնել]** column-ից (հանում համեմատությունից, update `?ids=`)։
  - **[♡ Պահել]** favorite toggle (guest → login)։
  - **[💬 Գրել]** → conversation start (`09-messages.md`, guest → login)։
- **Rows (համեմատվող դաշտերը).**
  - **Գին** (ընտրած արժույթով; rent՝ «/ամիս»)։
  - **Գին / m²** (հաշված՝ `price / area_m2`)։
  - **Մակերես** (m²)։
  - **Սենյակներ** (rooms)։
  - **Ննջասենյակ** (bedrooms)։
  - **Սանհանգույց** (bathrooms)։
  - **Հարկ** (floor / floors_total)։
  - **Շինության տարի** (year_built)։
  - **Property type** (բնակարան/տուն/…)։
  - **Վիճակ / Deal type** (վաճառք/վարձ, status)։
  - **Հարմարություններ (amenities).** ✓/— ամեն հարմարության համար (parking, վերելակ, կահույք, կոնդիցիոներ, balcony…)։
  - **Տեղ / Թաղամաս** (city, region)։
  - **Հեռավորություն** (Phase 3)՝ ընտրած reference point-ից (օր․ կենտրոն, metro) — mini map row optional։
- Բացակա արժեք՝ «—»։

### 3.3 Add properties (ինչպես են ավելանում)

- **Compare checkbox.** Property card-ի վրա (search results `02-search.md` և favorites `07-favorites.md`)՝ «⚖ Համեմատել» checkbox.
  - Նշելիս՝ ավելանում floating **compare bar** (էջի ներքև)՝ «2 ընտրված · [Համեմատել →]»։
  - Compare bar-ի **[Համեմատել]** → `/compare?ids=...`։
- **[+ Ավելացնել]** `/compare`-ից → modal (favorites list + search input)։
- Selection state պահվում client-side (Zustand + localStorage) + URL `?ids=`։

### 3.4 Highlight differences toggle

- **On** → row-երում, որտեղ արժեքները տարբեր են, cell-երը highlight-վում են (`bg-amber-50`); նույն արժեքները՝ dim (`text-gray-400`)։
- Numeric row-երում՝ best value-ն (ամենաէժան գին, ամենամեծ մակերես) կանաչ նշում + ✓ (optional)։
- **Off** → սովորական աղյուսակ։
- Toggle state՝ URL/local persist։

### 3.5 Empty / partial states

- **0 գույք** ընտրված՝ icon (⚖ `w-32 h-32`) + «Ոչ մի գույք ընտրված չէ համեմատելու համար»։
  - Տեքստ՝ «Ընտրիր գույքեր search-ից կամ ընտրանուց՝ «⚖ Համեմատել» նշելով»։
  - **[Որոնել գույք]** → `/search` · **[Իմ ընտրանին]** → `/favorites`։
- **1 գույք** միայն՝ column + placeholder «Ավելացրու ևս մեկ գույք համեմատելու համար» + **[+ Ավելացնել]**։

---

## 4. Վիճակների ամբողջական ցանկ (Page states)

| Վիճակ | Ի՞նչ է ցուցադրվում |
|-------|---------------------|
| **Loading** | Table skeleton (labels + N column shimmer) |
| **Loaded (2–4)** | Full comparison table |
| **1 property** | Column + «Ավելացրու ևս մեկ» placeholder |
| **Empty (0)** | ⚖ illustration + [Որոնել գույք] / [Իմ ընտրանին] |
| **Highlight on** | Diff cells `bg-amber-50`, same dim, best value կանաչ |
| **Column sold/deleted** | «Այլևս հասանելի չէ» + [✕ Հեռացնել] (auto-removable) |
| **Max reached (4)** | [+ Ավելացնել] disabled + toast «Առավելագույնը 4 գույք» |
| **Mixed deal type** | Notice «Վաճառք և վարձ խառն են — գները տարբեր միավորով» |
| **Add modal open** | Favorites list + search → checkbox select |
| **Share copied** | Toast «Հղումը պատճենվեց» |
| **Error (batch fail)** | «Ինչ-որ բան սխալ գնաց» + [Կրկին փորձել] |

---

## 5. Տեխնիկական խորություն (Technical)

### Component tree

```
<ComparePage> (Server shell SSR landing; table client)
 ├─ <Breadcrumbs items={Crumb[]} />
 ├─ <CompareHeader count max onAdd onShare onPrint highlight />
 ├─ <CompareTable properties={Property[]} highlight>   (client)
 │   ├─ <CompareColumnHeader property onRemove onFav onMessage /> (×N)
 │   └─ <CompareRow label values diffHighlight bestIndex />        (×rows)
 ├─ <AddPropertyModal favorites searchResults onSelect />          (lazy)
 ├─ <ShareModal url channels />                                     (lazy)
 ├─ <CompareBar selectedIds />        (floating, search/favorites-ից)
 └─ <EmptyCompare />                  (պայմանով՝ count===0)
```

### Data fields used

Batch fetch `properties(id, slug, title{}, price, currency, area_m2, rooms, bedrooms, bathrooms, floor, floors_total, year_built, property_type, deal_type, status, city, region, district, amenities[])` + `property_media(url, order)`։ Computed՝ `price_per_m2 = price / area_m2`, `best_index` per numeric row, `diff` per row (արժեքները նույնն են թե ոչ)։

### API contract-ներ

**`GET /api/properties?ids=8423,8501,8677`**
```jsonc
// 200 OK
{
  "items": [
    {
      "id": 8423, "slug": "...", "title": { "hy": "Բնակարան Արաբկիր" },
      "price": 52000000, "currency": "AMD",
      "area": 75, "pricePerM2": 693333,
      "rooms": 2, "bedrooms": 2, "bathrooms": 1,
      "floor": 4, "floorsTotal": 9, "yearBuilt": 2018,
      "propertyType": "apartment", "dealType": "sale", "status": "active",
      "amenities": ["furniture","elevator"],
      "city": "Yerevan", "district": "Arabkir",
      "media": [{ "url": "...", "order": 0 }]
    }
    // ... up to 4
  ],
  "missing": [8677]   // ջնջված/sold՝ բաց թողնված id-ները
}
// 400 { "error": "too_many_ids" }   → max 4
```

**(P3) `GET /api/properties/[id]/distance?to=center`** → `200 { "km": 3.2 }`

**Reuse.** `POST /api/favorites` (♡ toggle) · `POST /api/conversations` (💬 գրել)։

### Client state & validation (zod)

```ts
const idsSchema = z.string()
  .transform(s => s.split(",").map(Number).filter(Boolean))
  .pipe(z.array(z.number().int().positive()).max(4, "Առավելագույնը 4 գույք"));
// օրինակ՝ "8423,8501,8677" → [8423, 8501, 8677]
```

- Selection store՝ Zustand (`compareIds: number[]`), sync URL `?ids=` + localStorage։
- Max 4՝ 5-րդ ավելացման փորձ → toast, bar full։
- `missing[]` id-ները բաց են թողնվում; share link-ում invalid id՝ silently dropped։
- Highlight diff՝ row-ի unique values count > 1 → highlight; numeric best՝ min(price), max(area)։
- **Currency.** Բոլոր column-ները նույն (header-ի) արժույթով, live rate։
- **Mixed deal type.** Վաճառք + վարձ խառնել կարելի, բայց գինը «/ամիս» vs total — notice։

---

## 6. Responsive

- **≥1024px (lg).** Բոլոր column-ները տեսանելի առանց scroll-ի (4×~200px); labels sticky ձախ։
- **768–1023px (md).** 3+ column → horizontal scroll; labels sticky։
- **<768px (sm).** Labels սյունակ նեղ sticky (`w-24`), property columns swipe (`overflow-x-auto`, `min-w-[160px]`); header actions collapse; compare bar full-width ներքև։
- **Print (`@media print`).** Աղյուսակը մեկ էջում, առանց nav/footer; երկար amenities ցանկը collapse; column-ները ճկվում էջի լայնքին։

---

## 7. Accessibility

- Table՝ proper `<table><thead><tbody>` semantic, `<th scope>` row/column labels-ի համար։
- [✕ Հեռացնել]՝ `aria-label="Հեռացնել համեմատությունից՝ {title}"`; [♡]՝ `aria-label="Պահել ընտրանի"`; [💬]՝ `aria-label="Գրել վաճառողին"`։
- Highlight toggle՝ `role="switch"`, `aria-checked`; diff cell-երը՝ ոչ միայն գույնով (✓/best label-ով նաև՝ color-blind safe)։
- Photo՝ alt տեքստ (`{title} — {district}`); horizontal scroll՝ keyboard-հասանելի։
- Contrast ≥ 4.5:1; touch target ≥ 44px; share modal՝ focus trap + ESC։

---

## 8. SEO & meta

- `/compare` (առանց ids)՝ ստատիկ landing, **index** (explainer «Ինչպես համեմատել գույքեր» + CTA)։
- `/compare?ids=...`՝ **noindex** (դինամիկ, անձնական)։
- `<title>` = «Համեմատել գույքեր | {brand}»; landing-ին՝ description explainer-ով։
- OG tags shared comparison-ի համար (optional dynamic preview image՝ N գույքի thumbnail + գին)։
- `hreflang` (hy/ru/en) landing-ի համար։

---

## 9. Analytics events

| Event | Trigger | Payload |
|-------|---------|---------|
| `compare_view` | Էջի load | `ids[], count` |
| `compare_add` | Compare checkbox / [+ Ավելացնել] | `property_id` |
| `compare_remove` | [✕ Հեռացնել] | `property_id` |
| `compare_highlight_toggle` | Highlight switch | `on` |
| `compare_share` | [⤴ Share] copy/channel | `ids[], channel` |
| `compare_print` | [🖨 Տպել] | `ids[]` |
| `compare_favorite` | Column [♡] | `property_id` |
| `compare_message` | Column [💬 Գրել] | `property_id` |
| `compare_property_click` | Photo → property | `property_id` |
| `compare_max_reached` | 5-րդ ավելացման փորձ | `—` |
