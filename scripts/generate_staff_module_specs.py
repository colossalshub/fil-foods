"""Generate staff-module spec indexes, handoffs, and copy canonical PDFs from attachments."""
from __future__ import annotations

import re
import shutil
from pathlib import Path

from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[1]
ATT = Path(
    r"c:\Users\micha\.cursor\projects\e-Documents-Projects-fil-foods"
    r"\attachments\134b01c1-2c9a-467a-ba3e-9e990007c980"
)

MODULES = [
    {
        "key": "admin",
        "title": "Admin Module",
        "prefix": "ADM",
        "id_min": 1,
        "id_max": 21,
        "persona_regex": r"Admin",
        "precondition": (
            "The Admin has an account, is logged in to the F.I.L. Foods staff app, and the menu, "
            "meal prices, plans, staff accounts and customer orders are available in the system."
        ),
        "postcondition": (
            "Approved menu, pricing, plan, staff and order changes are saved, the affected roles see "
            "the updates, and important actions are recorded in the audit log."
        ),
        "src_pdf": "FIL_Foods_User_5.xlsx_-_Admin_Module.pdf",
        "dest_pdf": "FIL_Foods_Admin_Module.pdf",
        "index_file": "admin-module.md",
        "handoff_file": "Meal_Service_Admin_Module_AI_Agent_Handoff.md",
        "client_touches": [
            ("USR-16 / USR-17", "Admin menu and availability (ADM-17, ADM-18)"),
            ("USR-19", "Delivery fee, hours, and pickup settings configured by Admin"),
            ("USR-20", "Order list and status flow after Dietitian approval and payment"),
            ("USR-25 / USR-29", "Admin announcements and feedback review"),
            ("USR-47", "Admin anonymization rules when a user deletes an account"),
        ],
    },
    {
        "key": "dietitian",
        "title": "Dietitian Module",
        "prefix": "DIT",
        "id_min": 1,
        "id_max": 17,
        "persona_regex": r"Dietitian",
        "precondition": (
            "The Dietitian has an account, is logged in to the F.I.L. Foods staff app, and customer "
            "profiles, allergies, preferences, menu items and submitted orders are available."
        ),
        "postcondition": (
            "Review decisions, restriction approvals, and order suitability outcomes are saved, the user "
            "is notified where required, and Kitchen receives only approved, paid orders."
        ),
        "src_pdf": "FIL_Foods_User_5.xlsx_-_Dietitian_Module.pdf",
        "dest_pdf": "FIL_Foods_Dietitian_Module.pdf",
        "index_file": "dietitian-module.md",
        "handoff_file": "Meal_Service_Dietitian_Module_AI_Agent_Handoff.md",
        "client_touches": [
            ("USR-09", "Doctor-given restrictions visible to Dietitian"),
            ("USR-18", "Customizations pending Dietitian review"),
            ("USR-20", "Payment gate after Dietitian approval (DIT-15)"),
            ("USR-35 / USR-39", "Clinical suitability vs client-side filtering"),
            ("DIT-17", "Health-condition removal approval"),
        ],
    },
    {
        "key": "kitchen",
        "title": "Kitchen Module",
        "prefix": "KIT",
        "id_min": 1,
        "id_max": 15,
        "persona_regex": r"Kitchen\s+Staff(?:\s+member)?",
        "precondition": (
            "The Kitchen Staff member has an account, is logged in to the F.I.L. Foods staff app, and "
            "approved paid orders, customer allergen data, and menu availability are available."
        ),
        "postcondition": (
            "Preparation status updates are saved, the user sees progress notifications, and pickup or "
            "delivery handoff follows the order's fulfillment type."
        ),
        "src_pdf": "FIL_Foods_User_5.xlsx_-_Kitchen_Module.pdf",
        "dest_pdf": "FIL_Foods_Kitchen_Module.pdf",
        "index_file": "kitchen-module.md",
        "handoff_file": "Meal_Service_Kitchen_Module_AI_Agent_Handoff.md",
        "client_touches": [
            ("USR-23 / USR-24", "Preparation and ready-for-pickup statuses"),
            ("KIT-11", "Fuzzy order search (benchmarked with ADM-11 / DEL-11)"),
            ("KIT-12 / KIT-13", "Mark preparing and ready; link to Delivery"),
        ],
    },
    {
        "key": "delivery",
        "title": "Delivery Module",
        "prefix": "DEL",
        "id_min": 1,
        "id_max": 17,
        "persona_regex": r"Delivery\s+Staff(?:\s+member)?",
        "precondition": (
            "The Delivery Staff member has an account, is logged in to the F.I.L. Foods staff app, and "
            "assigned delivery orders with customer address and contact details are available."
        ),
        "postcondition": (
            "Delivery status updates are saved, the user receives tracking notifications, and completed "
            "deliveries close the order when rules are met."
        ),
        "src_pdf": "FIL_Foods_User_5.xlsx_-_Delivery_Module.pdf",
        "dest_pdf": "FIL_Foods_Delivery_Module.pdf",
        "index_file": "delivery-module.md",
        "handoff_file": "Meal_Service_Delivery_Module_AI_Agent_Handoff.md",
        "client_touches": [
            ("ADM-12", "Admin assigns delivery staff"),
            ("USR-23 / USR-24", "Out for delivery and delivered statuses"),
            ("DEL-15–DEL-17", "Delivery progress and completion"),
        ],
    },
]


