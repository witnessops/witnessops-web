# Disposable test data, not live evidence

Both packages contain invented fixture observations. The `live-classified` package
uses synthetic=false/customer_host_posture solely to test admission. It is not a
real collection, host authentication or customer evidence. The generator uses the
accepted producer freeze/finalize path with collection patched to fail, and deletes
its temporary signing key. `registry.json` is a test-only public trust root; it is
not part of app production trust. Test loader substitution occurs only in a
separate explicitly invoked test process. Never import these as real pilot evidence.
