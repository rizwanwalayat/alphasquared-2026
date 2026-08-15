#!/usr/bin/env python3
"""Export the case study records to JSON, for seeding MongoDB.

casedata.py stays the place copy is written: it is reviewable in a diff and
cannot break a deploy. This turns it into the interchange format the Node
seeder reads, so the database and the generated pages cannot drift apart.

    python exportcases.py          # writes data/case-studies.json
"""

import json
import os

import casedata

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "data", "case-studies.json")


def record(p, order):
    return {
        "slug": p["slug"],
        "name": p["name"],
        "category": p["category"],
        "tagline": p["tagline"],
        "lead": p["lead"],
        "problem": p["problem"],
        "shipped": list(p["shipped"]),
        "today": list(p["today"]),
        "chips": list(p["chips"]),
        # Tuples become [file, alt] pairs so the shape survives the round trip.
        "images": [list(img) for img in p["images"]],
        "ix": p["ix"],
        "card": p["card"],
        "title": p["title"],
        "description": p["description"],
        "hand": bool(p["hand"]),
        "flagship": p["slug"] in casedata.FLAGSHIP,
        "order": order,
        "published": True,
    }


def main():
    records = [record(p, i) for i, p in enumerate(casedata.PROJECTS)]

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(records, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print("exported %d case studies to %s" % (len(records), os.path.relpath(OUT, ROOT)))


if __name__ == "__main__":
    main()
