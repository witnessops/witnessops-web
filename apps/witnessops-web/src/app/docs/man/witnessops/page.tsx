import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "man witnessops(7)",
  description: "WITNESSOPS — governed execution and verifiable records",
  robots: { index: false },
};

export default function ManOffsec() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="docs-page-enter mx-auto max-w-3xl"
    >
      <pre
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          lineHeight: 1.8,
          color: "var(--color-text-secondary)",
          whiteSpace: "pre",
          overflowX: "auto",
        }}
      >{`WITNESSOPS(7)                    Trust Infrastructure                    WITNESSOPS(7)

NAME
     witnessops — governed execution and verifiable records

SYNOPSIS
     witnessops run <runbook> --target <scope> [--approve]

DESCRIPTION
     WITNESSOPS is a governed execution engine for offensive security operations.

     It does not attempt to prove that the host is honest.

     The host may lie.
     Tools may be replaced.
     Logs may disappear.

     WITNESSOPS records what ran.

TRUST MODEL
     controlled    workflows run inside policy gates
     provable      signed receipts record execution
     bounded       tool correctness is not guaranteed
     fail-safe     missing policy halts execution

SCOPE ENFORCEMENT
     Targets are checked against in-scope.txt before each step executes.
     in-scope.txt is a configuration file, not an access control list.
     If the file is wrong, enforcement is wrong.
     Scope changes are detectable, not preventable.

APPROVAL GATES
     Intrusive steps pause and wait for explicit human approval.
     The approving principal, timestamp, and decision are recorded.
     Self-approval is possible by default.
     Separation of duties depends on configuration.

KEY MANAGEMENT
     Receipt signatures use Ed25519.
     Keys are stored on the local filesystem.
     There is no HSM integration.
     There is no automatic rotation.
     A compromised workstation means a compromised signing key.

EVIDENCE
     Every governed operation emits three artifacts:

       state.json      current execution state
       manifest.json   evidence inventory with content hashes
       receipt.json    signed receipt for each completed step

     Receipts prove execution occurred.
     They do not prove findings are correct.

FAILURE MODES
     policy-denial     target not in scope; step rejected
     approval-timeout  intrusive step waiting; no approver
     tool-failure      tool crashed; step marked failed
     evidence-corrupt  hash mismatch; receipt not generated

WHAT THIS DOES NOT PROTECT
     Compromised host.
     Malicious tool binaries.
     Network interception.
     Operator collusion.
     Finding correctness.

NOTES
     In God we trust. All others must bring receipts.

     🐧 Respect the penguin.

SEE ALSO
     receipts(5), policy-gates(7), governed-execution(7),
     threat-model(7), security-practices(7)

HISTORY
     WITNESSOPS trust infrastructure. Linux-native. No vendor lock-in.

WITNESSOPS                           2026-03-16                          WITNESSOPS(7)`}</pre>
    </main>
  );
}
