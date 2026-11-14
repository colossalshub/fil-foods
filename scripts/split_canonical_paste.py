"""Split docs/specs/canonical/_combined-paste.txt into *-module.export.md files."""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PASTE = REPO / "docs" / "specs" / "canonical" / "_combined-paste.txt"
CANONICAL = REPO / "docs" / "specs" / "canonical"

MARKERS = [
    ("user-module.export.md", r"(?i)^user:\s*\n"),
    ("admin-module.export.md", r"(?i)^admin:\s*\n"),
    ("dietitian-module.export.md", r"(?i)^dietitian:\s*\n"),
    ("kitchen-module.export.md", r"(?i)^kitchen:\s*\n"),
    ("delivery-module.export.md", r"(?i)^delivery:\s*\n"),
]


def main() -> None:
    CANONICAL.mkdir(parents=True, exist_ok=True)
    if not PASTE.is_file():
        raise SystemExit(f"Missing {PASTE}")

    text = PASTE.read_text(encoding="utf-8")
    positions: list[tuple[int, str]] = []
    for filename, pattern in MARKERS:
        m = re.search(pattern, text, re.MULTILINE)
        if not m:
            raise SystemExit(f"Marker not found for {filename}: {pattern}")
        positions.append((m.start(), filename))

    positions.sort(key=lambda x: x[0])
    for i, (start, filename) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        body = text[start:end]
        body = re.sub(
            r"(?i)^(user|admin|dietitian|kitchen|delivery):\s*\n",
            "",
            body,
            count=1,
        )
        (CANONICAL / filename).write_text(body.strip() + "\n", encoding="utf-8")
        print(f"Wrote {filename} ({len(body)} chars)")


if __name__ == "__main__":
    main()