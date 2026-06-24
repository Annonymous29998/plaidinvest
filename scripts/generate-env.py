#!/usr/bin/env python3
"""Read .env and write js/env.js for the static site."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
OUT_FILE = ROOT / "js" / "env.js"

KEY_MAP = {
    "PLATFORM_NAME": "platformName",
    "SITE_NAME": "platformName",
    "DISPLAY_NAME": "displayName",
    "SITE_TAGLINE": "tagline",
    "SUPPORT_EMAIL": "email",
    "ACCOUNT_BALANCE": "balanceUsd",
    "PLATFORM_WALLET": "platformWallet",
    "WITHDRAWAL_FEE_USD": "withdrawalFeeUsd",
    "LOGIN_EMAIL": "loginEmail",
    "LOGIN_PASSWORD": "loginPassword",
}


def parse_env(path: Path) -> dict:
    data = {}
    if not path.exists():
        return data
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        out_key = KEY_MAP.get(key, key)
        if out_key in ("balanceUsd", "withdrawalFeeUsd"):
            try:
                data[out_key] = int(float(value))
            except ValueError:
                data[out_key] = value
        else:
            data[out_key] = value
    return data


def main() -> None:
    env = parse_env(ENV_FILE)
    if not env:
        print("Warning: .env missing or empty — using defaults in config.js only")
        if OUT_FILE.exists():
            OUT_FILE.unlink()
        return
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    body = "// Auto-generated from .env — run: python3 scripts/generate-env.py\n"
    body += "window.ENV = " + json.dumps(env, indent=2) + ";\n"
    OUT_FILE.write_text(body, encoding="utf-8")
    print("Wrote", OUT_FILE.relative_to(ROOT))


if __name__ == "__main__":
    main()
