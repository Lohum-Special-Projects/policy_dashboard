# LLM Quick Context - Policy Dashboard

## What this project is
- Static dashboard (HTML/CSS/vanilla JS) that reads `data.json`.
- Python script `update_data.py` fetches Zoho Sheet data and rewrites `data.json`.
- GitHub Action (`.github/workflows/update.yml`) runs fetch every 30 minutes.

## Core runtime flow
1. `update_data.py`:
   - Loads `.env` (`REFRESH_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `SHEET_ID`).
   - Refreshes Zoho OAuth token.
   - Calls Zoho Sheet API with `method=worksheet.records.fetch`.
   - Normalizes records and writes `data.json` with `last_modified`.
2. `index.html` + `main.js`:
   - Loads `data.json`.
   - Renders scheme table, aggregate count, total incentive, deadline pills.
3. `scheme.html` + `scheme.js`:
   - Loads same `data.json`.
   - Picks one record by `?row=` or `?scheme=`.
   - Renders timeline, budget chart, status/tasks, ministry logo.
   - Shows `Description` below scheme title.

## Current API/data contract
- Expected top-level keys in `data.json`:
  - `method`, `records`, `records_count`, `records_start_index`, `records_end_index`, `status`, `last_modified`
- `records` is a list of objects with fields used by UI:
  - `Scheme`
  - `Description` (detail page subtitle under title)
  - `Ministry`
  - `Government Budget (INR crores)`
  - `Lohum Incentive Size (INR crores)`
  - `Commencement Date`
  - `Stage 1 Deadline`, `Stage 2 Deadline`, `Stage 3 Deadline`
  - `Timelines (by when)` (fallback final deadline)
  - `Stage 1`, `Stage 2`, `Stage 3`
  - `Status`
  - `Pending deliverables`, `Ongoing deliverables`, `Completed deliverables`
  - `row_index`, `S.No`

## `update_data.py` normalization behavior
- Accepts records from either:
  - `payload["records"]` (new shape), or
  - `payload["data"]["records"]` (legacy shape).
- Ensures each record has defaults for:
  - `Description`, `Commencement Date`, `Stage 1 Deadline`, `Stage 2 Deadline`, `Stage 3 Deadline`.
- Maps `Scheme Description` -> `Description` if needed.
- Maps `Ministry / Department` -> `Ministry` if needed.
- Normalizes ministry whitespace/casing for known names.
- If `Timelines (by when)` is empty and `Stage 3 Deadline` exists, uses Stage 3 as fallback.
- Backfills `records_count`, `records_start_index`, `records_end_index` when missing.

## Date handling in UI
- Parsers in `main.js` and `scheme.js` accept:
  - `yyyy/mm/dd`, `dd/mm/yyyy`, `dd-MMM` (and similar separators).
- If year missing, defaults to current year and rolls to next year if date already passed.
- Final deadline shown as:
  - `Stage 3 Deadline` if available, else `Timelines (by when)`.

## Ministry logo mapping
- Controlled in `scheme.js` `MINISTRY_LOGOS`.
- Logo files are in `image/`.
- If ministry value does not match mapping key exactly after normalization, logo card is hidden.

## Local run commands
- Fetch latest data:
  - `python update_data.py`
- Run site locally:
  - `py -m http.server 8000`
  - Open `http://localhost:8000/index.html`

## High-impact files (read first)
- `update_data.py` (API integration + normalization)
- `data.json` (runtime data)
- `main.js` (listing page logic)
- `scheme.js` (detail page logic)
- `scheme.html` (detail page markup)
- `styles.css` (shared styling)

