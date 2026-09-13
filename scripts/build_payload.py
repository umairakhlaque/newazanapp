#!/usr/bin/env python3
"""Validate editable CSV files and generate the Android synchronization payload."""

from __future__ import annotations

import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

TIME = re.compile(r"^(?:[01]\d|2[0-3]):[0-5]\d$")
PRAYERS = ("fajr", "dhuhr", "asr", "maghrib", "isha")


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def prayer_days(path: Path) -> list[dict[str, object]]:
    rows = read_csv(path)
    seen: set[str] = set()
    result: list[dict[str, object]] = []
    for line, row in enumerate(rows, start=2):
        date_text = row.get("date", "").strip()
        datetime.strptime(date_text, "%Y-%m-%d")
        if date_text in seen:
            raise ValueError(f"Duplicate date {date_text} on line {line}")
        seen.add(date_text)
        day: dict[str, object] = {"date": date_text}
        for prayer in PRAYERS:
            adhan = row.get(f"{prayer}_adhan", "").strip()
            iqamah = row.get(f"{prayer}_iqamah", "").strip()
            if not TIME.fullmatch(adhan) or not TIME.fullmatch(iqamah):
                raise ValueError(f"Invalid {prayer} time on line {line}")
            day[prayer] = {"adhan": adhan, "iqamah": iqamah}
        result.append(day)
    if len(result) < 7:
        raise ValueError("The timetable must contain at least seven days")
    return sorted(result, key=lambda item: str(item["date"]))


def content_rows(path: Path) -> list[dict[str, str]]:
    rows = read_csv(path)
    required = ("id", "date", "type", "arabic", "english", "reference")
    result: list[dict[str, str]] = []
    for line, row in enumerate(rows, start=2):
        if any(not row.get(field, "").strip() for field in required):
            raise ValueError(f"Missing required content field on line {line}")
        date_text = row["date"].strip()
        if date_text != "*":
            datetime.strptime(date_text, "%Y-%m-%d")
        content_type = row["type"].strip().upper()
        if content_type not in {"QURAN", "HADITH", "SCHOLAR"}:
            raise ValueError(f"Invalid content type on line {line}")
        result.append({
            "id": row["id"].strip(),
            "date": date_text,
            "type": content_type,
            "arabic": row["arabic"].strip(),
            "english": row["english"].strip(),
            "reference": row["reference"].strip(),
            "scholar": row.get("scholar", "").strip(),
        })
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--timetable", type=Path, default=Path("data/timetable.csv"))
    parser.add_argument("--content", type=Path, default=Path("data/content.csv"))
    parser.add_argument("--output", type=Path, default=Path("data/payload.json"))
    parser.add_argument("--version-output", type=Path, default=Path("data/version.json"))
    parser.add_argument("--asset-output", type=Path)
    parser.add_argument("--version")
    args = parser.parse_args()

    version = args.version or datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    payload = {
        "version": version,
        "mosque_name": "SIEA",
        "timezone": "Europe/London",
        "prayer_days": prayer_days(args.timetable),
        "content": content_rows(args.content),
    }
    rendered = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    args.output.write_text(rendered, encoding="utf-8")
    args.version_output.write_text(json.dumps({"version": version}, indent=2) + "\n", encoding="utf-8")
    if args.asset_output:
        args.asset_output.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
