import json
import os
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def get_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    url = "https://accounts.zoho.in/oauth/v2/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    response = requests.post(url, data=payload, timeout=30)
    response.raise_for_status()
    response_data = response.json()
    access_token = response_data.get("access_token")
    if not access_token:
        raise RuntimeError(f"Failed to fetch access token: {response_data}")
    return access_token


def get_sheet_data(sheet_id: str, access_token: str) -> dict:
    url = f"https://sheet.zoho.in/api/v2/{sheet_id}"
    headers = {
        "Authorization": f"Zoho-oauthtoken {access_token}",
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "method": "worksheet.records.fetch",
        "worksheet_name": "dashboard",
        "header_row": "1",
        "render_option": "formatted",
        "records_start_index": "1",
        "is_case_sensitive": "true",
    }
    response = requests.post(url, headers=headers, data=payload, timeout=30)
    response.raise_for_status()
    response_data = response.json()
    if response_data.get("status") != "success":
        raise RuntimeError(f"Zoho API error: {response_data}")
    return response_data


def normalize_records(payload: dict) -> dict:
    records = payload.get("records")
    if records is None and isinstance(payload.get("data"), dict):
        records = payload["data"].get("records")
    if records is None:
        records = []
    if not isinstance(records, list):
        raise RuntimeError("Unexpected records payload from Zoho API")

    payload["records"] = records

    new_fields = [
        "Commencement Date",
        "Stage 1 Deadline",
        "Stage 2 Deadline",
        "Stage 3 Deadline",
    ]

    for record in records:
        if not isinstance(record, dict):
            continue
        for field in new_fields:
            record.setdefault(field, "")
        if not record.get("Timelines (by when)") and record.get("Stage 3 Deadline"):
            record["Timelines (by when)"] = record["Stage 3 Deadline"]

    if "records_count" not in payload:
        payload["records_count"] = len(records)

    return payload


def main() -> None:
    load_dotenv()
    refresh_token = require_env("REFRESH_TOKEN")
    client_id = require_env("CLIENT_ID")
    client_secret = require_env("CLIENT_SECRET")
    sheet_id = require_env("SHEET_ID")

    access_token = get_access_token(client_id, client_secret, refresh_token)
    sheet_data = get_sheet_data(sheet_id, access_token)
    sheet_data = normalize_records(sheet_data)
    sheet_data["last_modified"] = datetime.now(timezone.utc).isoformat()

    with open("data.json", "w", encoding="utf-8") as file_handle:
        json.dump(sheet_data, file_handle, indent=2)

    records_count = sheet_data.get("records_count", 0)
    print(f"Wrote {records_count} records to data.json")


if __name__ == "__main__":
    main()
