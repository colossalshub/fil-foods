# Dietitian Module specification (current)

**Authority:** `FIL_Foods_User_5.xlsx` Dietitian Module (32 pages). Canonical copy: [`FIL_Foods_Dietitian_Module.pdf`](./FIL_Foods_Dietitian_Module.pdf).

This document is the working index. Verbatim page transcription: [`.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md`](../../.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md). Cross-module flow: [`meal-service-modules.md`](./meal-service-modules.md). Staff implementation status: [`docs/implementation-traceability-staff.md`](../implementation-traceability-staff.md).

Do not treat spreadsheet Passed / Failed / Total rows as features. Unresolved conflicts with the User, Admin, Dietitian, Kitchen, or Delivery modules must be recorded, not silently reinterpreted.

## Scope

DIT-01 through DIT-17 (17 stories in this PDF).

## Module precondition and postcondition

**Precondition:** The Dietitian has an account, is logged in to the F.I.L. Foods staff app, and customer profiles, allergies, preferences, menu items and submitted orders are available.

**Postcondition:** Review decisions, restriction approvals, and order suitability outcomes are saved, the user is notified where required, and Kitchen receives only approved, paid orders.

## Story catalog

| ID | Epic | I want to |
|---|---|---|
| DIT-01 | Authentication & Account Management | choose my role on the Select Your Role screen |
| DIT-02 | Authentication & Account Management | log in with my work email and password |
| DIT-03 | Authentication & Account Management | recover my password through my account email |
| DIT-04 | Authentication & Account Management | continue with my Google work account |
| DIT-05 | Home & Navigation | open my notifications from the bell icon |
| DIT-06 | Settings & Profile | view and edit my account details in Settings |
| DIT-07 | Settings & Profile | set notifications, language and appearance |
| DIT-08 | Settings & Profile | open Help & Support and About F.I.L Foods |
| DIT-09 | Authentication & Account Management | log out of the app |
| DIT-10 | Dashboard | see my Dashboard with allergies, customer preferences and a menu overview |
| DIT-11 | Allergies & Preferences | see customers' allergies |
| DIT-12 | Allergies & Preferences | see each customer's preferred low or high levels of sugar, calories, sodium and protein |
| DIT-13 | Customers | open a customer and review their profile, preferences and order history |
| DIT-14 | Menu | view all menu items without being able to change them |
| DIT-15 | Orders | review submitted meal selections and the user's dietary information |
| DIT-16 | Access Control | be blocked from staff management, sales figures and menu management |
| DIT-17 | Health Information Approval | review a request to remove a customer's health condition and approve or reject it |

## User Module touchpoints

- **USR-09** — Doctor-given restrictions visible to Dietitian
- **USR-18** — Customizations pending Dietitian review
- **USR-20** — Payment gate after Dietitian approval (DIT-15)
- **USR-35 / USR-39** — Clinical suitability vs client-side filtering
- **DIT-17** — Health-condition removal approval

## Cross-module chain

See [`meal-service-modules.md`](./meal-service-modules.md) for the end-to-end order and data flow across USR, ADM, DIT, KIT, and DEL stories.
