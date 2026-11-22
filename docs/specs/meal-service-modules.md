# Meal service modules

Source of truth: [`User_Story_v6_20_11_2026.xlsx`](./User_Story_v6_20_11_2026.xlsx) (20 Nov 2026). The files below are indexes. Read acceptance criteria from the matching sheet only for the story you are implementing. The PDFs in this folder are an older export. Do not use them.

| Module | Stories | Index | Traceability |
|---|---|---|---|
| User (client) | USR-01–USR-50, plus 22 Nov USR-51 and USR-52 | [`user-module.md`](./user-module.md) | [`implementation-traceability.md`](../implementation-traceability.md) |
| Admin | ADM-01–ADM-21 | [`admin-module.md`](./admin-module.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |
| Dietitian | DIT-01–DIT-16 | [`dietitian-module.md`](./dietitian-module.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |
| Kitchen | KIT-01–KIT-15 | [`kitchen-module.md`](./kitchen-module.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |
| Delivery | DEL-01–DEL-13, DEL-15–DEL-17 | [`delivery-module.md`](./delivery-module.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |

There is no DEL-14. DIT-17 is not in v6.

The 22 Nov 2026 customer-module export adds estimated waiting time and an Account subscription section. It numbers them USR-51 and USR-52, and says the same waiting time is shown to staff under ADM-22, DIT-17, KIT-16, and DEL-18. Those staff stories are not in v6. In this repo, USR-51 already means a special request on a meal, and DIT-17 already means condition-removal requests kept beyond the workbook. Staff screens were not changed for the waiting-time story.

Staff share one **Select Your Role** entry (ADM-01, DIT-01, KIT-01, DEL-01): Admin, Dietitian, Kitchen Staff, Delivery Staff. Each role then has its own sign-in and navigation.

## Order chain

User (USR-20) submits the order. Dietitian reviews suitability (DIT-15). The user pays after approval. Kitchen receives the approved, paid order (KIT-11 to KIT-13). Admin assigns delivery staff where needed (ADM-12). Delivery Staff updates delivery status (DEL-15 to DEL-17). For pickup, Kitchen marks Ready for Pickup and the order is completed after collection. Admin manages the menu and availability used by the user menu (ADM-17 and ADM-18). Kitchen sets availability only.

## Data ownership

| Data | Owner | Also used by |
|---|---|---|
| Menu items, prices, availability | Admin (ADM-17, ADM-18); Kitchen sets availability (KIT-15) | User browse (USR-16, USR-17), Dietitian read-only (DIT-14) |
| Account and meal-recipient health/diet | User (USR-07–USR-15, USR-43–USR-46) | Admin customers (ADM-19), Dietitian review (DIT-11–DIT-15) |
| Staff accounts | Admin (ADM-13–ADM-16) | Staff sign-in. Dietitian has no staff CRUD (DIT-16) |
| Order status | Shared | User (USR-21–USR-24), Admin (ADM-11, ADM-12), Dietitian (DIT-15), Kitchen (KIT-11–KIT-13), Delivery (DEL-11–DEL-17) |
| Audit | Admin (ADM-20); user profile history (USR-38, USR-42) | |
| Notifications | Admin settings (ADM-21); user inbox (USR-25) | Staff bells (ADM-05, DIT-05, KIT-05, DEL-05) |

Passed / Failed / Total rows in the workbook are QA status, not features. Record conflicts between modules. Do not invent staff behavior.