def normalize_ids(text: str, prefix: str) -> str:
    text = re.sub(rf"{prefix}\s*-\s*\n\s*(\d{{2}})", rf"{prefix}-\1", text)
    text = re.sub(rf"{prefix}\s*-\s*(\d{{2}})", rf"{prefix}-\1", text)
    text = re.sub(
        rf"{prefix}\s*-\s*\n\s*(\d{{1}})",
        lambda m: f"{prefix}-0{m.group(1)}",
        text,
    )
    return text


def extract_stories(text: str, prefix: str, persona_regex: str) -> list[tuple[str, str, str]]:
    pattern = re.compile(rf"({prefix}-\d{{2}})")
    parts = pattern.split(text)
    seen: dict[str, tuple[str, str]] = {}
    order: list[str] = []
    i = 1
    while i < len(parts):
        sid = parts[i]
        body = parts[i + 1] if i + 1 < len(parts) else ""
        i += 2
        if sid in seen:
            continue
        body_clean = re.sub(r"\s+", " ", body).strip()
        epic = ""
        m1 = re.match(
            rf"\s*([A-Za-z][A-Za-z\s&]+?)\s+As (?:an?\s+)?(?:{persona_regex})",
            body_clean,
            re.I,
        )
        if m1:
            epic = m1.group(1).strip()
        action = ""
        m2 = re.search(
            rf"As (?:an?\s+)?(?:{persona_regex})\s+(.+?)\s+so that\s+(.+?)\.\s+Given",
            body_clean,
            re.I,
        )
        if m2:
            action = re.sub(r"\s+", " ", m2.group(1).strip())
        seen[sid] = (epic, action)
        order.append(sid)
    return [(sid, seen[sid][0], seen[sid][1]) for sid in order]


def story_sort_key(sid: str) -> int:
    return int(sid.split("-")[1])


def build_index(mod: dict, stories: list[tuple[str, str, str]], page_count: int) -> str:
    story_range = f'{mod["prefix"]}-{mod["id_min"]:02d} through {mod["prefix"]}-{mod["id_max"]:02d}'
    sorted_stories = sorted(stories, key=lambda row: story_sort_key(row[0]))
    rows = []
    for sid, epic, action in sorted_stories:
        rows.append(f"| {sid} | {epic or '—'} | {action or 'See PDF / handoff'} |")
    client_links = "\n".join(f"- **{a}** — {b}" for a, b in mod["client_touches"])
    return f"""# {mod["title"]} specification (current)

**Authority:** `FIL_Foods_User_5.xlsx` {mod["title"]} ({page_count} pages). Canonical copy: [`{mod["dest_pdf"]}`](./{mod["dest_pdf"]}).

This document is the working index. Verbatim page transcription: [`.github/{mod["handoff_file"]}`](../../.github/{mod["handoff_file"]}). Cross-module flow: [`meal-service-modules.md`](./meal-service-modules.md). Staff implementation status: [`docs/implementation-traceability-staff.md`](../implementation-traceability-staff.md).

Do not treat spreadsheet Passed / Failed / Total rows as features. Unresolved conflicts with the User, Admin, Dietitian, Kitchen, or Delivery modules must be recorded, not silently reinterpreted.

## Scope

{story_range} ({len(sorted_stories)} stories in this PDF).

## Module precondition and postcondition

**Precondition:** {mod["precondition"]}

**Postcondition:** {mod["postcondition"]}

## Story catalog

| ID | Epic | I want to |
|---|---|---|
{chr(10).join(rows)}

## User Module touchpoints

{client_links}

## Cross-module chain

See [`meal-service-modules.md`](./meal-service-modules.md) for the end-to-end order and data flow across USR, ADM, DIT, KIT, and DEL stories.
"""


