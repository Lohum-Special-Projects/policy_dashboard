# LLM Context: Policy Dashboard

## High-level architecture

This repo is a static dashboard plus a Python data-refresh utility.

- Frontend runtime:
  - `index.html` + `main.js` render a table of schemes from `data.json`.
  - `scheme.html` + `scheme.js` render details for one scheme.
- Data pipeline:
  - `update_data.py` fetches Zoho Sheet records using OAuth refresh-token flow.
  - The script normalizes record shape and writes `data.json`.
- Automation:
  - `.github/workflows/update.yml` runs `update_data.py` every 30 minutes and commits `data.json`.

No application server exists in this repository.

## Entry points

- User-facing:
  - `index.html`
  - `scheme.html`
- Data update:
  - `python update_data.py`
- CI scheduler:
  - `.github/workflows/update.yml` (`cron: */30 * * * *`)

## Deployment and environment facts

- Production URL: `https://lohum-special-projects.github.io/policy_dashboard/`
- Production publishing branch: `main`
- Branch protection for auto-commit flow: no protection rules are currently in place.

## Core modules and responsibilities

- `update_data.py`
  - Loads env vars (`REFRESH_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `SHEET_ID`)
  - Gets Zoho access token
  - Fetches worksheet records (`worksheet_name=dashboard`)
  - Normalizes records and metadata
  - Writes `data.json` with UTC `last_modified`

- `main.js`
  - Fetches `data.json`
  - Parses amounts and deadlines
  - Computes next/final deadline pills
  - Computes aggregate metrics (scheme count, total incentive)
  - Renders expandable per-row pending/status details

- `scheme.js`
  - Fetches `data.json` with cache-busting query param
  - Selects a record by `row` or `scheme` URL param
  - Renders timeline dates, stage pills, status/task lists
  - Draws budget pie chart on `<canvas>`
  - Computes days-left indicators
  - Displays ministry logo based on lookup table

- `styles.css`
  - Shared design tokens, layout, component styles, responsive behavior

## Data flow

1. GitHub Action (or manual local run) executes `update_data.py`.
2. Script calls Zoho OAuth endpoint to exchange refresh token for access token.
3. Script calls Zoho Sheet API for worksheet records.
4. Script normalizes payload and writes repository `data.json`.
5. Static pages fetch `data.json` at runtime in browser.
6. DOM updates render metrics and scheme details.

## Key dependencies

- Python:
  - `requests`
  - `python-dotenv`
  - stdlib: `json`, `os`, `datetime`
- Frontend:
  - Native browser APIs (`fetch`, `URLSearchParams`, Canvas 2D API, `Intl.NumberFormat`)
- Platform:
  - GitHub Actions
  - GitHub Pages
  - Zoho OAuth + Zoho Sheet APIs

## Data contract used by frontend

Top-level keys expected by UI:
- `records` (array)
- `last_modified` (for dashboard display)

Updater also maintains:
- `method`
- `status`
- `records_count`
- `records_start_index`
- `records_end_index`

Record keys read by UI:
- `Scheme`
- `Description`
- `Ministry`
- `Government Budget (INR crores)`
- `Lohum Incentive Size (INR crores)`
- `Commencement Date`
- `Stage 1 Deadline`
- `Stage 2 Deadline`
- `Stage 3 Deadline`
- `Timelines (by when)` (fallback)
- `Stage 1`
- `Stage 2`
- `Stage 3`
- `Status`
- `Pending deliverables`
- `Ongoing deliverables`
- `Completed deliverables`
- `row_index`
- `S.No`

## Important patterns used

- Backward-compatible payload normalization in updater:
  - Supports both `payload.records` and `payload.data.records`.
  - Maps legacy keys (`Scheme Description`, `Ministry / Department`).
  - Ensures expected fields exist with empty-string defaults.

- Defensive parsing in UI:
  - Money values stripped of non-numeric characters.
  - Date parser supports multiple date formats and missing-year inputs.
  - Empty list-like fields render as `None`.

- Deadline semantics:
  - List page uses upcoming milestones from Stage 1/2/3.
  - Detail page "final deadline" = `Stage 3 Deadline` else `Timelines (by when)`.

## Known caveats

- Utility logic for date/list parsing is duplicated between `main.js` and `scheme.js`.
- Ministry logo appears only when ministry string matches `MINISTRY_LOGOS` key after basic whitespace normalization.
- Yearless dates are interpreted relative to the current year and may roll to next year if date already passed.
- Error handling is user-visible fallback text + console logging; no telemetry or alerting is implemented in code.

## Data freshness operational note

- There is a target expectation for freshness beyond just the cron schedule.
- The repository does not define a numeric SLO threshold.
- Operational signal in use: `last_modified` timestamp in `data.json`.
- If `last_modified` appears too old, policy team escalates to developer for triage (Zoho schema change, GitHub downtime, or code issue).
