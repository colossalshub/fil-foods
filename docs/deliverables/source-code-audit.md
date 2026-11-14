# Source-code audit — F.I.L. FOODS

**Project:** F.I.L. FOODS Meal Management System  
**Team:** Relish (Group 4), III-BCSAD, S.Y. 2026–2027  
**Repository:** https://github.com/colossalshub/fil-foods  
**Audit date:** 12 November 2026  
**Scope:** Phase 1 only. This document records what the current source actually does. It is not a benchmark, a security certification, or a legal opinion.

Paths below are the TypeScript and SQL files in this checkout. Older notes in `docs/security-controls.md` and `docs/implementation-traceability.md` still point at `.js` files and at an earlier test count. Those notes are stale relative to this tree.

---

## 1. Actual algorithms found

Two search/selection algorithms are implemented in application code. A third, separate ranking routine exists for personalized suggestions. None of them is linear programming, and none is a multi-choice knapsack solver.

### 1.1 Fuzzy meal search

**Where:** `frontend/src/services/orderService.ts`  
**Functions:** `levenshtein`, `fuzzySearchMeals`, with private helpers `maxEditDistance`, `wordMatches`, `mealMatchScore`, `compactNameDistance`, and `catalogText`.  
**Called from:** `searchAndFilterMeals` in the same file, which the Meals screen uses. An empty query is not fuzzy-ranked; it returns every meal already in the list.

**What the code does**

1. `levenshtein` lowercases both strings and builds the full Wagner–Fischer matrix (insert, delete, substitute, each cost 1). Equal strings return 0 immediately.
2. The query and the meal name are split into words. The name splitter also breaks on `-` and `/`. The query splitter breaks on whitespace only.
3. A query word matches a name word when any of these is true:
   - the words are equal, or
   - one word is a prefix of the other, with no edit-distance check, or
   - the Levenshtein distance is at most 2 when the query word has 5 or more characters, otherwise at most 1, **and** the absolute length difference is within that same limit.
4. Every query word must match at least one name word. The name score is the sum of the best matching distances. If any query word matches nothing, the name tier fails.
5. If the name fails, the same word matcher runs against a joined catalog string: `category`, `mealCategories`, `ingredients`, `dietaryTags`, and `diets`. Description and the allergen list are not in that string. A case-insensitive substring of the whole query inside that text also counts, with a fixed score of 3 when the word matcher fails.
6. Ranking is a stable multi-key sort:
   - name matches (tier 0) before catalog matches (tier 1);
   - lower total distance first;
   - if the distances are equal, the meal whose `id` is `sample-tinola` is forced ahead of the other row;
   - then smaller Levenshtein distance between the query and the meal name with spaces, hyphens, and slashes removed;
   - then `localeCompare` on the meal name.
7. An empty or whitespace query returns a shallow copy of the input, in the original order.
8. A query that matches nothing returns `[]`. The screen copy for that case is `ORDER_MSG.noMeals` (`No meals found.`). The search function itself does not return that sentence.

**This is not whole-string fuzzy search.** `Chicken Tinola` can rank first for `tinula` because the words are compared separately. A long wrong query can still match through the prefix rule even when the edit distance would be large.

**Performance shape.** Each distance call allocates a matrix of size `(len(a)+1) * (len(b)+1)`. Search walks every meal. The sort comparator calls `compactNameDistance`, so extra distance matrices are built during sorting. There is no index, no length filter before the matrix, and no result cap. The database migration creates a `pg_trgm` index on `meals.name` (`supabase/migrations/20261030131000_initial_schema.sql`). The application search does not query that index.

**Catalog used by the app.** `frontend/src/data/meals.ts` currently holds 12 meals. Several names are Filipino (Chicken Adobo Bowl, Sinigang na Hipon, Chicken Tinola, Grilled Bangus, Ampalaya Stir-fry). Most rows omit `fat` and `carbs`.

### 1.2 Nutritional target solver

