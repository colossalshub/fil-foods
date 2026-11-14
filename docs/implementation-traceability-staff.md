# Staff modules — implementation traceability

Source of truth:
- Admin: [`docs/specs/admin-module.md`](./specs/admin-module.md) ([`FIL_Foods_Admin_Module.pdf`](./specs/FIL_Foods_Admin_Module.pdf), [handoff](../.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md))
- Dietitian: [`docs/specs/dietitian-module.md`](./specs/dietitian-module.md) ([`FIL_Foods_Dietitian_Module.pdf`](./specs/FIL_Foods_Dietitian_Module.pdf), [handoff](../.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md))
- Kitchen: [`docs/specs/kitchen-module.md`](./specs/kitchen-module.md) ([`FIL_Foods_Kitchen_Module.pdf`](./specs/FIL_Foods_Kitchen_Module.pdf), [handoff](../.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md))
- Delivery: [`docs/specs/delivery-module.md`](./specs/delivery-module.md) ([`FIL_Foods_Delivery_Module.pdf`](./specs/FIL_Foods_Delivery_Module.pdf), [handoff](../.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md))

Cross-module map: [`docs/specs/meal-service-modules.md`](./specs/meal-service-modules.md). User client traceability: [`implementation-traceability.md`](./implementation-traceability.md).

Status values: **Missing** — no usable implementation for the core workflow; **Partial** — some UI or local prototype exists but at least one acceptance criterion is unmet or lacks verification; **Blocked** — cannot satisfy without backend, provider, or cross-app integration called out below.

## Shared staff implementation surface

| Surface | Location | Notes |
|---|---|---|
| Staff app shell | `frontend/src/admin/` | Role picker, dashboards, local `store.ts` |
| Sample staff auth | `frontend/src/admin/data/store.ts` | Demo accounts; not production Supabase staff auth |
| User ↔ staff order gap | `docs/implementation-traceability.md` blockers section | Staff mock orders ≠ user Supabase orders |

## Story-level matrix (initial audit)

Criterion-level test mapping is still in progress. Do not mark a story complete until each numbered system requirement in the PDF has a passing test.

### Admin Module (ADM-01–ADM-21)

| Story | Status | Evidence / gaps |
|---|---|---|
| ADM-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| ADM-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| ADM-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| ADM-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| ADM-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| ADM-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| ADM-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| ADM-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| ADM-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| ADM-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| ADM-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| ADM-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| ADM-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Staff Management; shared store not wired to user Supabase. |
| ADM-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Staff Management; shared store not wired to user Supabase. |
| ADM-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Staff Management; shared store not wired to user Supabase. |
| ADM-16 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Staff Management; shared store not wired to user Supabase. |
| ADM-17 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu Management; shared store not wired to user Supabase. |
| ADM-18 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu Management; shared store not wired to user Supabase. |
| ADM-19 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| ADM-20 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Security & Auditability; shared store not wired to user Supabase. |
| ADM-21 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |

### Dietitian Module (DIT-01–DIT-17)

| Story | Status | Evidence / gaps |
|---|---|---|
| DIT-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| DIT-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DIT-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DIT-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DIT-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DIT-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| DIT-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Allergies & Preferences; shared store not wired to user Supabase. |
| DIT-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Allergies & Preferences; shared store not wired to user Supabase. |
| DIT-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| DIT-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu; shared store not wired to user Supabase. |
| DIT-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| DIT-16 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Access Control; shared store not wired to user Supabase. |
| DIT-17 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Health Information Approval; shared store not wired to user Supabase. |

### Kitchen Module (KIT-01–KIT-15)

| Story | Status | Evidence / gaps |
|---|---|---|
| KIT-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| KIT-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| KIT-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for story; shared store not wired to user Supabase. |
| KIT-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| KIT-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| KIT-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| KIT-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| KIT-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| KIT-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| KIT-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| KIT-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu; shared store not wired to user Supabase. |

### Delivery Module (DEL-01–DEL-17)

| Story | Status | Evidence / gaps |
|---|---|---|
| DEL-01 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-02 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-03 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-04 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-05 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Home & Navigation; shared store not wired to user Supabase. |
| DEL-06 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DEL-07 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for story; shared store not wired to user Supabase. |
| DEL-08 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Settings & Profile; shared store not wired to user Supabase. |
| DEL-09 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Authentication & Account Management; shared store not wired to user Supabase. |
| DEL-10 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Dashboard; shared store not wired to user Supabase. |
| DEL-11 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| DEL-12 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Orders; shared store not wired to user Supabase. |
| DEL-13 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Customers; shared store not wired to user Supabase. |
| DEL-14 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Menu; shared store not wired to user Supabase. |
| DEL-15 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Delivery; shared store not wired to user Supabase. |
| DEL-16 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Delivery; shared store not wired to user Supabase. |
| DEL-17 | Partial | Staff UI prototype under `frontend/src/admin`; verify against PDF criteria for Delivery; shared store not wired to user Supabase. |

## Integration blockers (staff)

- Unify order status model across User PDF (review → payment → kitchen → delivery/pickup) and `frontend/src/admin` local statuses.
- Add Dietitian role to Supabase schema and RLS scopes (DIT-16, USR-41).
- Wire ADM-17/ADM-18 menu changes to User catalog reads (USR-16, USR-17).
- Implement ADM-12 ↔ DEL assignment and DEL-15–DEL-17 status updates on shared order records.
- ADM-20 audit log must include staff, menu, and order events per PDF; connect to existing audit chain in `supabase/`.
