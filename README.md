# Policy Dashboard

## Overview

This is a lightweight, static dashboard that visualizes policy schemes from a `data.json` file.It has:

- A main page showing all schemes with budgets, Lohum applied, and deadline status.
- A scheme detail page with a budget split chart, progress, status, and task board.

## Data source

The data comes from a Zoho Sheet [Link](https://sheet.zoho.in/sheet/open/mnji97f16a5567fdd40498fb9e5013934fcab).
`update_data.py` fetches the sheet data via Zoho OAuth, then writes it to `data.json`.

Required environment variables (stored as GitHub Secrets or in `.env` locally):

- `REFRESH_TOKEN`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `SHEET_ID`

## How to deploy

### Local

Run a local server (required because browsers block `fetch` on `file://`):

```powershell
py -m http.server 8000
```

Then open: `http://localhost:8000/index.html`

### GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages** and deploy from the default branch root.
3. Add GitHub Actions secrets:
   - `REFRESH_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `SHEET_ID`
4. The workflow in `.github/workflows/update.yml` updates `data.json` hourly.

## Fix to common bugs

- **“Unable to load data.json” on local files**Use a local server (`py -m http.server 8000`) instead of opening `file://`.
- **Workflow runs but data.json doesn’t change**Ensure secrets are set and the workflow has **Read and write permissions**.
- **Dates show as “Unknown”**Make sure `Timelines (by when)` is in `dd/mm/yyyy` or `dd-MMM` format.
- **Days left seems off**
  If `Days left` is blank, it is calculated from the deadline date.
