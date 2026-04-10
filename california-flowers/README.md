# Native California Flowers — Richmond, CA

A curated index and search tool for native California flowers suitable for Richmond, CA (USDA Zone 10a/10b, Mediterranean climate). 77 species across wildflowers, shrubs, trees, grasses, and vines.

## Quick Start

Serve locally and open in a browser:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies beyond a browser and D3 (loaded from CDN).

## Features

- **Bloom calendar** — stacked bar histogram showing how many species bloom each month, stackable by color, plant type, sun, water, or drought tolerance
- **Faceted filtering** — filter by flower color, plant type, sun requirement, water needs, drought tolerance
- **Text search** — search by common name, scientific name, or family
- **Filter chips** — see active filters at a glance, remove individually or clear all
- **Expandable cards** — click any flower card to see family, height, full bloom range, and description

## Files

```
california-flowers/
├── index.html          # markup
├── style.css           # styles
├── app.js              # filtering, search, card grid
├── calendar.js         # D3 bloom calendar
├── build_db.py         # generates SQLite DB from JSON
└── data/
    ├── flowers.json    # source dataset (77 flowers)
    └── flowers.db      # SQLite database
```

## SQLite Database

The flower data is also available as a SQLite database for querying outside the browser. Rebuild it any time from the JSON source:

```sh
python3 build_db.py
```

### Schema

```
flowers                    flower_colors             flower_bloom_months
─────────────────────      ──────────────            ───────────────────
id            INTEGER PK   flower_id  → flowers.id   flower_id  → flowers.id
common_name   TEXT         color      TEXT            month      INTEGER (1–12)
scientific_name TEXT
family        TEXT
plant_type    TEXT
height_min_in INTEGER
height_max_in INTEGER
sun           TEXT
water         TEXT
drought_tolerant INTEGER
description  TEXT
```

Colors and bloom months are in separate tables because each flower can have multiple of each.

### Tutorial: Querying with Python

SQLite ships with Python — no install needed. Run `python3` and try these:

```python
import sqlite3

db = sqlite3.connect("data/flowers.db")
db.row_factory = sqlite3.Row  # access columns by name
```

**Find all flowers blooming in March:**

```python
rows = db.execute("""
    SELECT f.common_name, f.scientific_name, f.plant_type
    FROM flowers f
    JOIN flower_bloom_months m ON f.id = m.flower_id
    WHERE m.month = 3
    ORDER BY f.common_name
""").fetchall()

for r in rows:
    print(f"{r['common_name']} ({r['scientific_name']}) — {r['plant_type']}")
```

**Drought-tolerant shrubs with their colors:**

```python
rows = db.execute("""
    SELECT f.common_name, GROUP_CONCAT(c.color, ', ') AS colors
    FROM flowers f
    JOIN flower_colors c ON f.id = c.flower_id
    WHERE f.drought_tolerant = 1 AND f.plant_type = 'shrub'
    GROUP BY f.id
    ORDER BY f.common_name
""").fetchall()

for r in rows:
    print(f"{r['common_name']}: {r['colors']}")
```

**What's blooming the longest?**

```python
rows = db.execute("""
    SELECT f.common_name, COUNT(m.month) AS months_blooming
    FROM flowers f
    JOIN flower_bloom_months m ON f.id = m.flower_id
    GROUP BY f.id
    ORDER BY months_blooming DESC
    LIMIT 10
""").fetchall()

for r in rows:
    print(f"{r['common_name']}: {r['months_blooming']} months")
```

**Which colors are available in January?**

```python
rows = db.execute("""
    SELECT c.color, COUNT(DISTINCT f.id) AS num_flowers
    FROM flowers f
    JOIN flower_bloom_months m ON f.id = m.flower_id
    JOIN flower_colors c ON f.id = c.flower_id
    WHERE m.month = 1
    GROUP BY c.color
    ORDER BY num_flowers DESC
""").fetchall()

for r in rows:
    print(f"{r['color']}: {r['num_flowers']} flowers")
```

**Shade-tolerant flowers that need little water:**

```python
rows = db.execute("""
    SELECT common_name, scientific_name, description
    FROM flowers
    WHERE sun IN ('shade', 'partial') AND water = 'low'
    ORDER BY common_name
""").fetchall()

for r in rows:
    print(f"{r['common_name']} — {r['description']}")
```

When you're done:

```python
db.close()
```

### Using the sqlite3 CLI

If you have the `sqlite3` command-line tool installed:

```sh
sqlite3 data/flowers.db

-- see all tables
.tables

-- pretty-print columns
.mode column
.headers on

-- try a query
SELECT common_name, sun, water FROM flowers WHERE drought_tolerant = 1 LIMIT 10;

-- exit
.quit
```

## Data

All 77 species are native to California and suited to Richmond's climate. Each entry includes:

| Field | Description |
|-------|-------------|
| Common name | e.g. "California Poppy" |
| Scientific name | e.g. "Eschscholzia californica" |
| Family | Botanical family |
| Bloom months | Which months the plant flowers |
| Colors | Flower/foliage color(s) |
| Plant type | annual, perennial, shrub, tree, vine, grass |
| Height | Range in inches |
| Sun | full, partial, shade |
| Water | low, moderate, high |
| Drought tolerant | yes/no |
| Description | One-line summary |
