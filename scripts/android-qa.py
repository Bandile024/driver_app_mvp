#!/usr/bin/env python3
"""Small, explicit ADB helper for inspecting the Eskort Driver test emulator."""
import argparse
import os
import re
import subprocess
import xml.etree.ElementTree as ET
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("action", choices=["inspect", "tap", "text", "swipe", "back", "launch", "screenshot"])
parser.add_argument("values", nargs="*")
parser.add_argument("--device", default="emulator-5554")
args = parser.parse_args()
adb = Path(os.environ.get("ANDROID_HOME", str(Path.home() / "Library/Android/sdk"))) / "platform-tools/adb"
out = Path(__file__).resolve().parents[1] / ".shots"
out.mkdir(exist_ok=True)
def run(*values):
    return subprocess.check_output([str(adb), "-s", args.device, *values], timeout=30)

if args.action == "inspect":
    run("shell", "uiautomator", "dump", "/sdcard/eskort-ui.xml")
    data = run("shell", "cat", "/sdcard/eskort-ui.xml")
    (out / "current.xml").write_bytes(data)
    tree = ET.fromstring(data)
    for n in tree.iter("node"):
        a = n.attrib
        label = a.get("content-desc") or a.get("text")
        if label:
            print(a.get("class"), repr(label), a.get("bounds"), "clickable=" + a.get("clickable", ""))
elif args.action == "tap":
    label = " ".join(args.values)
    run("shell", "uiautomator", "dump", "/sdcard/eskort-ui.xml")
    tree = ET.fromstring(run("shell", "cat", "/sdcard/eskort-ui.xml"))
    matches = [n for n in tree.iter("node") if label in [n.get("text"), n.get("content-desc")]]
    interactive = [n for n in matches if n.get("clickable") == "true" and n.get("enabled") == "true"]
    if interactive:
        matches = interactive
    if len(matches) != 1:
        raise SystemExit(f"Expected one exact label, found {len(matches)}: {label}")
    a = matches[0].attrib
    x1,y1,x2,y2 = map(int, re.findall(r"\d+", a["bounds"]))
    run("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))
elif args.action == "text":
    run("shell", "input", "text", " ".join(args.values).replace(" ", "%s"))
elif args.action == "swipe":
    if len(args.values) != 5 or not all(v.isdigit() for v in args.values):
        raise SystemExit("swipe needs x1 y1 x2 y2 milliseconds")
    run("shell", "input", "swipe", *args.values)
elif args.action == "back":
    run("shell", "input", "keyevent", "4")
elif args.action == "launch":
    print(run("shell", "am", "start", "-n", "za.co.eskort.driver/.MainActivity").decode())
elif args.action == "screenshot":
    name = args.values[0] if args.values else "current"
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", name):
        raise SystemExit("Use a simple screenshot name.")
    dest = out / f"{name}.png"
    dest.write_bytes(run("exec-out", "screencap", "-p"))
    print(dest)