**Where:** `frontend/src/services/nutritionService.ts`, function `solveNutritionPlan`.  
**UI:** `frontend/src/components/NutritionDayPanel.tsx`. The panel builds a target from the calorie, protein, and fat inputs, drops meals that fail allergy, disliked-ingredient, or diet-conflict checks, then calls `solveNutritionPlan`.

**What the code does**

1. Default slots are `Breakfast`, `Lunch`, and `Dinner`. The caller can pass a different slot list.
2. Meals with `available === false` are removed.
3. If a target number is greater than 0, a meal whose matching field is not finite is removed. A blank `fat` fails this check whenever the fat input is greater than 0. Zero, negative, and missing targets do not trigger that check. The helper `number()` turns non-finite values into 0 only after a meal has already been accepted.
4. A meal is eligible for a slot when `category` is missing or `category` equals that slot. `mealCategories` such as `Soup` or `Fish` do not place a meal into a slot. A meal tagged `Snack` is not breakfast, lunch, or dinner. A meal with no `category` is eligible for every slot, so the same meal can be chosen three times.
5. For each slot the code sorts candidates by distance of **that single meal** to the **full daily** calorie, protein, and fat numbers. Weights are 1, 4, and 2. This sort does not change which combination is optimal. It only decides which combination is kept when two full-day scores tie, because the search replaces a stored plan only when the new score is strictly smaller.
6. The search is exhaustive. It visits the Cartesian product of the per-slot lists and keeps one meal from each list.
7. Hard limits, applied to the **sum** of the chosen meals:
   - if calories > 0, total calories must be less than or equal to that number;
   - if fat > 0, total fat must be less than or equal to that number.
8. Protein is a floor, not a ceiling, and only for the `exactMatch` flag: if protein > 0, an exact match requires total protein greater than or equal to the target. A day can be `ok: true` while `exactMatch` is false when calories and fat are inside their ceilings and protein is short. The reason string in that case is the “closest meals within the calorie and fat limits” message.
9. Plan score, used to choose among feasible days and among infeasible days, is `|calorie error| + 4 * |protein error| + 2 * |fat error|` against the daily totals. Carbs are summed and shown. Carbs are not constrained.
10. If any slot has no eligible meal, the result is `ok: false`, `meals: []`, and `NUTRITION_MSG.noSlots`.
11. If every combination breaks a ceiling, the function still returns the lowest-score combination, with `ok: false`, `exactMatch: false`, and the “no exact match” message. It does not return an empty plan in that case.
12. `ok` is true when at least one combination respects the ceilings, including the case where the protein floor is missed.

Allergy and diet exclusions are **not** inside `solveNutritionPlan`. The panel applies them first. A direct call with the raw catalog will suggest conflicting meals.

**Classification.** This is one-per-slot exhaustive enumeration with two hard ceilings and a weighted absolute-deviation score. It is not a 0/1 knapsack, not a multi-choice knapsack, and not a linear program. It does not guarantee a protein target. It does guarantee one selected meal per slot whenever every slot has at least one eligible meal.

**Scale.** Time and memory grow with the product of the slot sizes, not with the sum. A catalog of a few dozen meals split across three slots is small enough to enumerate. Hundreds of meals in each slot are not. The current 12-meal sample is small, and a fat target above 0 drops every sample meal that has no `fat` field. Only Oatmeal with Fruits, Chicken Tinola, and Grilled Bangus store `fat` today, so a fat-limited suggestion has at most one real candidate in breakfast, lunch, and dinner.

### 1.3 Personalized meal ranking (separate from the solver)

**Where:** `rankMeal` and `sortMealsForProfile` in `frontend/src/services/profileService.ts`.  
**Used by:** `getRecommendedMeals` in `orderService.ts`, the Meals screen, and `frontend/src/screens/HomeScreen.tsx`.

This is an additive preference score: +3 for a preferred category, +2 for a matching diet tag, +1 for each matching nutrition preference (`lower-calories` at 400 kcal or below, `higher-protein` at 25 g or a `High-protein` diet tag, `lower-sodium` at 500 mg or a `Low-sodium` tag), and −3 when a disliked ingredient string appears in an ingredient. An allergen tag conflict returns `null` and sorts the meal last. `getRecommendedMeals` also drops unavailable meals, ingredient-level allergen hints, disliked ingredients, and restriction conflicts, then keeps at most five.