def build_handoff(mod: dict, pages: list[str]) -> str:
    story_range = f'{mod["prefix"]}-{mod["id_min"]:02d} through {mod["prefix"]}-{mod["id_max"]:02d}'
    page_blocks = []
    for n, text in enumerate(pages, 1):
        page_blocks.append(f"### PDF page {n}\n\n{text.strip()}\n")
    return f"""# {mod["title"]} Requirements - {story_range}

**Source:** [`docs/specs/{mod["dest_pdf"]}`](../docs/specs/{mod["dest_pdf"]}) (`FIL_Foods_User_5.xlsx` {mod["title"]}, {len(pages)} pages). Story index: [`docs/specs/{mod["index_file"]}`](../docs/specs/{mod["index_file"]}).
**Authority:** Requirements and acceptance criteria must be followed as written; unresolved conflicts with other modules must be recorded, not silently reinterpreted.

## Implementation instructions

- Preserve every user story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Map each criterion to its screen/component, service/API, data model, and automated test before marking it complete in [`docs/implementation-traceability-staff.md`](../docs/implementation-traceability-staff.md).
- Identify conflicts, ambiguities, dependencies, and external blockers rather than inventing business rules.
- Distinguish requirements from spreadsheet test-status rows (Passed / Failed / Total); do not treat status labels as features.

## PDF transcription

Page headings preserve source pagination. Page content is extracted verbatim from the supplied PDF; table rows may wrap across page boundaries.

{"".join(page_blocks)}
"""


