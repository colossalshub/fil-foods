# Canonical module exports

Each `*-module.export.md` is the **verbatim** spreadsheet export for that role. The handoffs under `.github/` are generated from these files.

## Refresh

1. Update `_combined-paste.txt` with sections `user:`, `admin:`, `dietitian:`, `kitchen:`, and `delivery:`.
2. `python scripts/split_canonical_paste.py`
3. `python scripts/sync_module_handoffs_from_canonical.py`

Story indexes under `docs/specs/*-module.md` summarize scope and cross-links; the export files are the acceptance-criteria source of truth.