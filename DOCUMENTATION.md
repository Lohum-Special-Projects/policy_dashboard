# Technical Documentation: Policy Dashboard

## 1. Detailed architecture breakdown

### 1.1 Runtime components

- Static UI
  - `index.html`: scheme list page shell
  - `scheme.html`: scheme detail page shell
  - `styles.css`: shared design tokens and responsive styling
  - `main.js`: list-page rendering logic
  - `scheme.js`: detail-page rendering logic
- Data layer
  - `data.json`: runtime dataset consumed by UI
- Data ingestion utility
  - `update_data.py`: fetch and normalize data from Zoho APIs
- Automation
  - `.github/workflows/update.yml`: scheduled updater execution and commit

### 1.2 System interaction flow

1. Scheduled workflow runs `update_data.py`.
2. Script authenticates to Zoho and fetches worksheet data.
3. Script normalizes output and overwrites `data.json`.
4. Workflow commits/pushes updated `data.json`.
5. GitHub Pages serves static files.
6. Browser pages fetch `data.json` and render views.

## 2. Folder structure (deep explanation)

```text
.
|-- .github/
|   `-- workflows/
|       `-- update.yml
|-- image/
|   |-- Department of Science and Technology.svg
|   |-- Gujarat Government.svg
|   |-- Ministry of Electronics and IT.svg
|   |-- Ministry of Heavy Industries.svg
|   |-- Ministry of Mines.svg
|   |-- Telangana Government.png
|   |-- UP Government.svg
|   `-- lohum_logo.svg
|-- .gitignore
|-- data.json
|-- index.html
|-- main.js
|-- README.md
|-- scheme.html
|-- scheme.js
|-- styles.css
`-- update_data.py
```

Directory/file roles:
- `.github/workflows/update.yml`: CI scheduler and updater execution.
- `image/`: static assets referenced by UI, including ministry logos used by mapping in `scheme.js`.
- `data.json`: single runtime data source for both pages.
- `update_data.py`: only code path that writes `data.json`.
- `main.js` and `scheme.js`: independent page scripts with some duplicated helper logic.

## 3. API routes documentation

## 3.1 Internal application routes (static pages)

- `/index.html`
  - Purpose: list all schemes and summary metrics.
- `/scheme.html?row=<id>`
  - Purpose: view details for one scheme by `row_index`/`S.No`.
- `/scheme.html?scheme=<exact_name>`
  - Purpose: alternate record selection by exact scheme name string.
  - Matching behavior: exact, case-sensitive string comparison (current behavior).

## 3.2 Static data endpoint

- `/data.json`
  - Consumer: both `main.js` and `scheme.js`
  - Expected top-level keys:
    - `records` (array)
    - `last_modified` (ISO timestamp)
    - plus metadata fields (`method`, `status`, `records_count`, indexes)

## 3.3 External API calls (updater only)

- `POST https://accounts.zoho.in/oauth/v2/token`
  - Grant type: refresh token
  - Inputs: `client_id`, `client_secret`, `refresh_token`
- `POST https://sheet.zoho.in/api/v2/{SHEET_ID}`
  - Method payload: `worksheet.records.fetch`
  - Worksheet name: `dashboard`

## 3.4 Zoho worksheet schema contract

Updater request parameters (from `update_data.py`):
- `method=worksheet.records.fetch`
- `worksheet_name=dashboard`
- `header_row=1`
- `render_option=formatted`
- `records_start_index=1`
- `is_case_sensitive=true`

Accepted Zoho response record locations:
- `payload.records`
- `payload.data.records` (legacy-compatible path)

Updater output contract in `data.json`:
- Top-level fields:
  - `method`
  - `records`
  - `records_count`
  - `records_start_index`
  - `records_end_index`
  - `status`
  - `last_modified`
- Record-level fields consumed by frontend:
  - `Scheme`
  - `Description`
  - `Ministry`
  - `Government Budget (INR crores)`
  - `Lohum Incentive Size (INR crores)`
  - `Commencement Date`
  - `Stage 1`
  - `Stage 2`
  - `Stage 3`
  - `Stage 1 Deadline`
  - `Stage 2 Deadline`
  - `Stage 3 Deadline`
  - `Timelines (by when)` (final-deadline fallback)
  - `Status`
  - `Pending deliverables`
  - `Ongoing deliverables`
  - `Completed deliverables`
  - `row_index` or `S.No` (detail-page lookup)

