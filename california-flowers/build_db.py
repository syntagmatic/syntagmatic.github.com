#!/usr/bin/env python3
"""Build flowers.db from data/flowers.json."""

import json
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "flowers.db"
JSON_PATH = Path(__file__).parent / "data" / "flowers.json"

def main():
    with open(JSON_PATH) as f:
        flowers = json.load(f)

    db = sqlite3.connect(DB_PATH)
    db.execute("DROP TABLE IF EXISTS flowers")
    db.execute("DROP TABLE IF EXISTS flower_colors")
    db.execute("DROP TABLE IF EXISTS flower_bloom_months")

    db.execute("""
        CREATE TABLE flowers (
            id          INTEGER PRIMARY KEY,
            common_name TEXT NOT NULL,
            scientific_name TEXT NOT NULL,
            family      TEXT NOT NULL,
            plant_type  TEXT NOT NULL,
            height_min_in INTEGER,
            height_max_in INTEGER,
            sun         TEXT NOT NULL,
            water       TEXT NOT NULL,
            drought_tolerant INTEGER NOT NULL,
            description TEXT
        )
    """)

    db.execute("""
        CREATE TABLE flower_colors (
            flower_id INTEGER NOT NULL REFERENCES flowers(id),
            color     TEXT NOT NULL,
            PRIMARY KEY (flower_id, color)
        )
    """)

    db.execute("""
        CREATE TABLE flower_bloom_months (
            flower_id INTEGER NOT NULL REFERENCES flowers(id),
            month     INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
            PRIMARY KEY (flower_id, month)
        )
    """)

    for i, fl in enumerate(flowers, 1):
        db.execute(
            "INSERT INTO flowers VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (i, fl["commonName"], fl["scientificName"], fl["family"],
             fl["plantType"], fl["heightIn"][0], fl["heightIn"][1],
             fl["sun"], fl["water"], int(fl["droughtTolerant"]),
             fl["description"])
        )
        for color in fl["colors"]:
            db.execute("INSERT INTO flower_colors VALUES (?,?)", (i, color))
        for month in fl["bloomMonths"]:
            db.execute("INSERT INTO flower_bloom_months VALUES (?,?)", (i, month))

    db.commit()
    print(f"Created {DB_PATH} — {len(flowers)} flowers")

    # Quick sanity check
    count = db.execute("SELECT COUNT(*) FROM flowers").fetchone()[0]
    colors = db.execute("SELECT COUNT(*) FROM flower_colors").fetchone()[0]
    months = db.execute("SELECT COUNT(*) FROM flower_bloom_months").fetchone()[0]
    print(f"  {count} flowers, {colors} color entries, {months} bloom-month entries")
    db.close()

if __name__ == "__main__":
    main()
