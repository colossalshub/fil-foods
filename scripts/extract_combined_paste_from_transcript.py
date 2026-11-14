"""Extract a chat paste with user:/admin:/… sections from the latest agent transcript JSONL."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
DEFAULT_OUT = REPO / "docs" / "specs" / "canonical" / "_combined-paste.txt"
MARKER = "these are the updated ones"


def extract_user_query_text(raw: str) -> str:
    if "<user_query>" in raw:
        raw = raw.split("<user_query>", 1)[1]
    if "</user_query>" in raw:
        raw = raw.split("</user_query>", 1)[0]
    raw = re.sub(r"<timestamp>.*?</timestamp>\s*", "", raw, count=1, flags=re.DOTALL)
    return raw.strip()


def main() -> None:
    transcript = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if transcript is None:
        raise SystemExit("Usage: python extract_combined_paste_from_transcript.py <path-to.jsonl>")
    for line in transcript.read_text(encoding="utf-8").splitlines():
        obj = json.loads(line)
        if obj.get("role") != "user":
            continue
        for part in obj.get("message", {}).get("content", []):
            if part.get("type") != "text":
                continue
            text = part.get("text", "")
            if MARKER in text and "user:\n" in text.lower():
                out_text = extract_user_query_text(text)
                DEFAULT_OUT.parent.mkdir(parents=True, exist_ok=True)
                DEFAULT_OUT.write_text(out_text + "\n", encoding="utf-8")
                print(f"Wrote {DEFAULT_OUT} ({len(out_text)} chars)")
                return
    raise SystemExit("No matching paste found in transcript")


if __name__ == "__main__":
    main()