#!/usr/bin/env python3
"""
EgyBI — "Planner's note": a short, plain-language reading of each district's
computed street metrics, written by Claude from the numbers.

WHY THIS IS NOT A GIMMICK, AND HOW IT IS KEPT HONEST.
Nothing is trained, inferred or predicted here. The pipeline has already
measured everything; this step only turns a row of numbers into a paragraph a
non-planner can read. Three rules make that defensible:

  1. The model sees ONLY the computed metrics for one district at a time. It is
     given no outside knowledge to lean on and is told explicitly not to invent
     history, population, policy or anything else it cannot derive from those
     numbers.
  2. Every figure it is given is displayed on the page beside the note, so a
     reader can check any claim against the measurement it came from.
  3. The panel is labelled AI-generated in the interface, and the page says in
     plain words that it is a reading of metrics rather than professional
     planning advice.

If ANTHROPIC_API_KEY is absent the script exits cleanly WITHOUT writing a file.
That is deliberate: the page already degrades to "notes have not been generated
for this build", which is a far better outcome than shipping a stale or
half-written set. No key, no notes, no pretending.

Stdlib only — no SDK dependency for one HTTP call.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "site" / "data"
CARD = DATA / "streets-districts.json"
OUT = DATA / "streets-notes.json"

API = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-5"
MAX_TOKENS = 400

SYSTEM = (
    "You are an urban planner writing one short paragraph about a city district for a "
    "general audience, working ONLY from street-network measurements you are given.\n\n"
    "Hard rules:\n"
    "- Use only the numbers provided. Do not introduce population figures, history, "
    "policy, property prices, named streets or any other fact you were not given.\n"
    "- Refer to at least two of the specific numbers, so a reader can check you against them.\n"
    "- Describe the trade-offs neutrally. A low-connectivity district is quieter on its own "
    "streets and harder to walk across; say both rather than scoring it.\n"
    "- Never recommend policy, investment or where anyone should live.\n"
    "- Write 60-90 words in flowing prose. No bullet points, no headings, no preamble."
)


def prompt_for(d: dict) -> str:
    return (
        f"District: {d['name']} ({d['era']}), {d['area_km2']} km².\n"
        f"Intersection density: {d['intersection_density_km2']} per km².\n"
        f"Dead-end share: {d['dead_end_share_pct']}% of nodes.\n"
        f"Street density: {d['street_density_km_km2']} km per km².\n"
        f"Mean segment between junctions: {d['mean_street_length_m']} m.\n"
        f"Streets per junction: {d['streets_per_node_avg']}.\n"
        f"Circuity: {d['circuity_avg']} (1.0 = straight-line travel).\n"
        f"Orientation entropy: {d['orientation_entropy']} "
        f"(≈1.39 is a perfect grid, ≈3.58 is fully disordered).\n\n"
        "Write the paragraph."
    )


def call(key: str, text: str) -> str | None:
    body = json.dumps({
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": text}],
    }).encode()
    req = urllib.request.Request(API, data=body, headers={
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
    })
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            payload = json.load(r)
    except urllib.error.HTTPError as e:
        print(f"    HTTP {e.code}: {e.read()[:200]!r}")
        return None
    except Exception as e:  # noqa: BLE001
        print(f"    request failed: {type(e).__name__}: {e}")
        return None
    parts = [b.get("text", "") for b in payload.get("content", []) if b.get("type") == "text"]
    out = " ".join(parts).strip()
    return out or None


def main() -> None:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        print("ANTHROPIC_API_KEY is not set — skipping planner's notes.")
        print("The page already handles this: it says notes were not generated for this build.")
        return

    if not CARD.is_file():
        sys.exit(f"{CARD.name} does not exist — run fetch_streets.py first.")
    card = json.loads(CARD.read_text(encoding="utf-8"))
    districts = card.get("districts", [])
    if not districts:
        sys.exit("No districts in the report card — nothing to write notes about.")

    notes, failed = {}, []
    for d in districts:
        print(f"  {d['name']}…")
        text = call(key, prompt_for(d))
        if text:
            notes[d["key"]] = text
            print(f"    {len(text.split())} words")
        else:
            failed.append(d["name"])

    if not notes:
        sys.exit(f"No notes generated (all {len(districts)} districts failed) — keeping last-good file.")

    OUT.write_text(json.dumps({
        "as_of": date.today().isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "model": MODEL,
        "disclosure": ("Each note was written by a language model from that district's computed "
                       "street metrics and nothing else. The metrics are shown beside every note "
                       "so any claim can be checked. This is a reading of measurements, not "
                       "professional planning advice."),
        "source_build": card.get("as_of"),
        "districts": notes,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\nWrote {OUT.name} — {len(notes)} note(s)"
          + (f", {len(failed)} failed: {', '.join(failed)}" if failed else ""))


if __name__ == "__main__":
    main()