Normalization and compatibility rules:
- `Ministry / Department` maps to `Ministry` when `Ministry` is missing.
- `Scheme Description` maps to `Description` when `Description` is missing.
- Defaults inserted when missing:
  - `Description`
  - `Commencement Date`
  - `Stage 1 Deadline`
  - `Stage 2 Deadline`
  - `Stage 3 Deadline`
- If `Timelines (by when)` is missing and `Stage 3 Deadline` exists, `Timelines (by when)` is filled from `Stage 3 Deadline`.

## 4. State management approach

There is no framework-level state manager (no Redux/Vuex/etc.).

State is handled via:
- In-memory variables inside each page script.
- One-time fetch of `data.json`.
- Pure/helper functions for parsing and rendering.
- Direct DOM updates through `textContent`, element creation, and class assignment.

`main.js` state behavior:
- Reads all records and renders list entries.
- Derives aggregate totals and deadline status classes.
- Manages per-row expand/collapse state in DOM (`hidden`, `aria-expanded`).

`scheme.js` state behavior:
- Determines selected record from URL params.
- Calculates milestone progress and deadline stats.
- Draws budget chart with Canvas API.
- Renders task/status lists from newline-separated fields.

## 5. Authentication flow

### 5.1 End-user authentication

- None implemented in frontend.

### 5.2 Service authentication (data updater)

1. `update_data.py` loads credentials from environment.
2. Calls Zoho OAuth token endpoint with refresh token.
3. Uses returned access token as `Authorization: Zoho-oauthtoken <token>`.
4. Calls Zoho Sheet API for worksheet records.

Failure mode:
- Missing env vars or non-success API responses raise exceptions and stop script execution.

## 6. Database models (if applicable)

No database is present in this repository.

Data model is JSON-based (`data.json`), with `records` as denormalized objects.

Record fields observed in current dataset:
- `S.No`, `row_index`
- `Scheme`, `Description`, `Ministry`
- `Government Budget (INR crores)`, `Lohum Incentive Size (INR crores)`
- `Commencement Date`
- `Stage 1`, `Stage 2`, `Stage 3`
- `Stage 1 Deadline`, `Stage 2 Deadline`, `Stage 3 Deadline`
- `Timelines (by when)`, `Days left`, `Progress`
- `Status`
- `Pending deliverables`, `Ongoing deliverables`, `Completed deliverables`

## 7. Error handling conventions

Frontend:
- Fetch failures are caught and logged to browser console.
- UI falls back to user-visible safe text such as:
  - `Unable to load data.json. Check that the file is available.`
  - `Scheme not found`
  - `Unknown` for unparseable date values
- Empty lists render placeholder item `None`.

Updater (`update_data.py`):
- Missing required environment variables: explicit `RuntimeError`.
- HTTP failures: `response.raise_for_status()`.
- Non-success Zoho payload status: explicit `RuntimeError`.
- Unexpected records payload type: explicit `RuntimeError`.

## 8. Coding standards used in the project

Observed conventions from repository code:

- JavaScript
  - `const`/`let` usage and small single-purpose helper functions.
  - CamelCase for functions/variables.
  - DOM IDs/classes are descriptive and aligned with markup semantics.
  - Minimal abstraction; logic is page-local and imperative.

- Python
  - Type hints on function signatures.
  - Top-level constants for known ministry values.
  - Explicit helper functions for env validation, API calls, and normalization.
  - Single `main()` orchestration entry point.

- CSS
  - CSS custom properties (`:root`) for colors, spacing, and effects.
  - Responsive behavior via media queries.
  - Component-style class organization.

## 9. Known caveats and edge cases

- Detail page logo visibility depends on exact ministry mapping key match.
- Yearless deadlines are inferred relative to current date, which can shift interpretation over time.
- Duplicate parsing helpers across JS files can diverge if changed in only one place.
- `Progress` and `Days left` fields exist in data but are not currently used for rendering logic.

## 10. Schema migration policy

Policy for Zoho schema changes:
- If a column name changes in Zoho Sheet:
  - Update mappings/field handling in `update_data.py`.
  - Ensure normalized output remains correct in `data.json`.
- If a new field is added and must be visible in UI:
  - Update frontend markup (`index.html` and/or `scheme.html`).
  - Update frontend logic (`main.js` and/or `scheme.js`).
  - Update styles in `styles.css` as needed.

## 11. Non-functional requirements status

- No explicit performance budgets are currently defined.
- No explicit accessibility targets are currently defined.
