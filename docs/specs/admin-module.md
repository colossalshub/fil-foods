# Admin Module specification (current)

**Authority:** `FIL_Foods_User_5.xlsx` Admin Module (40 pages). Canonical copy: [`FIL_Foods_Admin_Module.pdf`](./FIL_Foods_Admin_Module.pdf).

This document is the working index. Verbatim page transcription: [`.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md`](../../.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md). Cross-module flow: [`meal-service-modules.md`](./meal-service-modules.md). Staff implementation status: [`docs/implementation-traceability-staff.md`](../implementation-traceability-staff.md).

Do not treat spreadsheet Passed / Failed / Total rows as features. Unresolved conflicts with the User, Admin, Dietitian, Kitchen, or Delivery modules must be recorded, not silently reinterpreted.

## Scope

ADM-01 through ADM-21 (21 stories in this PDF).

## Module precondition and postcondition

**Precondition:** The Admin has an account, is logged in to the F.I.L. Foods staff app, and the menu, meal prices, plans, staff accounts and customer orders are available in the system.

**Postcondition:** Approved menu, pricing, plan, staff and order changes are saved, the affected roles see the updates, and important actions are recorded in the audit log.

## Story catalog

| ID | Epic | I want to |
|---|---|---|
| ADM-01 | Authentication & Account Management | choose my role on the Select Your Role screen |
| ADM-02 | Authentication & Account Management | log in with my work email and password |
| ADM-03 | Authentication & Account Management | recover my password through my account email |
| ADM-04 | Authentication & Account Management | continue with my Google work account |
| ADM-05 | Home & Navigation | open my notifications from the bell icon |
| ADM-06 | Settings & Profile | view and edit my account details in Settings |
| ADM-07 | Settings & Profile | set language and appearance |
| ADM-08 | Settings & Profile | open Help & Support and About F.I.L Foods |
| ADM-09 | Authentication & Account Management | log out of the app |
| ADM-10 | Dashboard | see totals for orders, sales, customers and menu items on my Dashboard |
| ADM-11 | Orders | view, search and filter all customer orders and open any order |
| ADM-12 | Orders | update an order's status and assign it to a delivery staff member |
| ADM-13 | Staff Management | view and filter all staff accounts |
| ADM-14 | Staff Management | add a new staff member |
| ADM-15 | Staff Management | edit a staff member and confirm before saving |
| ADM-16 | Staff Management | delete a staff member after a clear warning |
| ADM-17 | Menu Management | view the menu, meal categories, prices and availability |
| ADM-18 | Menu Management | add, edit, delete and set availability of menu items |
| ADM-19 | Customers | view the customer list and each customer's allergies and nutritional preferences |
| ADM-20 | Security & Auditability | see an audit log of staff, menu and order changes |
| ADM-21 | Settings & Profile | control which notifications Kitchen Staff and Delivery Staff receive |

## User Module touchpoints

- **USR-16 / USR-17** — Admin menu and availability (ADM-17, ADM-18)
- **USR-19** — Delivery fee, hours, and pickup settings configured by Admin
- **USR-20** — Order list and status flow after Dietitian approval and payment
- **USR-25 / USR-29** — Admin announcements and feedback review
- **USR-47** — Admin anonymization rules when a user deletes an account

## Cross-module chain

See [`meal-service-modules.md`](./meal-service-modules.md) for the end-to-end order and data flow across USR, ADM, DIT, KIT, and DEL stories.
