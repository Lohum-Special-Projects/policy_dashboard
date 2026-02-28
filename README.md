# Policy Dashboard

## Project overview

Policy Dashboard is a static website that displays government scheme tracking data from `data.json`.

The repository contains:
- A listing page (`index.html` + `main.js`) that shows all schemes, budgets, and deadline status.
- A detail page (`scheme.html` + `scheme.js`) for one selected scheme with timeline, tasks, status, and budget split visualization.
- A Python updater (`update_data.py`) that fetches Zoho Sheet data and rewrites `data.json`.
- A GitHub Actions workflow (`.github/workflows/update.yml`) that runs the updater every 30 minutes and commits `data.json`.

## Tech stack

- Frontend: HTML5, CSS3, vanilla JavaScript (no framework)
- Data file format: JSON (`data.json`)
- Data updater: Python 3.11 (`requests`, `python-dotenv`, plus stdlib)
- Automation/CI: GitHub Actions
- Hosting: GitHub Pages (static hosting)

## Production URL

- GitHub Pages: `https://lohum-special-projects.github.io/policy_dashboard/`

## Architecture summary

1. `update_data.py` authenticates with Zoho via OAuth refresh token flow.
2. It fetches worksheet records (`worksheet_name=dashboard`) from Zoho Sheet.
3. It normalizes records for frontend compatibility and writes `data.json`.
4. GitHub Action commits the updated `data.json` to the repository.
5. GitHub Pages serves static files; frontend fetches `data.json` client-side.

## Setup instructions

### Prerequisites

- Python 3.11 (workflow target; local execution should use a compatible Python)
- Git

### Local setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```
2. Create local environment variables (for updater script) in `.env`.
3. Run data update manually:
```bash
python update_data.py
```
4. Start static server from repository root:
```bash
py -m http.server 8000
```
5. Open:
```text
http://localhost:8000/index.html
```

Notes:
- Do not open files via `file://`; `fetch("data.json")` requires HTTP.
- `scheme.html` reads query params `row` or `scheme` to choose a record.

## Environment variables

Used by `update_data.py`:

- `REFRESH_TOKEN`: Zoho OAuth refresh token
- `CLIENT_ID`: Zoho OAuth client ID
- `CLIENT_SECRET`: Zoho OAuth client secret
- `SHEET_ID`: Zoho Sheet ID used in `https://sheet.zoho.in/api/v2/{SHEET_ID}`

Source locations:
- Local: `.env` (loaded by `python-dotenv`)
- CI/CD: GitHub repository secrets

## Available scripts and commands

- `python update_data.py`: fetches and normalizes Zoho records into `data.json`
- `py -m http.server 8000`: serves static site locally
- GitHub Actions workflow: `.github/workflows/update.yml`
  - Scheduled cron: `*/30 * * * *`
  - Manual trigger: `workflow_dispatch`

## Folder structure

```text
.
|-- .github/
|   `-- workflows/
|       `-- update.yml         # Scheduled data refresh + commit job
|-- image/                     # Ministry and brand logos used by scheme page
|-- index.html                 # Dashboard listing entry page
|-- main.js                    # Dashboard listing logic
|-- scheme.html                # Scheme detail page
|-- scheme.js                  # Scheme detail logic
|-- styles.css                 # Shared styling
|-- update_data.py             # Zoho data fetch + normalization
|-- data.json                  # Runtime dataset consumed by frontend
|-- DEPLOYMENT.md
|-- DOCUMENTATION.md
|-- KNOWLEDGE_TRANSFER.md
|-- README.md
`-- LLM.md
```

## API overview

There is no internal backend API in this repository. Runtime API interactions are:

- Browser -> static asset fetch:
  - `GET /data.json` from `index.html` and `scheme.html`
- Updater -> Zoho OAuth API:
  - `POST https://accounts.zoho.in/oauth/v2/token`
- Updater -> Zoho Sheet API:
  - `POST https://sheet.zoho.in/api/v2/{SHEET_ID}`
  - Request payload includes `method=worksheet.records.fetch`

## Development workflow

1. Update frontend files (`index.html`, `scheme.html`, `main.js`, `scheme.js`, `styles.css`).
2. If data schema assumptions change, update `update_data.py` normalization logic.
3. Run `python update_data.py` locally with valid env vars.
4. Serve site with `py -m http.server 8000` and verify both pages.
5. Commit and push changes.
6. Let scheduled/manual GitHub Action refresh `data.json` in repository.

## Known caveats

- Date parsing logic accepts several formats, but invalid or unknown values render as `Unknown`.
- Ministry logo display depends on exact normalized ministry names mapped in `scheme.js`.
- There is duplicated date/list parsing logic in `main.js` and `scheme.js`.

## Current release policy

- Production publishing branch/environment: `main`.
- Data updates branch protection policy: no formal policy has been defined.
- Auto-generated `data.json` commits: no required review/approval policy.
