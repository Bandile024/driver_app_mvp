#!/usr/bin/env python3
"""Verify an Android release APK and write its shareable verification record."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("apk", type=Path)
parser.add_argument("--sdk", type=Path, default=Path.home() / "Library/Android/sdk")
parser.add_argument("--build-tools", default="36.0.0")
args = parser.parse_args()
apk = args.apk.resolve(strict=True)
tools = args.sdk / "build-tools" / args.build_tools

def run(*command):
    return subprocess.check_output([str(p) for p in command], text=True, stderr=subprocess.STDOUT)

signature = run(tools / "apksigner", "verify", "--verbose", "--print-certs", apk)
badging = run(tools / "aapt", "dump", "badging", apk)
alignment = run(tools / "zipalign", "-c", "-P", "16", "-v", "4", apk)
package = re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'", badging)
if not package or package.group(1) != "za.co.eskort.driver":
    raise SystemExit("Unexpected or missing Android package identity.")
if "application-debuggable" in badging:
    raise SystemExit("Refusing to mark a debuggable APK as a verified release.")
certificate = re.search(r"Signer #1 certificate SHA-256 digest: (\S+)", signature)
if not certificate:
    raise SystemExit("No verified signing certificate found.")
record = {
    "file": apk.name,
    "bytes": apk.stat().st_size,
    "sha256": hashlib.file_digest(apk.open("rb"), "sha256").hexdigest(),
    "package": package.group(1),
    "versionCode": int(package.group(2)),
    "versionName": package.group(3),
    "certificateSha256": certificate.group(1),
    "signatureVerified": True,
    "zipAlignment16KiBVerified": True,
    "debuggable": False,
    "nativeCode": re.search(r"native-code: (.+)", badging).group(1) if "native-code:" in badging else None,
}
apk.with_suffix(".verification.json").write_text(json.dumps(record, indent=2) + "\n")
apk.with_suffix(".sha256").write_text(f"{record['sha256']}  {apk.name}\n")
apk.with_suffix(".verification.txt").write_text(signature + "\n" + badging + "\n" + alignment)
print(json.dumps(record, indent=2))