This is not the nutritional target solver. It does not build a breakfast/lunch/dinner combination and it does not enforce daily ceilings.

`docs/implementation-traceability.md` still says the signed-in Home screen is missing (USR-35). That statement is out of date. `MainTabs` now includes Home, and `HomeScreen` calls `getRecommendedMeals`.

---

## 2. Actual security controls found

The course controls exist in two places that do not share one implementation: the local sample app, and the Supabase SQL migrations. A control that passes a local unit test is not evidence that the hosted database enforces it.

### 2.1 Password hashing

**Local sample store**

- `hashPassword` / `hashPasswordSync` in `frontend/src/services/securityService.ts` call `bcrypt.hash` / `bcrypt.hashSync` from `bcryptjs` `^3.0.3` with cost factor **12**.
- `comparePassword` / `comparePasswordSync` verify against that hash.
- Registration (`frontend/src/domain/registration.ts`) stores `passwordHash` and does not put the password on the returned public user.
- Login, password reset, and the local biometric check compare against `passwordHash`.
- The seeded sample account in `frontend/src/data/mockStore.ts` is hashed at startup with the same function. The sample password is a fixed development string in that file. It is not a production secret, and it should not be copied into notebooks or slides.
- Tests check that the stored value matches `/^\$2[aby]\$/` and that `passwordStorage === 'bcrypt'`. They do **not** assert the cost factor. The cost 12 claim comes from reading the hash call, not from the assertion.

**Hosted authentication**

- `profiles.id` references `auth.users`. The username login Edge Function (`supabase/functions/login-by-username/index.ts`) looks up the profile with the service-role key, then calls Supabase Auth `grant_type=password`. Password verification on that path is Supabase Auth, not `bcryptjs` in the app.
- This audit did not read a live Auth configuration, so the hosted bcrypt cost is **not** established as 12.
- The Edge Function returns the Auth token payload to the caller. Rate limiting of 10 attempts per device per minute is written in that function. This audit did not execute it against a hosted project.
- When `frontend/.env` is absent, the app stays on the local store. `frontend/.env.example` documents only the public URL and anon key. The service-role key is read from the Edge Function environment, not from the example file.

Argon2id does not appear in the application or the migrations.

### 2.2 Role checks

**Local bitmask**

| Name | Value | Source |
|---|---|---|
| `ROLES.CLIENT` | 1 | `securityService.ts` |
| `ROLES.STAFF` | 2 | same |
| `ROLES.ADMIN` | 4 | same |

`hasRole` requires every bit of the required role to be set. `requireRole` throws `Error` with `code: 'FORBIDDEN'` otherwise. `canViewKitchenRecord` allows staff or admin. Registration always assigns `ROLES.CLIENT`. No frontend code maps a Supabase `app_role` onto `roleMask`.

Local tests cover: a client cannot call `getKitchenOrderView` or `getGuardianForAdmin`; a staff bitmask can read the local kitchen view; an admin bitmask can append an admin audit event. These tests construct the bitmask in the test. They do not authenticate against Supabase.

**Database enum**

`app_role` is `'client' | 'owner_admin' | 'kitchen_staff' | 'delivery_staff'`. `is_staff()` returns true for the three non-client values. No policy in the migrations calls `is_staff()`. There is no staff `SELECT` policy on orders, health rows, or guardians.

`profiles_self_update` allows a signed-in user to update their own profile row, and the policy does not exclude the `role` column. No trigger in the migrations blocks a client from changing `role`. That is a policy gap in the SQL as written. It was not executed against a hosted database in this audit.

### 2.3 SHA-256 audit chain

**Local**

