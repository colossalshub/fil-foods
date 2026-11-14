# Kitchen Module specification (current)

**Authority:** [`canonical/kitchen-module.export.md`](./canonical/kitchen-module.export.md). PDF (may lag): [`FIL_Foods_Kitchen_Module.pdf`](./FIL_Foods_Kitchen_Module.pdf).

Verbatim handoff: [`.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md`](../../.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md). Cross-module flow: [`meal-service-modules.md`](./meal-service-modules.md). Staff implementation status: [`docs/implementation-traceability-staff.md`](../implementation-traceability-staff.md).

Do not treat spreadsheet Passed / Failed / Total rows as features. Unresolved conflicts with the User, Admin, Dietitian, Kitchen, or Delivery modules must be recorded, not silently reinterpreted.

## Scope

KIT-01 through KIT-15 (15 stories in this PDF).

## Module precondition and postcondition

**Precondition:** The Kitchen Staff member has a staff account created by the Admin and is logged in. Dietitian-reviewed, paid orders and the available meal menu already exist.

**Postcondition:** The Kitchen Staff has prepared the paid order according to its approved meal selections, allergies and dietary restrictions, and updated its status to Ready for Pickup or the next authorised handoff.

## Story catalog

| ID | Epic | I want to |
|---|---|---|
| KIT-01 | Authentication & Account Management | choose my role on the Select Your Role screen |
| KIT-02 | Authentication & Account Management | log in with my work email and password |
| KIT-03 | Authentication & Account Management | recover my password through my account email |
| KIT-04 | Authentication & Account Management | continue with my Google work account |
| KIT-05 | Home & Navigation | open my notifications from the bell icon |
| KIT-06 | Settings & Profile | view and edit my account details in Settings |
| KIT-07 | Settings & Profile | set language and appearance |
| KIT-08 | Settings & Profile | open Help & Support and About F.I.L Foods |
| KIT-09 | Authentication & Account Management | log out of the app |
| KIT-10 | Dashboard | see my Dashboard with shortcuts to Orders and Menu |
| KIT-11 | Orders | see the orders list with only the food, the customer's first name and the Order ID (fuzzy search on first name and order ID) |
| KIT-12 | Orders | open an order to see its food and the customer's allergies and nutritional preferences |
| KIT-13 | Orders | update a paid, Dietitian-approved order from Preparing to Ready for Pickup |
| KIT-14 | Customers | see a customer's allergies and preferred low or high sugar, calories, sodium and protein |
| KIT-15 | Menu | see all menu items and manage them |

## User Module touchpoints

- **USR-23 / USR-24** — Preparation and ready-for-pickup statuses
- **KIT-11** — Fuzzy order search (benchmarked with ADM-11 / DEL-11)
- **KIT-12 / KIT-13** — Mark preparing and ready; link to Delivery

## Cross-module chain

See [`meal-service-modules.md`](./meal-service-modules.md) for the end-to-end order and data flow across USR, ADM, DIT, KIT, and DEL stories.
