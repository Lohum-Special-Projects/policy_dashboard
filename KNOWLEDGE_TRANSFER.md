# Knowledge Transfer: Policy Dashboard

## System context

This project is a static policy-tracking dashboard. All runtime data comes from `data.json`, which is periodically regenerated from a Zoho Sheet by `update_data.py` and committed by GitHub Actions.

## Architectural decisions and rationale

1. Static frontend with JSON data file
- Decision: Keep UI as static assets (`index.html`, `scheme.html`, `main.js`, `scheme.js`, `styles.css`) and fetch `data.json` at runtime.
- Rationale: Compatible with GitHub Pages, no backend infrastructure required.

2. Scheduled data refresh through repository commits
- Decision: Use `.github/workflows/update.yml` to run updater every 30 minutes and commit only `data.json`.
- Rationale: Keeps hosting simple while still delivering periodic data updates.

3. Updater-side normalization for schema stability
- Decision: `update_data.py` maps legacy fields and fills defaults before writing output.
- Rationale: Frontend can rely on a more stable contract despite source sheet variations.

4. Client-side rendering with no framework
- Decision: Vanilla JS handles parsing, computations, and DOM rendering.
- Rationale: Minimal dependencies and straightforward static deployment.

## Business logic explanation

1. Data ingestion
- Refresh Zoho access token from stored refresh token.
- Fetch worksheet records for worksheet `dashboard`.
- Normalize records:
  - `Ministry / Department` -> `Ministry` (if needed)
  - `Scheme Description` -> `Description` (if needed)
  - Guarantee presence of key date/description fields
  - If `Timelines (by when)` is missing, fall back to `Stage 3 Deadline`

2. Dashboard page (`main.js`)
- Renders each scheme row with:
  - Scheme link to detail page (`scheme.html?row=...`)
  - Government and Lohum budget values
  - Next deadline (nearest future among Stage 1/2/3 deadlines)
  - Final deadline (`Stage 3 Deadline` else `Timelines (by when)`)
- Computes:
  - Total number of schemes
  - Total Lohum incentive sum across records
- Provides expandable panel for pending deliverables and pending-status lines.

3. Scheme detail page (`scheme.js`)
- Selects a record by URL params:
  - `row` (from `row_index` or `S.No`)
  - `scheme` (exact scheme name)
  - fallback: first record
- Renders:
  - Description
  - Timeline milestone dates
  - Status list and task columns (pending/ongoing/completed)
  - Budget split donut chart
  - Final deadline days-left indicator
  - Ministry logo when mapping exists

4. Deadline and status semantics
- Deadline visual class thresholds:
  - `< 0 days`: urgent (overdue)
  - `< 7 days`: urgent
  - `< 15 days`: soon
  - `< 30 days`: mid
  - otherwise: safe
- Missing/unparseable dates render as `Unknown`.

## Known technical debt

1. Parsing logic duplication
- Date parsing and list parsing are duplicated in `main.js` and `scheme.js`.

2. No automated tests in repository
- No test suite exists for updater normalization, date parsing, or rendering behavior.

3. Weak schema validation
- Updater normalizes opportunistically but does not enforce strict schema validation or type checks beyond basic list/dict checks.

4. Operational observability gap
- No structured telemetry or alerting logic is defined in code; failures are visible via GitHub Action logs and browser console only.

5. UI text quality issue
- `scheme.html` label currently contains typo: `Days left to final deadine`.

## Risk areas

1. Zoho credentials/token lifecycle
- Expired or revoked refresh token breaks updates until secrets are fixed.

2. Upstream API payload changes
- If Zoho API response shape changes beyond current compatibility handling, update job can fail or produce malformed `data.json`.

3. Date format variance
- Unexpected date formats degrade deadline computation to `Unknown`.

4. Data freshness dependency on CI schedule
- Since hosting is static, stale `data.json` persists until next successful workflow run and commit.

5. Ministry logo mapping brittleness
- New ministry names without matching map keys silently hide logo card.

## External service dependencies

- Zoho OAuth API: token refresh endpoint
- Zoho Sheet API: worksheet records fetch endpoint
- GitHub Actions: scheduler and runner
- GitHub Pages: static site hosting

## Operational knowledge not obvious from code

1. Workflow permissions are required
- Workflow sets `permissions.contents: write`; without this, auto-commit of `data.json` fails.

2. Cache behavior differs by page
- `main.js` fetches `data.json` with `{ cache: "no-store" }`.
- `scheme.js` also adds a timestamp query param to force fresh reads.

3. Record identity strategy
- Detail links pass `row` query param from `row_index` or fallback `S.No`.
- If IDs are unstable in source data, deep links can resolve to wrong record.

4. Local viewing requires HTTP server
- Opening HTML directly from filesystem causes fetch restrictions in browser.

## Incident response and ownership

1. Repeated workflow failure response path
- If `last_modified` is too old, the policy team initiates escalation.
- Assigned developer checks:
  - Zoho Sheet column changes
  - GitHub Actions/GitHub platform downtime
  - Regressions in repository code
- Developer applies the fix and restores scheduled updates.

2. Zoho schema-change approval owner
- Approval owner: Policy team.
- Named owner provided: Pranati Cheshta Kohli.

3. Scheme query matching behavior
- Keep current behavior: exact string matching for `scheme` query parameter.

4. Retention/compliance requirement for historic `data.json`
- No special compliance or retention requirement is currently defined.
