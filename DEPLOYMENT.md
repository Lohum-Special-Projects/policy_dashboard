# Deployment Guide: Policy Dashboard

## Hosting environment

- Static hosting target: GitHub Pages
- Data refresh runtime: GitHub Actions (`ubuntu-latest`, Python 3.11)
- Artifacts served: repository static files (`*.html`, `*.js`, `*.css`, `data.json`, `image/*`)
- Production publishing branch/environment: `main`
- Production URL: `https://lohum-special-projects.github.io/policy_dashboard/`

## Build process

There is no frontend build step in this repository.

Deployment model:
1. Static files are committed directly.
2. GitHub Pages serves repository content.
3. `data.json` is periodically regenerated and committed by workflow.

Updater runtime process:
1. Install Python dependencies via `pip install -r requirements.txt`.
2. Run `python update_data.py`.
3. Commit changed `data.json` (if diff exists).

## Required environment variables

Required by `update_data.py`:

- `REFRESH_TOKEN`
- `CLIENT_ID`
- `CLIENT_SECRET`
- `SHEET_ID`

Where they are expected:
- GitHub Actions: repository secrets
- Local runs: `.env` file read by `python-dotenv`

If any variable is missing, `update_data.py` raises `RuntimeError` and exits.

## CI/CD process

Defined in `.github/workflows/update.yml`:

1. Trigger
- Scheduled cron: every 30 minutes (`*/30 * * * *`)
- Manual trigger: `workflow_dispatch`

2. Job steps
- `actions/checkout@v4`
- `actions/setup-python@v4` (`python-version: 3.11`)
- `pip install -r requirements.txt`
- `python update_data.py` with injected secrets
- `git add data.json`
- `git commit -m "Auto update data" || exit 0`
- `git push`

3. Permissions
- Workflow declares `permissions: contents: write`.

## Secrets handling

- Secrets are not hardcoded in repository source.
- CI accesses secrets through GitHub Actions `${{ secrets.* }}` context.
- Local development uses `.env` (ignored by `.gitignore`).
- Output file `data.json` does not include credentials; it contains fetched dataset and metadata.

## Rollback strategy

There is no formally approved rollback owner or response-time target documented.

Practical rollback options in current setup:
1. Revert problematic commit(s) affecting static assets and/or `data.json`.
2. Re-run workflow manually after correcting secrets or updater logic.
3. Temporarily disable scheduled workflow to stop repeated bad commits (manual repository action).

## Monitoring and logging approach

Current observable signals from repository code/config:

- GitHub Actions run logs for `update_data.py` execution and git push results.
- Updater console output: `Wrote {records_count} records to data.json`.
- Browser console logs for frontend fetch/render errors.
- Frontend fallback UI messages for load failures.
- Failure notification channel: GitHub email notifications to developers.

No dedicated metrics backend, uptime checks, or alerting integration is defined in this repo.

## Release governance

- Release gates for non-data asset changes: none.
- Required approval for auto-generated `data.json` commits: none.

## Deployment checklist

1. GitHub Pages enabled for this repository.
2. Secrets configured: `REFRESH_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `SHEET_ID`.
3. Workflow has `contents: write` permission.
4. `update.yml` runs successfully and commits `data.json`.
5. `index.html` and `scheme.html` load `data.json` successfully in hosted environment.
