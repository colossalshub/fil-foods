# F.I.L. FOODS Meal Management System

A meal app for F.I.L. FOODS (Food Is Life). Clients record a diet, browse meals, get a suggested day of meals, and place a pickup or delivery order.

Built by Relish (Group 4), III-BCSAD, S.Y. 2026–2027.

Repository: https://github.com/colossalshub/fil-foods

## Where things are

| Folder | What it is |
|---|---|
| `frontend/` | The Expo app (React Native and web) |
| `supabase/` | Database schema, row-level security, audit chain, and the username login function |
| `docs/` | Privacy policy, terms, security checklist, and traceability notes |
| `docs/specs/` | User + staff module specs (USR, ADM, DIT, KIT, DEL) and [`meal-service-modules.md`](docs/specs/meal-service-modules.md) |

When `frontend/.env` is missing, the app runs on local sample data. The server schema is in `supabase/`.

Requirements are User Story v6: [`docs/specs/User_Story_v6_20_11_2026.xlsx`](docs/specs/User_Story_v6_20_11_2026.xlsx). Short indexes: [`docs/specs/meal-service-modules.md`](docs/specs/meal-service-modules.md) (USR-01–USR-50, ADM-01–ADM-21, DIT-01–DIT-16, KIT-01–KIT-15, DEL-01–DEL-17 except DEL-14). Implementation status: User [`docs/implementation-traceability.md`](docs/implementation-traceability.md); staff [`docs/implementation-traceability-staff.md`](docs/implementation-traceability-staff.md).

## What the app already does

- Choose whether a meal subscription is for yourself or a family member, register, verify the account, and complete the recipient's allergy and diet profile
- Log in, reset a password, and log out
- Browse and search meals, with allergy and diet warnings
- Suggest one breakfast, lunch, and dinner from daily calorie, protein, and fat targets
- Cart, schedule, and order placement
- Tracking, alerts, and a profile for health, allergies, preferences, and a guardian
- Terms and a privacy policy on registration and on Profile

Some of those flows still use the local sample store until Supabase is configured. The new family-recipient onboarding is currently handled by this local service layer and is not yet persisted to Supabase.

## Algorithms

Five algorithms, in two groups. Each group has a simple baseline and the one the app uses. Plain-language explainer with worked examples: [`docs/algorithms.md`](docs/algorithms.md). Benchmarks: [`docs/benchmarking/FIL_Foods_Algorithm_Benchmark.ipynb`](docs/benchmarking/FIL_Foods_Algorithm_Benchmark.ipynb).

| # | Algorithm | What it does | Where in the code | Screen | Complexity | Role |
|---|---|---|---|---|---|---|
| 1 | Substring matching | Is the typed text found, letter for letter, in the stored text? | `frontend/src/lib/algorithms/stringMatch.ts` — `substringMatch` | First (exact) tier of every search below | O(n·m) worst case | Baseline, kept as the exact tier |
| 2 | Levenshtein distance | Fewest inserts, deletes and replacements between two words | `stringMatch.ts` — `levenshtein` | None (tests and notebook only) | O(n·m) time, O(m) memory | Baseline |
| 3 | Optimal String Alignment (OSA) distance | Levenshtein plus a swap of two neighbouring letters as one edit (`chikcen` → `chicken` = 1) | `stringMatch.ts` — `osaDistance`, `fuzzyWordMatch`, `bestWordMatch`. Called by `searchFaq` (`user/data/helpContent.ts`), `searchClientOrders` (`user/services/trackingService.ts`), `searchOrders` (`admin/domain/search.ts`), `fuzzySearchMeals` (`user/services/orderService.ts`) | Help → FAQ; Orders tab search; Admin → Orders; meal catalog search (not on a screen right now) | O(n·m) per word pair | **Used** (typo tier) |
| 4 | Greedy equal-share selection | Splits daily targets equally across slots and picks, per slot, the meal closest to its share | `frontend/src/user/services/nutritionService.ts` — `greedyEqualShareSelection` | None (tests and notebook only) | O(s·k) for s slots, k meals per slot | Baseline |
| 5 | Exhaustive search | Tries every one-meal-per-slot combination and keeps the best one within the calorie and fat ceilings | `nutritionService.ts` — `solveNutritionPlan`, called by `user/components/NutritionDayPanel.tsx` | "Daily nutrition targets" → "Suggest a day of meals" (panel not mounted on a screen right now) | O(kˢ) combinations | **Used** |

Rules shared by all searches: text is lowercased with accents and extra spaces removed. Exact (substring) hits come before typo hits. Typo budget: 0 for 1–2 letters, 1 for 3–5, 2 for 6+. Order and tracking numbers are never spelling-corrected.

Tests: `frontend/src/lib/algorithms/stringMatch.test.ts` and `frontend/src/user/services/nutritionAlgorithms.test.ts` (including a check that exhaustive is never worse than greedy).

## Security

The three IAS controls are already implemented. The checklist, with what is still partial, is `docs/security-controls.md`.

| Control | What to open |
|---|---|
| Bcrypt password hash (cost 12) | `frontend/src/user/services/securityService.ts` |
| Role bitmask (client, staff, admin) | same file, `ROLES` and `requireRole` |
| SHA-256 audit chain | same file, `appendAuditEvent` and `verifyAuditChain` |
| Database roles, row-level security, and `verify_audit_chain()` | `supabase/migrations/20261030131000_initial_schema.sql` |

Drafts for the presentation:

- `docs/privacy-policy.md` and `docs/terms-and-conditions.md`, filled from the [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/) (Simple)
- `docs/security-controls.md`

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

To point the app at Supabase, copy `frontend/.env.example` to `frontend/.env` and fill in the project URL and anon key. Do not put the service-role key in the app. See `supabase/README.md`.

Checks, from `frontend/`:

```bash
npm test
npm run lint
```

## Team

Relish (Group 4)

- Hanna Joy L. Argueza
- Michael Angelo C. Gamet
- Jetrick M. Roxas
- Lourdes Jed R. Villanueva

## Status

In development. The client screens, the local security controls, and the Supabase migrations are in place. Live SMS, Google sign-in, and a full two-account security test on the hosted database are still open. `docs/implementation-traceability.md` tracks that story by story.