MEAL_SERVICE_MODULES = """# F.I.L. Foods meal service — module map

This is the cross-module index for the User 5 specification set. Each module has a story index under `docs/specs/`, a canonical PDF, a verbatim handoff under `.github/`, and traceability in `docs/implementation-traceability.md` (User) or `docs/implementation-traceability-staff.md` (staff roles).

## Modules

| Module | Stories | Index | PDF | Handoff | Traceability |
|---|---|---|---|---|---|
| User (client app) | USR-01–USR-50 | [`user-module.md`](./user-module.md) | [`FIL_Foods_User_Module.pdf`](./FIL_Foods_User_Module.pdf) | [`.github/Meal_Service_User_Stories_AI_Agent_Handoff.md`](../.github/Meal_Service_User_Stories_AI_Agent_Handoff.md) | [`implementation-traceability.md`](../implementation-traceability.md) |
| Admin | ADM-01–ADM-21 | [`admin-module.md`](./admin-module.md) | [`FIL_Foods_Admin_Module.pdf`](./FIL_Foods_Admin_Module.pdf) | [`.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md`](../.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |
| Dietitian | DIT-01–DIT-17 | [`dietitian-module.md`](./dietitian-module.md) | [`FIL_Foods_Dietitian_Module.pdf`](./FIL_Foods_Dietitian_Module.pdf) | [`.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md`](../.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |
| Kitchen | KIT-01–KIT-15 | [`kitchen-module.md`](./kitchen-module.md) | [`FIL_Foods_Kitchen_Module.pdf`](./FIL_Foods_Kitchen_Module.pdf) | [`.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md`](../.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |
| Delivery | DEL-01–DEL-17 | [`delivery-module.md`](./delivery-module.md) | [`FIL_Foods_Delivery_Module.pdf`](./FIL_Foods_Delivery_Module.pdf) | [`.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md`](../.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md) | [`implementation-traceability-staff.md`](../implementation-traceability-staff.md) |

## Shared staff entry

All staff modules assume the same **Select Your Role** entry (ADM-01, DIT-01, KIT-01, DEL-01) with four role cards: Admin, Dietitian, Kitchen Staff, and Delivery Staff. Each role then uses its own login surface and bottom navigation as specified in that module's PDF.

## Order lifecycle (delivery)

```mermaid
flowchart LR
  USR20[USR-20 Submit order] --> DIT15[DIT-15 Dietitian review]
  DIT15 -->|Approved| USR20pay[USR-20 User payment]
  DIT15 -->|Rejected / changes| USR20
  USR20pay --> KIT11[KIT-11 Kitchen queue]
  KIT11 --> KIT12[KIT-12 Preparing]
  KIT12 --> ADM12[ADM-12 Assign delivery staff]
  ADM12 --> DEL15[DEL-15 Out for delivery]
  DEL15 --> DEL17[DEL-17 Delivered]
```

## Order lifecycle (pickup)

After Dietitian approval and payment, Kitchen moves the order through preparation (KIT-12, KIT-13 **Ready for Pickup**). The User collects the meal; Kitchen marks completion per KIT-13/KIT-14 scenarios. Admin may still monitor the order on ADM-11/ADM-12 without assignment to Delivery Staff.

## Data ownership

| Data | Primary owner module | Consumed by |
|---|---|---|
| Menu items, prices, availability | Admin (ADM-17, ADM-18) | User browse (USR-16, USR-17), Dietitian read-only menu (DIT-14), Kitchen menu view (KIT-15) |
| Customer profile & meal recipient health/diet | User (USR-07–USR-15, USR-43–USR-46) | Admin customer list (ADM-19), Dietitian review (DIT-11–DIT-15, DIT-17) |
| Staff accounts & roles | Admin (ADM-13–ADM-16) | All staff logins; Dietitian excluded from staff CRUD (DIT-16) |
| Order status & history | Shared contract | User tracking (USR-21–USR-24); Admin (ADM-11, ADM-12); Dietitian (DIT-15); Kitchen (KIT-11–KIT-13); Delivery (DEL-11–DEL-17) |
| Audit log | Admin view (ADM-20); User profile history (USR-38, USR-42) | Security stories across modules |
| Notifications | Admin settings (ADM-21); User inbox (USR-25) | Staff bells (ADM-05, DIT-05, KIT-05, DEL-05) |

## Known implementation gaps (repository snapshot)

These are planning notes, not new requirements. See staff traceability for story-level status.

- The in-app staff console under `frontend/src/admin` uses a **local** store and simplified statuses (Pending, Preparing, Delivered, Cancelled) that do not yet match the PDF order workflow (Dietitian review, payment, assignment).
- Supabase roles today: `client`, `owner_admin`, `kitchen_staff`, `delivery_staff` — **no `dietitian` role** in migrations; DIT stories are blocked until schema and RLS catch up.
- User app Supabase orders and staff mock orders are **not** the same data path until integration work lands.

## Traceability rules

- Mark a story **complete** only when every numbered acceptance criterion in the PDF maps to a passing automated test or a documented manual check.
- When a User story names Admin/Dietitian/Kitchen/Delivery behavior, implement the staff story (or record the conflict) before claiming the User criterion satisfied.
- Spreadsheet Passed / Failed / Total rows in the PDF exports are QA status only, not product features.
"""


