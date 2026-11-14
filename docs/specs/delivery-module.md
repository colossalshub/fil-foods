# Delivery Module specification (current)

**Authority:** [`canonical/delivery-module.export.md`](./canonical/delivery-module.export.md). PDF (may lag): [`FIL_Foods_Delivery_Module.pdf`](./FIL_Foods_Delivery_Module.pdf).

Verbatim handoff: [`.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md`](../../.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md). Cross-module flow: [`meal-service-modules.md`](./meal-service-modules.md). Staff implementation status: [`docs/implementation-traceability-staff.md`](../implementation-traceability-staff.md).

Do not treat spreadsheet Passed / Failed / Total rows as features. Unresolved conflicts with the User, Admin, Dietitian, Kitchen, or Delivery modules must be recorded, not silently reinterpreted.

## Scope

DEL-01 through DEL-17 (17 stories in this PDF).

## Module precondition and postcondition

**Precondition:** The Delivery Staff member has a staff account created by the Admin and is logged in. Paid orders marked Ready for Pickup and assigned for delivery exist.

**Postcondition:** Delivery progress is saved, the Admin and user can see the updated status, and the action is logged.

## Story catalog

| ID | Epic | I want to |
|---|---|---|
| DEL-01 | Authentication & Account Management | choose my role on the Select Your Role screen |
| DEL-02 | Authentication & Account Management | log in with my work email and password |
| DEL-03 | Authentication & Account Management | recover my password through my account email |
| DEL-04 | Authentication & Account Management | continue with my Google work account |
| DEL-05 | Home & Navigation | open my notifications from the bell icon |
| DEL-06 | Settings & Profile | view and edit my account details in Settings |
| DEL-07 | Settings & Profile | set language and appearance |
| DEL-08 | Settings & Profile | open Help & Support and About F.I.L Foods |
| DEL-09 | Authentication & Account Management | log out of the app |
| DEL-10 | Dashboard | see my Dashboard with shortcuts to Orders and Menu |
| DEL-11 | Orders | see the orders list with only the food, the customer's first name and the Order ID |
| DEL-12 | Orders | open an order to see its food and the customer's allergies and nutritional preferences |
| DEL-13 | Customers | see a customer's allergies and preferred low or high sugar, calories, sodium and protein |
| DEL-14 | Menu | see all menu items and manage them |
| DEL-15 | Delivery | see the delivery address information of an order |
| DEL-16 | Delivery | see a map of the delivery location |
| DEL-17 | Delivery | update a delivery order from Out for Delivery to Completed (start from Ready for Pickup when assigned) |

## User Module touchpoints

- **ADM-12** — Admin assigns delivery staff
- **USR-23 / USR-24** — Out for delivery and delivered statuses
- **DEL-15–DEL-17** — Delivery progress and completion

## Cross-module chain

See [`meal-service-modules.md`](./meal-service-modules.md) for the end-to-end order and data flow across USR, ADM, DIT, KIT, and DEL stories.
