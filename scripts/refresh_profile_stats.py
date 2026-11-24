#!/usr/bin/env python3
"""Refresh live stat spans in profile/README.md using the GitHub GraphQL API.

Standard library only. Requires ORG_STATS_TOKEN with read access to both
org:openwizdev and repo:jparker2006/ClosedWiz. If the token is missing or
cannot read the private repository, leaves profile/README.md untouched and
exits 0.
"""

from __future__ import annotations

import datetime
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

GRAPHQL_URL = "https://api.github.com/graphql"
SINCE_DATE = datetime.date(2026, 10, 22)
ORG_SCOPE = "org:openwizdev"
PRIVATE_OWNER = "jparker2006"
PRIVATE_REPO = "ClosedWiz"
PRIVATE_SCOPE = f"repo:{PRIVATE_OWNER}/{PRIVATE_REPO}"
README_PATH = pathlib.Path(__file__).resolve().parent.parent / "profile" / "README.md"
DAYS_PER_BATCH = 25


def graphql_query(token: str, query: str) -> dict:
    payload = json.dumps({"query": query}).encode("utf-8")
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "openwizdev-profile-stats",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    if body.get("errors"):
        raise RuntimeError(f"GraphQL errors: {body['errors']}")
    return body["data"]


def read_current_int(text: str, key: str) -> int:
    pattern = re.compile(
        rf"<!--\s*stats:{re.escape(key)}\s*-->(.*?)<!--\s*/stats:{re.escape(key)}\s*-->",
        re.DOTALL,
    )
    match = pattern.search(text)
    if not match:
        raise ValueError(f"Missing marker for stats:{key}")
    raw = match.group(1).strip().replace(",", "")
    return int(raw)


def replace_stat(text: str, key: str, value: int) -> str:
    pattern = re.compile(
        rf"(<!--\s*stats:{re.escape(key)}\s*-->)(.*?)(<!--\s*/stats:{re.escape(key)}\s*-->)",
        re.DOTALL,
    )
    formatted = f"{value:,}"
    updated, count = pattern.subn(rf"\g<1>{formatted}\g<3>", text, count=1)
    if count != 1:
        raise ValueError(f"Failed to replace marker for stats:{key}")
    return updated


def fetch_totals_and_market(token: str) -> tuple[int, int, int] | None:
    since = SINCE_DATE.isoformat()
    query = f"""
    query {{
      privateRepo: repository(owner: "{PRIVATE_OWNER}", name: "{PRIVATE_REPO}") {{
        nameWithOwner
      }}
      orgTotal: search(query: "{ORG_SCOPE} is:pr is:merged merged:>={since}", type: ISSUE) {{
        issueCount
      }}
      privTotal: search(query: "{PRIVATE_SCOPE} is:pr is:merged merged:>={since}", type: ISSUE) {{
        issueCount
      }}
      market: repository(owner: "openwizdev", name: "WizMarket") {{
        object(expression: "main:listings") {{
          ... on Tree {{
            entries {{
              name
            }}
          }}
        }}
      }}
    }}
    """
    data = graphql_query(token, query)
    if not data.get("privateRepo"):
        print("Token cannot see the private repository; keeping existing numbers.")
        return None

    org_total = int(data["orgTotal"]["issueCount"])
    priv_total = int(data["privTotal"]["issueCount"])
    if org_total <= 0 or priv_total <= 0:
        print(
            f"Unexpected non-positive PR count (org={org_total}, priv={priv_total}); "
            "keeping existing numbers."
        )
        return None

    entries = (
        (data.get("market") or {}).get("object") or {}
    ).get("entries") or []
    market_listings = sum(1 for e in entries if str(e.get("name", "")).endswith(".json"))
    return org_total + priv_total, priv_total, market_listings


def fetch_record_day(token: str) -> int:
    today = datetime.datetime.now(datetime.timezone.utc).date()
    days: list[str] = []
    cur = SINCE_DATE
    while cur <= today:
        days.append(cur.isoformat())
        cur += datetime.timedelta(days=1)

    best = 0
    for start in range(0, len(days), DAYS_PER_BATCH):
        chunk = days[start : start + DAYS_PER_BATCH]
        fields: list[str] = []
        for idx, day in enumerate(chunk):
            org_q = f"{ORG_SCOPE} is:pr is:merged merged:{day}..{day}"
            priv_q = f"{PRIVATE_SCOPE} is:pr is:merged merged:{day}..{day}"
            fields.append(f'o{idx}: search(query: "{org_q}", type: ISSUE) {{ issueCount }}')
            fields.append(f'p{idx}: search(query: "{priv_q}", type: ISSUE) {{ issueCount }}')
        data = graphql_query(token, "query {\n" + "\n".join(fields) + "\n}")
        for idx in range(len(chunk)):
            day_total = int(data[f"o{idx}"]["issueCount"]) + int(data[f"p{idx}"]["issueCount"])
            if day_total > best:
                best = day_total
    return best


def main() -> int:
    token = os.environ.get("ORG_STATS_TOKEN", "").strip()
    if not token:
        print("ORG_STATS_TOKEN is not set; keeping existing numbers.")
        return 0

    original = README_PATH.read_text(encoding="utf-8")
    old_merged = read_current_int(original, "prs_merged")
    old_record = read_current_int(original, "prs_record_day")
    old_market = read_current_int(original, "market_listings")

    try:
        result = fetch_totals_and_market(token)
        if result is None:
            return 0
        total_merged, _priv_total, market_listings = result
        record_day = fetch_record_day(token)
    except (urllib.error.URLError, RuntimeError, KeyError, ValueError) as exc:
        print(f"Skipping update due to API error: {exc}", file=sys.stderr)
        return 0

    if total_merged < old_merged:
        print(
            f"Computed total ({total_merged}) is smaller than existing ({old_merged}); "
            "keeping existing numbers."
        )
        return 0

    new_merged = max(total_merged, old_merged)
    new_record = max(record_day, old_record)
    new_market = market_listings if market_listings > 0 else old_market

    updated = replace_stat(original, "prs_merged", new_merged)
    updated = replace_stat(updated, "prs_record_day", new_record)
    updated = replace_stat(updated, "market_listings", new_market)

    if updated != original:
        README_PATH.write_text(updated, encoding="utf-8")
        print(
            f"Updated profile/README.md: prs_merged={new_merged}, "
            f"prs_record_day={new_record}, market_listings={new_market}"
        )
    else:
        print("Numbers unchanged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
