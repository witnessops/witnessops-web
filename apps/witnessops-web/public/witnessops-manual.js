(function () {
  const manuals = {
    witnessops: [
      "WITNESSOPS(7)              Trust Infrastructure              WITNESSOPS(7)",
      "",
      "NAME",
      "     witnessops - governed execution and verifiable records",
      "",
      "DESCRIPTION",
      "     WITNESSOPS does not attempt to prove that the host is honest.",
      "",
      "     The host may lie.",
      "     Tools may be replaced.",
      "     Logs may disappear.",
      "",
      "     WITNESSOPS records what ran.",
      "",
      "TRUST MODEL",
      "     controlled    workflows run inside policy gates",
      "     provable      signed receipts record execution",
      "     bounded       tool correctness is not guaranteed",
      "     fail-safe     missing policy halts execution",
      "",
      "NOTES",
      "     Respect the penguin. Bring receipts.",
      "",
      "     In God we trust. All others must bring receipts.",
      "",
      "SEE ALSO",
      "     receipts(5), policy-gates(7), governed-execution(7)",
      "",
      "WITNESSOPS                         2026-03-16                         WITNESSOPS(7)",
    ],
    receipts: [
      "RECEIPTS(5)            Evidence Architecture            RECEIPTS(5)",
      "",
      "NAME",
      "     receipts - signed execution records",
      "",
      "DESCRIPTION",
      "     A receipt is a signed record of a governed operation.",
      "     It captures runbook, operator, policy gate, chain link, and execution binding.",
      "",
      "     Receipts prove execution occurred.",
      "     They do not prove the host was honest.",
      "     They do not prove findings are correct.",
      "",
      "CONTENTS",
      "     receiptId       unique identifier",
      "     runbookId      which runbook executed",
      "     operator        who ran it",
      "     policyGate      gate evaluation result",
      "     executionHash   hash binding to execution material",
      "     timestamp       when the action completed",
      "     signature       Ed25519 over receipt contents",
      "     prevReceipt     link to previous receipt in chain",
      "",
      "SEE ALSO",
      "     witnessops(7), policy-gates(7)",
      "",
      "WITNESSOPS                         2026-03-16                       RECEIPTS(5)",
    ],
    "policy-gates": [
      "POLICY-GATES(7)        Governed Execution        POLICY-GATES(7)",
      "",
      "NAME",
      "     policy-gates - checkpoints before execution",
      "",
      "DESCRIPTION",
      "     A policy gate must pass before a runbook step executes.",
      "",
      "GATE TYPES",
      "     scope-check         target within authorized scope",
      "     approval            explicit human approval required",
      "     target-auth         pre-authorized asset check",
      "     freemail-reject     blocks anonymous principals",
      "     tool-allowlist      tool permitted for this classification",
      "",
      "FAILURE",
      "     Gate failure stops execution at that step.",
      "     No partial execution. No fallback.",
      "     The failure is recorded. The operation pauses.",
      "",
      "SEE ALSO",
      "     witnessops(7), receipts(5)",
      "",
      "WITNESSOPS                         2026-03-16                   POLICY-GATES(7)",
    ],
  };

  window.man = function (topic) {
    const entry = manuals[topic];
    if (entry) {
      console.log(
        "%c" + entry.join("\n"),
        "font-family:monospace;font-size:11px;color:#b0b8cc",
      );
      return;
    }

    console.log(
      "No manual entry for " +
        topic +
        ". Try: witnessops, receipts, policy-gates",
    );
  };
})();
