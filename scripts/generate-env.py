#!/usr/bin/env python3
"""Read .env (local) or process env (Vercel) and write js/env.js for the static site."""
import json
import os
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
    "INITIAL_DEPOSIT_DATE": "initialDepositDate",
    "INITIAL_DEPOSIT_CREATED_AT": "initialDepositCreatedAt",
    "LOGIN_EMAIL": "loginEmail",
    "LOGIN_PASSWORD": "loginPassword",
}


def _coerce_value(out_key: str, value: str):
    if out_key in ("balanceUsd", "withdrawalFeeUsd", "initialDepositCreatedAt"):
        try:
            return int(float(value))
        except ValueError:
            return value
    return value


def parse_env_file(path: Path) -> dict:
    data = {}
    if not path.exists():
        return data
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        out_key = KEY_MAP.get(key, key)
        data[out_key] = _coerce_value(out_key, value)
    return data


def parse_env_os() -> dict:
    """Read Vercel / CI environment variables."""
    data = {}
    for env_key, out_key in KEY_MAP.items():
        value = os.environ.get(env_key)
        if value:
            data[out_key] = _coerce_value(out_key, value)
    return data


def parse_env() -> dict:
    data = parse_env_file(ENV_FILE)
    data.update(parse_env_os())
    return data


def main() -> None:
    env = parse_env()
    missing_auth = [k for k in ("loginEmail", "loginPassword") if not env.get(k)]
    if missing_auth:
        print("Warning: missing login env vars for live site:", ", ".join(missing_auth))
        print("Add LOGIN_EMAIL and LOGIN_PASSWORD in Vercel → Settings → Environment Variables")
    if not env:
        print("Warning: no .env or env vars — config.js defaults will be used")
        if OUT_FILE.exists():
            OUT_FILE.unlink()
        return
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    body = "// Auto-generated at build time — do not edit\n"
    body += "window.ENV = " + json.dumps(env, indent=2) + ";\n"
    OUT_FILE.write_text(body, encoding="utf-8")
    print("Wrote", OUT_FILE.relative_to(ROOT))


if __name__ == "__main__":
    main()
