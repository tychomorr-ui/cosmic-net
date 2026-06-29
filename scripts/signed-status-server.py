#!/usr/bin/env python3
"""
ARCHANGEL/v0 signed-status reference server.

Serves GET /status returning:
  {
    "v": "ARCHANGEL/v0",
    "node": "<node-id>",
    "ts": <unix-seconds>,
    "payload_cid": "<sha256-hex of canonical payload>",
    "payload": { ... deterministic node state ... },
    "sig": "<ed25519(sig over payload_cid|ts) hex>",
    "pub": "<ed25519 pubkey hex, 32 bytes>"
  }

No telemetry. No external calls. Stdlib + `cryptography` only.

Usage:
  python3 -m pip install --no-cache-dir cryptography
  # generate a key once:
  python3 scripts/signed-status-server.py --gen-key /etc/archangel/ed25519.key
  # run:
  python3 scripts/signed-status-server.py \
      --key /etc/archangel/ed25519.key \
      --node tesseract-a \
      --bind 10.77.1.1 --port 8443

Then paste http://10.77.1.1:8443/status + the printed pubkey hex into
the Valkyrie Activator in /ops.
"""
from __future__ import annotations
import argparse, hashlib, json, os, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey, Ed25519PublicKey,
)
from cryptography.hazmat.primitives import serialization


def load_or_die(path: str) -> Ed25519PrivateKey:
    with open(path, "rb") as f:
        raw = f.read().strip()
    # accept 32-byte raw seed (hex or binary)
    if len(raw) == 64:
        try:
            raw = bytes.fromhex(raw.decode())
        except Exception:
            pass
    if len(raw) == 32:
        return Ed25519PrivateKey.from_private_bytes(raw)
    # else assume PEM
    return serialization.load_pem_private_key(raw, password=None)


def gen_key(path: str) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    k = Ed25519PrivateKey.generate()
    seed = k.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    with open(path, "wb") as f:
        f.write(seed.hex().encode())
    os.chmod(path, 0o600)
    pub = k.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    print(f"wrote {path}")
    print(f"edPubHex: {pub.hex()}")


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode()


def build_handler(key: Ed25519PrivateKey, node_id: str):
    pub_hex = key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    ).hex()

    class H(BaseHTTPRequestHandler):
        def log_message(self, fmt, *args):  # silence access log; no telemetry
            return

        def do_GET(self):
            if self.path.rstrip("/") != "/status":
                self.send_response(404); self.end_headers(); return
            now = int(time.time())
            payload = {
                "node": node_id,
                "ts": now,
                "uname": os.uname().nodename,
                "kernel": os.uname().release,
            }
            payload_bytes = canonical(payload)
            payload_cid = hashlib.sha256(payload_bytes).hexdigest()
            sig = key.sign(f"{payload_cid}|{now}".encode()).hex()
            body = canonical({
                "v": "ARCHANGEL/v0",
                "node": node_id,
                "ts": now,
                "payload": payload,
                "payload_cid": payload_cid,
                "sig": sig,
                "pub": pub_hex,
            })
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
    return H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gen-key", metavar="PATH")
    ap.add_argument("--key", metavar="PATH")
    ap.add_argument("--node", default=os.uname().nodename)
    ap.add_argument("--bind", default="0.0.0.0")
    ap.add_argument("--port", type=int, default=8443)
    args = ap.parse_args()

    if args.gen_key:
        gen_key(args.gen_key); return
    if not args.key:
        print("--key PATH required (or --gen-key PATH to create one)", file=sys.stderr)
        sys.exit(2)

    key = load_or_die(args.key)
    pub_hex = key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    ).hex()
    print(f"node={args.node}")
    print(f"edPubHex={pub_hex}")
    print(f"statusUrl=http://{args.bind}:{args.port}/status")
    ThreadingHTTPServer((args.bind, args.port), build_handler(key, args.node)).serve_forever()


if __name__ == "__main__":
    main()
