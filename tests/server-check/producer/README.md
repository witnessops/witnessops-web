# Accepted producer input for CI

This deterministic source archive contains only the accepted Local Audit 1.2.2
Python package, its packaging file and one synthetic observation fixture from
implementation commit `fce41c194522e9d08d0683aa786bd4361c5ae0c2`.
It contains no private key, production registry or operational configuration.

`identity.json` pins archive and individual-file SHA-256 values. The collector
fingerprint `2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8`
is computed from exact Python source names and bytes; it is not a commit ID.
`prepare.py` verifies both before installing into a fresh isolated test runtime.
Existing server tests create disposable signing material and prohibit collection.
This is a test input, not a production distribution or release channel.
