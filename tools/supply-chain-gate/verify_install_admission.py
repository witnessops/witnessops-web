"""Fail-closed, stdlib-only check before package tooling or cache restoration."""
import hashlib
import os
from pathlib import Path
import re
import subprocess
import sys


def verify():
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    require(os.environ.get("ADMISSION_RESULT") == "success", "prerequisite did not succeed")
    require(os.environ.get("ADMISSION_STATUS") == "PASS", "dependency admission is not PASS")
    admitted = os.environ.get("ADMITTED_SHA", "")
    event = os.environ.get("EVENT_SHA", "")
    require(re.fullmatch(r"[0-9a-f]{40}", admitted) is not None, "invalid admitted SHA")
    require(re.fullmatch(r"[0-9a-f]{40}", event) is not None, "invalid event SHA")
    require(admitted == event, "admitted/event SHA mismatch")
    head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    require(head == admitted, "checkout/admitted SHA mismatch")
    expected = os.environ.get("ADMITTED_LOCK_SHA256", "")
    require(re.fullmatch(r"[0-9a-f]{64}", expected) is not None, "invalid lockfile hash")
    actual = hashlib.sha256(Path("pnpm-lock.yaml").read_bytes()).hexdigest()
    require(actual == expected, "lockfile hash mismatch")
    print(f"Dependency admission PASS: event={event} admitted={admitted} checkout={head} lockfile={actual}")


if __name__ == "__main__":
    try:
        verify()
    except (ValueError, OSError, subprocess.SubprocessError) as error:
        print(f"Dependency admission rejected: {error}", file=sys.stderr)
        sys.exit(1)
