"""Copy docs/specs/canonical/*.export.md into .github handoff files with standard headers."""
from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CANONICAL = REPO / "docs" / "specs" / "canonical"
GITHUB = REPO / ".github"

MODULES = [
    ("User", "USR", 1, 50, "Meal_Service_User_Stories_AI_Agent_Handoff.md", "user-module.export.md", "docs/specs/user-module.md", "docs/specs/FIL_Foods_User_Module.pdf"),
    ("Admin", "ADM", 1, 21, "Meal_Service_Admin_Module_AI_Agent_Handoff.md", "admin-module.export.md", "docs/specs/admin-module.md", "docs/specs/FIL_Foods_Admin_Module.pdf"),
    ("Dietitian", "DIT", 1, 17, "Meal_Service_Dietitian_Module_AI_Agent_Handoff.md", "dietitian-module.export.md", "docs/specs/dietitian-module.md", "docs/specs/FIL_Foods_Dietitian_Module.pdf"),
    ("Kitchen", "KIT", 1, 15, "Meal_Service_Kitchen_Module_AI_Agent_Handoff.md", "kitchen-module.export.md", "docs/specs/kitchen-module.md", "docs/specs/FIL_Foods_Kitchen_Module.pdf"),
    ("Delivery", "DEL", 1, 17, "Meal_Service_Delivery_Module_AI_Agent_Handoff.md", "delivery-module.export.md", "docs/specs/delivery-module.md", "docs/specs/FIL_Foods_Delivery_Module.pdf"),
]


def main() -> None:
    for title, prefix, id_min, id_max, handoff_name, export_name, index_rel, pdf_rel in MODULES:
        export_path = CANONICAL / export_name
        if not export_path.is_file():
            raise SystemExit(f"Missing {export_path}")
        body = export_path.read_text(encoding="utf-8")
        header = f"""# {title} Module Requirements - {prefix}-{id_min:02d} through {prefix}-{id_max:02d}

**Source:** Updated spreadsheet export (Nov 2026). Canonical text: [`docs/specs/canonical/{export_name}`](../docs/specs/canonical/{export_name}). PDF (may lag): [`{pdf_rel}`](../{pdf_rel}). Story index: [`{index_rel}`](../{index_rel}). Cross-module: [`docs/specs/meal-service-modules.md`](../docs/specs/meal-service-modules.md).
**Authority:** Requirements and acceptance criteria below must be followed as written; record cross-module conflicts instead of inventing staff behavior.

## Implementation instructions

- Preserve every story ID, scenario, validation message, acceptance criterion, and cross-reference.
- Map each criterion to code and tests in the appropriate traceability doc before marking complete.
- Spreadsheet Passed / Failed / Total rows are QA status only, not product features.

## Canonical specification (verbatim export)

"""
        out = GITHUB / handoff_name
        out.write_text(header + body.strip() + "\n", encoding="utf-8")
        print(f"Wrote {out.relative_to(REPO)}")


if __name__ == "__main__":
    main()