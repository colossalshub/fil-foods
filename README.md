# F.I.L. FOODS Meal Management System

A meal app for F.I.L. FOODS (Food Is Life). A customer records a diet, browses meals, builds an order, and chooses pickup or delivery. Staff then review, prepare, and hand that same order off.

One Expo app holds both sides. The customer signs in on the main login screen. **Staff sign in** on that screen opens **Select Your Role**: Admin, Dietitian, Kitchen Staff, or Delivery Staff.

The person who owns the account and the person who eats the meals can be different. On a family account there is one meal recipient, stored separately from the account holder.

Built by Relish (Group 4), III-BCSAD, S.Y. 2026–2027.

Repository: https://github.com/colossalshub/fil-foods

## What to open when you are explaining it

| If they ask… | Open this |
|---|---|
| What the customer sees | Customer tabs below |
| What each staff role does | Staff roles and the order chain |
| Why a search forgives a typo, or how a day of meals is chosen | [Algorithms](#algorithms) and [`docs/algorithms.md`](docs/algorithms.md) |
| Password hash, roles, audit chain | [Security](#security) and [`docs/security-controls.md`](docs/security-controls.md) |
| Which story is actually done | [`docs/implementation-traceability.md`](docs/implementation-traceability.md) (customer) and [`docs/implementation-traceability-staff.md`](docs/implementation-traceability-staff.md) (staff) |
| The required stories | User Story v6: [`docs/specs/User_Story_v6_20_11_2026.xlsx`](docs/specs/User_Story_v6_20_11_2026.xlsx). Short index: [`docs/specs/meal-service-modules.md`](docs/specs/meal-service-modules.md) |

Story ranges in that workbook: USR-01–USR-50, ADM-01–ADM-21, DIT-01–DIT-16, KIT-01–KIT-15, DEL-01–DEL-13 and DEL-15–DEL-17. There is no DEL-14. DIT-17 is not in v6 (this repo still keeps a dietitian condition-removal flow beyond the workbook).

## Customer app

Signed-in tabs: **Home**, **Meals**, **Orders**, **Account**.

- Sign up for yourself or a family member, verify the account, and finish the recipient’s allergy and diet profile
- Log in, reset a password, and log out. Google sign-in uses Supabase Auth when that provider is turned on in the dashboard
- Browse and search meals. A meal that contains a recorded allergen is disabled, with an explanation
- Build today’s meals, choose pickup or delivery, and place the order
- Follow the order. A delivery order shows an order reference `ORD-YYYY-NNNN` and a separate tracking number `TRK-YYYY-NNNN`. Pickup orders have the order reference only
- Account holds health, allergies, preferences, a guardian, and the subscription section
- Terms and the privacy policy are on registration and on Account

Help, FAQ, and the navigation guide sit under Help, not as their own tabs.

## Staff app

All four roles share one entry, then each role only sees its own tabs.

| Role | Tabs | What they do with an order |
|---|---|---|
| Admin | Dashboard, Orders, Menu, Staff, Settings | Owns the menu (details and prices). Assigns a delivery rider. Sees customers, staff, and the audit log. The menu screen shows availability; Kitchen is the one that turns an item on or off |
| Dietitian | Dashboard, Orders, Menu, Settings | Reviews whether the order suits the recipient. Can approve it or send it back as **Returned for Changes**. Menu is read-only |
| Kitchen | Dashboard, Orders, Menu, Settings | Sees an order after payment is confirmed, prepares it, and marks it ready. Sets whether an existing item is available. Cannot add or edit menu details |
| Delivery | Dashboard, Orders, Settings | Sees orders assigned to them once they are ready. Updates Ready for Pickup → Out for Delivery → Completed. No menu tab |

**Order chain, in the order it happens**

1. The customer submits the order (it is for the meal recipient, not necessarily the account holder).
2. The dietitian reviews it. A return sends it back; the customer edits and resubmits the same `ORD-` reference.
3. The customer pays after approval. Kitchen does not receive an unpaid order. (Cash on delivery is allowed by the owner’s decision, but that exception is not wired until payments exist.)
4. Kitchen prepares it. For pickup, Kitchen marks Ready for Pickup and the order finishes after collection.
5. For delivery, Admin assigns a rider. That rider updates the delivery statuses. Only Admin and the assigned rider see the delivery address. Kitchen and other riders see the first name and the food, not the price or the address.

## Where the code lives

| Folder | What it is |
|---|---|
| `frontend/` | The Expo app (SDK 58, React Native and web). Navigation is React Navigation, not Expo Router |
| `frontend/src/user/` | Customer screens, services, and copy (`data/messages.ts`) |
| `frontend/src/admin/` | Staff screens. Role rules are in `admin/domain/roleAccess.ts` |
| `frontend/src/lib/` | Supabase client, staff API calls, and the search and route algorithms |
| `supabase/` | Schema, row-level security, order functions, and the username-login Edge Function. Read [`supabase/README.md`](supabase/README.md) before a live demo |
| `docs/` | Privacy policy, terms, security checklist, algorithms, and story-by-story status |
| `docs/specs/` | Module indexes. Acceptance criteria are the workbook rows, not these indexes |

## Sample data and the live database

With no `frontend/.env`, the app runs on sample data stored on the device. Staff login then shows a demo email and password on the sign-in screen.

With `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` set (copy `frontend/.env.example` to `frontend/.env`), sign-up, profiles, the family meal recipient, the menu, and orders go through Supabase. Staff sign-in reads `profiles.role` and staff actions call database functions (`staff_orders`, `dietitian_review_order`, `transition_order_status`, and the others listed in [`supabase/README.md`](supabase/README.md)).

Do not put the service-role key in the app. It is only for the Edge Functions and `scripts/seed-staff-users.mjs`.

## Algorithms

Six algorithms. Search and meal-planning each have a simple baseline and the one the app uses. The delivery route is a separate sample. Plain-language write-up: [`docs/algorithms.md`](docs/algorithms.md). Benchmarks for the first five: [`docs/benchmarking/FIL_Foods_Algorithm_Benchmark.ipynb`](docs/benchmarking/FIL_Foods_Algorithm_Benchmark.ipynb).

| # | Algorithm | What it does | Where | Where you see it | Role |
|---|---|---|---|---|---|
| 1 | Substring matching | Is the typed text found, letter for letter, in the stored text? | `frontend/src/lib/algorithms/stringMatch.ts` — `substringMatch` | First (exact) tier of every search | Baseline, kept as the exact tier |
| 2 | Levenshtein distance | Fewest inserts, deletes, and replacements between two words | `stringMatch.ts` — `levenshtein` | Tests and the notebook only | Baseline |
| 3 | Optimal String Alignment (OSA) | Levenshtein, plus a swap of two neighbouring letters counts as one edit (`chikcen` → `chicken` = 1) | `stringMatch.ts` — `osaDistance`, `fuzzyWordMatch`, `bestWordMatch` | Meals search, Help → FAQ, Orders search, Admin → Orders | **Used** (typo tier) |
| 4 | Greedy equal-share selection | Splits the daily targets equally and picks, per slot, the meal closest to that share | `frontend/src/user/services/nutritionService.ts` — `greedyEqualShareSelection` | Tests and the notebook only | Baseline |
| 5 | Exhaustive search | Tries every one-meal-per-slot combination and keeps the best one inside the calorie and fat ceilings | `nutritionService.ts` — `solveNutritionPlan` | `NutritionDayPanel` (“Suggest a day of meals”). That panel is not mounted on a screen right now, so the solver is covered by tests | **Used** by the panel |
| 6 | Dijkstra’s shortest path | Shortest path on a 6-stop sample graph (weights are kilometres, all positive) | `frontend/src/lib/algorithms/routeGraph.ts` — `shortestPath` | Delivery order brief: Hub → the recipient’s stop, with the kilometres | **Used** on that screen. It is a fixed sample graph, not a live map |

Shared search rules: text is lowercased, accents and extra spaces are removed, exact hits come before typo hits. Typo budget: 0 mistakes for 1–2 letters, 1 for 3–5, 2 for 6+. Meal search uses its own budget (1, or 2 for words of 5+ letters). Order references and tracking numbers are never spelling-corrected.

Tests: `frontend/src/lib/algorithms/stringMatch.test.ts`, `frontend/src/user/services/nutritionAlgorithms.test.ts` (exhaustive is never worse than greedy), `frontend/src/lib/algorithms/routeGraph.test.ts`.

## Security

The three course controls are in the repo. The checklist is [`docs/security-controls.md`](docs/security-controls.md).

| Control | What to open |
|---|---|
| Bcrypt password hash (cost 12) on the sample-data sign-in path | `frontend/src/user/services/securityService.ts` |
| Role checks (customer vs staff roles) | `securityService.ts` (`ROLES`, `requireRole`) and `frontend/src/admin/domain/roleAccess.ts`. The database uses a role enum and row-level policies |
| SHA-256 audit chain | `securityService.ts` (`appendAuditEvent`, `verifyAuditChain`) and `verify_audit_chain()` in `supabase/migrations/20261030131000_initial_schema.sql` |

Live customer passwords are handled by Supabase Auth, not by storing a bcrypt hash in the app. The service-role key never ships in the client.

Drafts for the presentation: [`docs/privacy-policy.md`](docs/privacy-policy.md), [`docs/terms-and-conditions.md`](docs/terms-and-conditions.md).

## Run it

You need Node.js.

```bash
git clone https://github.com/colossalshub/fil-foods.git
cd fil-foods/frontend
npm install
npx expo start
```

Browser preview, from `frontend/`:

```bash
npx expo start --web
```

Checks, from `frontend/`:

```bash
npm test
npm run lint
```

Apply the database and deploy the Edge Functions only when you are pointed at a Supabase project. The commands are in [`supabase/README.md`](supabase/README.md).

## Team

Relish (Group 4)

- Hanna Joy L. Argueza
- Michael Angelo C. Gamet
- Jetrick M. Roxas
- Lourdes Jed R. Villanueva

## Still open (do not claim these in a demo)

- SMS codes need an SMS provider. Email confirmation is the live verification path.
- Google sign-in needs the Google provider and redirect URLs configured in Supabase. Steps are in [`supabase/README.md`](supabase/README.md).
- “Suggest a day of meals” is implemented and tested, and it is not on a screen.
- GCash, Maya, and a full payment-status flow (including the cash-on-delivery exception for Kitchen) are not finished.
- Sodium is not yet calculated from each ingredient against the recipient’s limit. The delivery brief uses a sample check.
- A live two-account test of the row-level policies is still the proof that one customer cannot read another customer’s rows.