- Hash: `@noble/hashes` SHA-256 of a `JSON.stringify` payload containing `at`, `action`, `userId`, `targetId`, `metadata`, and `previousHash`.
- `appendAuditEvent` pushes onto `db.auditLog`, an ordinary array.
- `verifyAuditChain` recomputes each hash and checks that `previousHash` equals the prior event’s hash (`null` for the first).
- A unit test changes `metadata` on the first event and expects `verifyAuditChain` to return false. Another test expects the chain to remain valid after a profile change.
- The array is not append-only. A caller who holds the database object can splice, reorder, or replace entries. Deleting the last event leaves the remaining prefix valid.

**SQL**

- Table `audit_events` stores `occurred_at`, `actor_id`, `event_type`, `details`, `previous_hash`, and `event_hash`.
- `audit_event_hash` uses `extensions.digest(..., 'sha256')` over a pipe-joined string. That canonical form is not the JSON payload used in TypeScript. The two chains are different algorithms that happen to both use SHA-256.
- `append_audit_event` is `security definer`, takes the previous hash with `FOR UPDATE`, and inserts. It is granted to `authenticated`. Any signed-in user who can call it can append an event of any type. The function records `auth.uid()` as the actor.
- `REVOKE ALL` on `audit_events` from `anon` and `authenticated` blocks direct table reads and writes for those roles. There is no `BEFORE UPDATE` or `BEFORE DELETE` trigger that would stop the table owner.
- `verify_audit_chain` walks rows by assuming the next id is exactly `previous id + 1`. A gap stops the walk. Later rows are then omitted from the result rather than reported as a broken chain. The function is granted to `authenticated` and is `security definer`, so a signed-in user can ask it to read the chain even though the table grant was revoked.
- `place_order` calls `append_audit_event('order_created', ...)` after a new order. Not every user-story action writes an audit row.

### 2.4 Row-level security and related SQL

RLS is enabled in `20261030131000_initial_schema.sql` on profiles, health items, meal preferences, nutritional preferences, guardians, meals, meal components, orders, order items, order status history, notifications, verification codes, login attempts, profile change history, audit events, and settings.

Policies that are actually created:

- a client can select and update their own profile;
- a client can manage their own health, meal-preference, nutrition-preference, and guardian rows;
- a signed-in user can read meals, meal components, and settings;
- a client can read their own orders, items, and status history;
- a client can read and update their own notifications;
- a client can read their own profile change history.

There is no policy granting staff access, no policy for guardians to read a dependent’s data, and no insert policy on `orders` for the client role. Order creation is intended to go through `place_order`, which is `security definer` and granted to `authenticated`.

`20261030140000_harden_order_and_auth_boundaries.sql` adds `meal_conflicts_with_client` and calls it from the hardened `place_order`. That is a server-side allergen check in SQL. It was not executed here.

Verification-code and login-attempt tables have RLS enabled and privileges revoked from `anon` and `authenticated`. The local app still accepts a fixed test verification code (`docs/implementation-traceability.md`, USR-33; `verificationService`). That local path is not the SQL hash-at-rest design.

No two-account RLS test was run in this audit. `docs/implementation-traceability.md` says migrations were applied to a hosted project on 30 October 2026. This checkout was not rechecked against that project, and no service-role key was read.

---

## 3. Source file references

| Concern | File |
|---|---|
| Levenshtein and fuzzy search | `frontend/src/services/orderService.ts` |
| Fuzzy-search tests | `frontend/src/services/orderService.test.ts` |
| Nutrition solver | `frontend/src/services/nutritionService.ts` |
| Solver UI | `frontend/src/components/NutritionDayPanel.tsx` |
| Solver tests | `frontend/src/services/orderService.test.ts`, `frontend/src/services/securityNutrition.test.ts` |
| Preference ranking | `frontend/src/services/profileService.ts` |
| Recommendation UI | `frontend/src/screens/HomeScreen.tsx`, `frontend/src/screens/MealsScreen.tsx` |
| Sample meals | `frontend/src/data/meals.ts` |
| Bcrypt, bitmask, local audit chain | `frontend/src/services/securityService.ts` |
| Registration hashing | `frontend/src/domain/registration.ts` |
| Local login hashing | `frontend/src/services/authService.ts` |
| Schema, RLS, SQL audit chain | `supabase/migrations/20261030131000_initial_schema.sql` |
| Order hardening and allergen function | `supabase/migrations/20261030140000_harden_order_and_auth_boundaries.sql` |
| Username login | `supabase/functions/login-by-username/index.ts` |
| Existing security write-up | `docs/security-controls.md` |
| User-story status | `docs/implementation-traceability.md` |
| Draft privacy policy and terms | `docs/privacy-policy.md`, `docs/terms-and-conditions.md`, `frontend/src/data/legal.ts` |

