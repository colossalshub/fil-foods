# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

The primary user is the client: the person who registers, signs in, and orders meals either for themselves or for one family member. That person is the account holder. The meal recipient is the person whose health, diet, allergies, and delivery details the meals follow. On a "Signing Up for Myself" account the account holder is also the meal recipient. On a "Signing Up for a Family Member" account they are different people. One meal recipient per account. Notifications go to the account holder.

Admin, Dietitian, Kitchen Staff, and Delivery Staff are separate audiences in the same app. They enter through Select Your Role, then each role's own sign-in and navigation. Design work optimizes for the client first.

## Product Purpose

F.I.L. FOODS (Food Is Life) is a meal service app. A client records a diet, browses meals, gets a suggested day of meals, and places a pickup or delivery order. Success is a saved profile or order with a unique reference, an updated status, a notification to the account holder, and an audit record of who acted and which meal recipient the action concerns.

## Positioning

Meals are chosen and checked for a named recipient, not for a generic cart. The account holder and the meal recipient stay separate records. An order is reviewed by a dietitian for suitability before the client pays and before the kitchen receives it. Suggestions and warnings follow the recipient's allergies, restrictions, preferences, and daily calorie, protein, and fat targets.

## Operating Context

The client moves between Home, Meal, Orders, and Account. Ordering is one meal per meal time, then delivery or pickup, then review. After dietitian approval the client pays. Pickup is completed when Kitchen marks the order ready and the client collects it. Delivery continues through admin assignment and delivery-staff status updates until delivered.

Staff share one order record with the client. Admin owns the menu, prices, availability, staff accounts, and the audit view. The dietitian reviews suitability. Kitchen prepares. Delivery staff update delivery.

Without `frontend/.env`, the app runs on local sample data. With Supabase configured, the app uses that database, row-level security, and role-scoped access. The service-role key stays out of the app.

## Capabilities and Constraints

User Story v6 is binding: USR-01–USR-50, ADM-01–ADM-21, DIT-01–DIT-16, KIT-01–KIT-15, and DEL-01–DEL-17 except DEL-14. Quoted UI strings, validation messages, screen labels, and story IDs stay as written. DIT-17 is not in v6; the app keeps condition-removal approval as an extra. Spreadsheet Passed / Failed / Total rows are QA status, not features. When a client story depends on staff behavior, that staff story is implemented or the conflict is recorded. Staff behavior is not invented to fill a gap.

Confirmed client capabilities include: account purpose (myself or a family member), registration, verification, sign-in, password reset, Google continuation where specified, logout, account deletion, profile and recipient health, diet, allergies, preferences, and a guardian contact, meal browse and detail, cart and schedule, order placement, tracking and alerts, help and FAQ, feedback, terms acceptance with re-accept on a new version, and a suggested day of meals.

Search uses exact substring matching first, then a typo tier (optimal string alignment). Order and tracking numbers are never spelling-corrected. The day suggestion uses exhaustive search within calorie and fat ceilings; greedy equal-share selection is the baseline only.

Security controls in the product are bcrypt password hashing, role checks, and a SHA-256 audit chain, with database roles and row-level security when Supabase is configured.

Open, and not to be treated as done: live SMS, a full two-account security test on the hosted database, staff Google sign-in, the in-app delivery map (DEL-16), persisting the family-recipient onboarding flow to Supabase, and adding staff-created meals into the curated client catalog. The nutrition suggestion panel is implemented but not mounted on a screen.

## Brand Commitments

The product name is F.I.L. FOODS, expanded as Food Is Life. No voice, visual identity, or campaign claim was made binding in this record.

## Evidence on Hand

Requirements and wording live in `docs/specs/User_Story_v6_20_11_2026.xlsx`, with short indexes under `docs/specs/`. Implementation status is `docs/implementation-traceability.md` (client) and `docs/implementation-traceability-staff.md` (staff). Algorithm notes are `docs/algorithms.md`. Draft privacy policy and terms are `docs/privacy-policy.md` and `docs/terms-and-conditions.md`. Security checklist is `docs/security-controls.md`.

There are no customer testimonials, case studies, press mentions, or market benchmarks in the repo. Do not invent them. The app is in development, built by Relish (Group 4), III-BCSAD, S.Y. 2026–2027.

## Product Principles

1. Design for the client who is feeding a specific person, and keep the account holder and the meal recipient visibly distinct.
2. Diet, allergies, and dietitian review gate what can be ordered, paid for, and cooked.
3. Staff roles stay separate audiences with their own specified tools. Do not fold them into the client flow or invent steps the stories do not contain.
4. Quoted story copy and recorded cross-module conflicts outrank a smoother paraphrase.
5. A clear, accessible client interface is part of the product, not a later polish pass.

## Accessibility & Inclusion

USR-48 requires a clear, accessible interface: a defined palette, a 16px minimum, support for large text, and screen-reader use. Terms must be readable in numbered sections (USR-49). Because the app ships on both phone platforms, iOS Dynamic Type, Reduce Motion, and safe areas, and Android font scale, Remove animations, and system insets, are part of meeting that requirement on each device.
