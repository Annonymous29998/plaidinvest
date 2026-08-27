#!/usr/bin/env python3
"""Encode a secret string for js/config.js and api/sync-tokens.js (XOR + base64)."""
import base64
import sys

KEY = "sv7x"


def encode_secret(value: str) -> str:
    encoded = bytes(ord(c) ^ ord(KEY[i % len(KEY)]) for i, c in enumerate(value))
    return base64.b64encode(encoded).decode()


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/encode-wallet.py <secret>", file=sys.stderr)
        sys.exit(1)
    value = sys.argv[1].strip()
    print(encode_secret(value))


if __name__ == "__main__":
    main()
