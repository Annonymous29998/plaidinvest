#!/usr/bin/env python3
"""Encode a BTC wallet address for js/config.js decodeWallet()."""
import base64
import sys

KEY = "sv7x"


def encode_wallet(address: str) -> str:
    encoded = bytes(ord(c) ^ ord(KEY[i % len(KEY)]) for i, c in enumerate(address))
    return base64.b64encode(encoded).decode()


def main() -> None:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/encode-wallet.py bc1q...", file=sys.stderr)
        sys.exit(1)
    address = sys.argv[1].strip()
    print(encode_wallet(address))


if __name__ == "__main__":
    main()