def build_staff_traceability(modules_parsed: list[tuple[dict, list[tuple[str, str, str]]]]) -> str:
    lines = [
        "# Staff modules — implementation traceability",
        "",
        "Source of truth:",
        "- Admin: [`docs/specs/admin-module.md`](./specs/admin-module.md) ([`FIL_Foods_Admin_Module.pdf`](./specs/FIL_Foods_Admin_Module.pdf), [handoff](../.github/Meal_Service_Admin_Module_AI_Agent_Handoff.md))",
        "- Dietitian: [`docs/specs/dietitian-module.md`](./specs/dietitian-module.md) ([`FIL_Foods_Dietitian_Module.pdf`](./specs/FIL_Foods_Dietitian_Module.pdf), [handoff](../.github/Meal_Service_Dietitian_Module_AI_Agent_Handoff.md))",
        "- Kitchen: [`docs/specs/kitchen-module.md`](./specs/kitchen-module.md) ([`FIL_Foods_Kitchen_Module.pdf`](./specs/FIL_Foods_Kitchen_Module.pdf), [handoff](../.github/Meal_Service_Kitchen_Module_AI_Agent_Handoff.md))",
        "- Delivery: [`docs/specs/delivery-module.md`](./specs/delivery-module.md) ([`FIL_Foods_Delivery_Module.pdf`](./specs/FIL_Foods_Delivery_Module.pdf), [handoff](../.github/Meal_Service_Delivery_Module_AI_Agent_Handoff.md))",
        "",
        "Cross-module map: [`docs/specs/meal-service-modules.md`](./specs/meal-service-modules.md). User client traceability: [`implementation-traceability.md`](./implementation-traceability.md).",
        "",
        "Status values: **Missing** — no usable implementation for the core workflow; **Partial** — some UI or local prototype exists but at least one acceptance criterion is unmet or lacks verification; **Blocked** — cannot satisfy without backend, provider, or cross-app integration called out below.",
        "",
        "## Shared staff implementation surface",
        "",
        "| Surface | Location | Notes |",
        "|---|---|---|",
        "| Staff app shell | `frontend/src/admin/` | Role picker, dashboards, local `store.ts` |",
        "| Sample staff auth | `frontend/src/admin/data/store.ts` | Demo accounts; not production Supabase staff auth |",
        "| User ↔ staff order gap | `docs/implementation-traceability.md` blockers section | Staff mock orders ≠ user Supabase orders |",
        "",
        "## Story-level matrix (initial audit)",
        "",
        "Criterion-level test mapping is still in progress. Do not mark a story complete until each numbered system requirement in the PDF has a passing test.",
        "",
    ]
    for mod, stories in modules_parsed:
        sorted_stories = sorted(stories, key=lambda row: story_sort_key(row[0]))
        lines.append(f"### {mod['title']} ({mod['prefix']}-{mod['id_min']:02d}–{mod['prefix']}-{mod['id_max']:02d})")
        lines.append("")
        lines.append("| Story | Status | Evidence / gaps |")
        lines.append("|---|---|---|")
        for sid, epic, _action in sorted_stories:
            lines.append(
                f"| {sid} | Partial | Staff UI prototype under `frontend/src/admin`; "
                f"verify against PDF criteria for {epic or 'story'}; shared store not wired to user Supabase. |"
            )
        lines.append("")
    lines.extend(
        [
            "## Integration blockers (staff)",
            "",
            "- Unify order status model across User PDF (review → payment → kitchen → delivery/pickup) and `frontend/src/admin` local statuses.",
            "- Add Dietitian role to Supabase schema and RLS scopes (DIT-16, USR-41).",
            "- Wire ADM-17/ADM-18 menu changes to User catalog reads (USR-16, USR-17).",
            "- Implement ADM-12 ↔ DEL assignment and DEL-15–DEL-17 status updates on shared order records.",
            "- ADM-20 audit log must include staff, menu, and order events per PDF; connect to existing audit chain in `supabase/`.",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    parsed_for_trace: list[tuple[dict, list[tuple[str, str, str]]]] = []
    for mod in MODULES:
        src = ATT / mod["src_pdf"]
        if not src.is_file():
            raise SystemExit(f"Missing attachment: {src}")
        dest_pdf = REPO / "docs" / "specs" / mod["dest_pdf"]
        shutil.copy2(src, dest_pdf)
        reader = PdfReader(str(src))
        pages_raw = [page.extract_text() or "" for page in reader.pages]
        pages_norm = [normalize_ids(t, mod["prefix"]) for t in pages_raw]
        full_norm = "\n".join(pages_norm)
        stories = extract_stories(full_norm, mod["prefix"], mod["persona_regex"])
        if len(stories) != mod["id_max"] - mod["id_min"] + 1:
            raise SystemExit(
                f"{mod['key']}: expected {mod['id_max'] - mod['id_min'] + 1} stories, got {len(stories)}"
            )
        parsed_for_trace.append((mod, stories))
        index_path = REPO / "docs" / "specs" / mod["index_file"]
        index_path.write_text(build_index(mod, stories, len(reader.pages)), encoding="utf-8")
        handoff_path = REPO / ".github" / mod["handoff_file"]
        handoff_path.write_text(build_handoff(mod, pages_norm), encoding="utf-8")
        print(f"Wrote {index_path.name}, {handoff_path.name}, {dest_pdf.name}")

    (REPO / "docs" / "specs" / "meal-service-modules.md").write_text(
        MEAL_SERVICE_MODULES, encoding="utf-8"
    )
    (REPO / "docs" / "implementation-traceability-staff.md").write_text(
        build_staff_traceability(parsed_for_trace), encoding="utf-8"
    )
    print("Wrote meal-service-modules.md and implementation-traceability-staff.md")


if __name__ == "__main__":
    main()