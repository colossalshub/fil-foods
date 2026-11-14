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

Client requirements are **USR-01 through USR-50** in [`docs/specs/user-module.md`](docs/specs/user-module.md) (PDF: [`docs/specs/FIL_Foods_User_Module.pdf`](docs/specs/FIL_Foods_User_Module.pdf)). Staff requirements are **ADM-01–ADM-21**, **DIT-01–DIT-17**, **KIT-01–KIT-15**, and **DEL-01–DEL-17** in [`docs/specs/meal-service-modules.md`](docs/specs/meal-service-modules.md). Implementation status: User [`docs/implementation-traceability.md`](docs/implementation-traceability.md); staff [`docs/implementation-traceability-staff.md`](docs/implementation-traceability-staff.md).

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

| Algorithm | What to open |
|---|---|
| Fuzzy meal search (edit distance) | `frontend/src/services/orderService.ts` — `fuzzySearchMeals`, `levenshtein`. Used by the Meals search box. |
| Nutritional target solver (one meal per slot, calorie and fat ceilings) | `frontend/src/services/nutritionService.ts` — `solveNutritionPlan`. On the Meals screen, open Daily nutrition targets and choose Suggest a day of meals (`frontend/src/components/NutritionDayPanel.tsx`). |

## Security

The three IAS controls are already implemented. The checklist, with what is still partial, is `docs/security-controls.md`.

| Control | What to open |
|---|---|
| Bcrypt password hash (cost 12) | `frontend/src/services/securityService.ts` |
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