---

## 4. Existing tests and their results

Command, from `frontend/`:

```bash
npm test
```

Result on 12 November 2026: **109 passed, 0 failed, 0 skipped**. Runtime about 18.3 seconds. Node ran the TypeScript tests with `--experimental-strip-types`. Each file also printed a `MODULE_TYPELESS_PACKAGE_JSON` warning. That warning is not a test failure.

Relevant cases that actually ran:

| Test file | What it checks |
|---|---|
| `orderService.test.ts` | `Chiken Tinola`, `tinula`, and `CHICKEN` rank Chicken Tinola first; `Pizzaa` and `xyz123` return no meals; `Papaya` finds Chicken Tinola through ingredients; one exact nutrition day and one impossible ceiling case |
| `securityNutrition.test.ts` | Audit tamper detection; admin bit required for `auditAdminAction`; three meals under 1800 kcal and 50 g fat |
| `registration.test.ts` | Stored password matches a bcrypt prefix and is absent from the public user |
| `authService.test.ts` | Five failures lock the local account; ten attempts in a minute are limited on the local path; reset replaces the hash |
| `profileService.test.ts` | Ranking fixture; profile changes sit on the local hash chain; another client cannot read them through the local helper |

`npm run lint` (`expo lint`) did not finish a source check. ESLint 9.39.5 crashed with `TypeError: Cannot read properties of undefined (reading 'Intrinsic')` inside `ts-api-utils`. No file-level lint results were produced. Expo’s env loader reported that `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present in the local environment. Their values were not printed and are not recorded here.

No Supabase test, policy test, or notebook was run.

---

## 5. Missing or incomplete functionality

- No professor-issued algorithm checklist is in the repository. The README names fuzzy search and the nutrition solver. The current User Module (USR-01–USR-50 in `docs/specs/user-module.md`; verbatim transcription `.github/Meal_Service_User_Stories_AI_Agent_Handoff.md`) requires case-insensitive fuzzy matching and says exact matches rank above fuzzy matches. It does not name knapsack, linear programming, or a third required algorithm. Completeness against “every recommended algorithm” cannot be claimed until that original checklist is available.
- Fuzzy search has no tests for the distance boundary (distance 2 accepted, distance 3 rejected), duplicate names, an empty catalog, or a query that should match only through the prefix shortcut.
- The nutrition tests do not cover a protein miss inside the ceilings, a missing slot, incomplete `fat` on the real 12-meal catalog, negative targets, or two combinations with the same score.
- Personalized ranking and the daily solver are both present. The traceability matrix still marks Home recommendations as missing.
- Local bcrypt is not the hosted password store. Hosted cost, lockout, and session revocation were not retested.
- The SQL role enum and the client bitmask are not connected.
- Staff and guardian access are not expressed in RLS policies.
- The SQL audit log is privilege-restricted, not trigger-enforced append-only, and its verifier assumes contiguous ids.
- Local verification still has a test-code path. Google sign-in remains a demo provider (`docs/security-controls.md`).
- `docs/privacy-policy.md` and `docs/terms-and-conditions.md` are generator drafts. They already contain operational details that the source does not establish, including the contact `support@mealservice.ph` and an owner described as a company. Those drafts are not evidence of a Data Protection Officer, a retention period, or a completed legal review. In-app modals read `frontend/src/data/legal.ts`. There is no public URL for either document in this audit.

---

## 6. Technical concerns

1. **Prefix shortcut.** `wordMatches` returns true when either word starts with the other, before measuring edit distance. Short queries such as a single letter can match many name words. Benchmarks must copy this rule if they claim to measure the production function.
2. **Hard-coded tie break.** Equal name scores prefer `id === 'sample-tinola'`. That is catalog-specific, not a general ranking rule.
3. **Per-meal sort uses the full-day target.** It does not split calories across breakfast, lunch, and dinner. Because the later search is exhaustive, this does not hide a better combination. It does bias ties.
4. **`ok` is not `exactMatch`.** A day inside the calorie and fat ceilings can still miss the protein floor and be reported as `ok`.
5. **Same uncategorized meal can fill every slot.**
6. **Sample nutrition data are incomplete.** A fat ceiling removes meals with no `fat` number. Publishing those sample numbers as laboratory nutrition data would be false.
7. **Exhaustive search does not scale with catalog size.** Timing 5,000 or 10,000 meals is only meaningful if the per-slot product stays small, or if the benchmark reports that the unpruned solver was not run at that size.
8. **Two audit hashes.** A Python port of the TypeScript chain will not verify SQL rows, and the reverse is also true.
9. **Profile update policy.** As written, it does not freeze `profiles.role`.
10. **`verify_audit_chain` id walk.** A deleted middle id is not reported as a failed later row; the walk stops.
11. **`is_staff()` is unused by policies.** Kitchen authorization in the app is a local bitmask on the sample order object.
12. **Stale docs.** Security checklist paths say `.js`. Traceability says 91 tests and no Home screen. This audit measured 109 passing tests and a Home tab.

---

## 7. What can legitimately be benchmarked

These can be ported and measured, because the TypeScript behavior is deterministic and the unit tests name expected outputs:

- Word-level Levenshtein fuzzy search against exact match and, if desired, a library matcher. Precision, recall, and top-1 accuracy need a labeled query set written for **this** matcher, including its prefix rule. The existing tests only cover a handful of Tinola queries plus two non-matches.
- Wall-clock search time against synthetic catalogs of increasing size. The production function is quadratic in string length and linear in the meal count, with extra work in the comparator.
- The nutrition enumerator against a greedy one-meal-per-slot baseline and, on small slot lists only, a second exhaustive implementation used as a reference.
- Ceiling violations, protein shortfall, `ok` versus `exactMatch`, and runtime as the product of slot sizes grows.
- Local audit-chain tamper detection and bcrypt cost-12 verify time. Those are security measurements, not ALGOCOM algorithms. Password hashes and sample passwords must stay out of any notebook output.

Synthetic Filipino meal names and macros are appropriate inputs. They must be labeled synthetic.

---

## 8. What cannot yet be claimed

- That the solver is a multi-choice knapsack or a linear program.
- That protein is optimized as a hard constraint. It is a weighted error term and a floor on the `exactMatch` flag only.
- That fuzzy search was measured for precision or recall. Those figures do not exist yet.
- Any runtime, memory, accuracy, or scalability number. None was measured in this phase.
- That hosted Supabase Auth uses bcrypt cost 12.
- That RLS, staff denial, audit immutability, or two-client isolation has been proven on the hosted project.
- That Argon2id is implemented.
- That every professor-recommended algorithm is present. The original checklist is not in the repo.
- That the current privacy policy or terms are complete under the Data Privacy Act, or that a public link exists.
- That `npm run lint` is clean. The linter crashed before reporting source issues.

---

## Phase 1 close

Inspected: README, traceability notes, security checklist, privacy and terms drafts, meal catalog, order/nutrition/security/profile services, their tests, registration, auth, both main SQL migrations, and the username-login function.

Completed: this audit.

Files created: `docs/deliverables/source-code-audit.md`.

Tests performed: `npm test` (109/109 pass). `npm run lint` crashed in ESLint’s TypeScript tooling and produced no source diagnostics. No database or notebook run.

Remaining before later phases: port the two algorithms without changing their rules; treat large nutrition catalogs as a product-of-slots problem; keep hosted RLS and Auth claims marked untested; obtain the professor’s algorithm checklist if one exists beyond the README and the user stories; do not treat the generator legal drafts as finished project policy.
