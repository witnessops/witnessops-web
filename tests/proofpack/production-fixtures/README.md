# Production trust-chain acceptance fixtures

These small, synthetic Local Audit packages are public acceptance material.
They contain no customer observations or private keys. The complete package was
created through the Local Audit 1.2.2 producer during the owner-authorized
production signer acceptance. Its existing ZIP and detached signature are copied
unchanged here so the independently pinned production registry can be tested.

The adverse and partial pairs were separately owner-authorized for Bundle V1
browser/PDF acceptance only. Their observations, posture, scope, findings and
coverage match the existing adverse/partial fixture semantics. Only these two
additional packages were signed. Keeping these small public pairs follows the
existing ZIP/signature fixture convention and makes the tests reproducible
without signing-key access.

Production signing authority does not turn synthetic observations into real host
evidence. The reports retain their synthetic label. Tests never access a private
key or generate signatures. `create-bundle.ts` wraps these original bytes in
memory; generated `.proofpack` files and PDFs belong outside the repository.

The normal synthetic-signer fixtures remain separate under `../fixtures/` for
the unchanged raw verifier contract and negative production-admission tests.
