"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import styles from "./admin.module.css";

import type {
  QueuePriority,
  QueueWorkflowState,
  ScopeContractStatus,
} from "@/lib/server/token-store";

type ActionStatus = {
  type: "success" | "error" | "";
  message: string;
};

type OwnershipAction = "assign" | "reassign" | null;
type ClarificationAction = "request" | "clear" | null;
type ScopeAction = "draft" | "approve" | "supersede" | "withdraw" | null;
type ResponseAction = "record" | null;

interface Props {
  intakeId: string;
  projectionVersion: number;
  eventSequence: number;
  queueWorkflowState: QueueWorkflowState;
  queueAssignedOperator: string | null;
  queuePriority: QueuePriority;
  queueClarificationOutstanding: boolean;
  queueScopeContractStatus: ScopeContractStatus | null;
  queueCurrentScopeContractId: string | null;
  queueRespondedAt: string | null;
}

const PRIORITY_OPTIONS: QueuePriority[] = ["low", "normal", "high", "urgent"];

function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `qid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatReasonCodes(reasonCodes?: string[]): string {
  if (!reasonCodes || reasonCodes.length === 0) {
    return "Queue command failed.";
  }
  return `Queue command failed: ${reasonCodes.join(", ")}`;
}

export function AdminQueueActionRail({
  intakeId,
  projectionVersion,
  eventSequence,
  queueWorkflowState,
  queueAssignedOperator,
  queuePriority,
  queueClarificationOutstanding,
  queueScopeContractStatus,
  queueCurrentScopeContractId,
  queueRespondedAt,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ActionStatus>({ type: "", message: "" });
  const [targetOperator, setTargetOperator] = useState("");
  const [overrideTarget, setOverrideTarget] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [priority, setPriority] = useState<QueuePriority>(queuePriority);
  const [ownershipAction, setOwnershipAction] = useState<OwnershipAction>(null);
  const [clarificationAction, setClarificationAction] =
    useState<ClarificationAction>(null);
  const [scopeAction, setScopeAction] = useState<ScopeAction>(null);
  const [responseAction, setResponseAction] = useState<ResponseAction>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [clarificationReason, setClarificationReason] = useState("");
  const [clearClarificationReason, setClearClarificationReason] = useState("");
  const [scopeStatement, setScopeStatement] = useState("");
  const [systemsInScope, setSystemsInScope] = useState("");
  const [actorsInScope, setActorsInScope] = useState("");
  const [explicitOutOfScope, setExplicitOutOfScope] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [supersedeReason, setSupersedeReason] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [responseSummary, setResponseSummary] = useState("");
  const [clarificationResolutionNote, setClarificationResolutionNote] =
    useState("");

  useEffect(() => {
    setPriority(queuePriority);
  }, [queuePriority]);

  const canStartScopeDraft =
    queueScopeContractStatus === null &&
    (queueWorkflowState === "pending_operator_review" ||
      queueWorkflowState === "clarification_pending");
  const canApproveScope =
    queueWorkflowState === "scope_drafting" &&
    queueScopeContractStatus === "draft" &&
    Boolean(queueCurrentScopeContractId);
  const canRecordResponse =
    queueWorkflowState === "scope_approved" &&
    queueScopeContractStatus === "approved" &&
    Boolean(queueCurrentScopeContractId) &&
    !queueRespondedAt;
  const showClarificationSection =
    queueWorkflowState === "pending_operator_review" ||
    queueWorkflowState === "clarification_pending" ||
    queueClarificationOutstanding;
  const showScopeSection =
    queueScopeContractStatus !== null || canStartScopeDraft || canApproveScope;
  const showResponseSection =
    canRecordResponse ||
    queueRespondedAt !== null ||
    queueWorkflowState === "responded";
  const scopeActionsAvailable =
    (queueScopeContractStatus === null && canStartScopeDraft) ||
    queueScopeContractStatus === "draft" ||
    queueScopeContractStatus === "approved";
  const responseActionsAvailable = canRecordResponse || queueRespondedAt !== null;
  const primarySections = new Set<string>(["ownership", "priority"]);
  if (
    queueWorkflowState === "pending_operator_review" ||
    queueWorkflowState === "clarification_pending"
  ) {
    primarySections.add("clarification");
    primarySections.add("scope");
  }
  if (queueWorkflowState === "scope_drafting") {
    primarySections.add("scope");
  }
  if (queueWorkflowState === "scope_approved") {
    primarySections.add("response");
  }
  if (queueClarificationOutstanding) {
    primarySections.add("clarification");
  }
  if (canRecordResponse) {
    primarySections.add("response");
  }

  async function submitCommand(
    command: string,
    payload: Record<string, unknown> = {},
  ) {
    setStatus({ type: "", message: "" });
    const body = {
      command,
      intakeId,
      idempotencyKey: makeIdempotencyKey(),
      expectedProjectionVersion: projectionVersion,
      expectedEventSequence: eventSequence,
      payload,
    };

    let response: Response;
    try {
      response = await fetch("/api/admin/queue/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (error) {
      setStatus({
        type: "error",
        message:
          error instanceof Error ? error.message : "Queue command failed.",
      });
      return;
    }

    const result = (await response.json().catch(() => null)) as
      | { ok?: boolean; reasonCodes?: string[]; error?: string }
      | null;

    if (!response.ok) {
      setStatus({
        type: "error",
        message: result?.error ?? "Queue command failed.",
      });
      return;
    }

    if (result?.ok === false) {
      setStatus({
        type: "error",
        message: formatReasonCodes(result.reasonCodes),
      });
      return;
    }

    setStatus({ type: "success", message: `${command} applied.` });
    startTransition(() => router.refresh());
  }

  function parseList(value: string): string[] | undefined {
    const items = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    return items.length > 0 ? items : undefined;
  }

  return (
    <div className={styles.queueActionRail}>
      <div
        className={`${styles.queueActionSection}${
          primarySections.has("ownership")
            ? ` ${styles.queueActionSectionPrimary}`
            : ` ${styles.queueActionSectionMuted}`
        }`}
      >
        <div className={styles.queueActionTitle}>Ownership</div>
        <div className={styles.queueActionRow}>
          Current owner: {queueAssignedOperator ?? "unassigned"}
        </div>
        <div className={styles.queueActionPrimaryRow}>
          {!queueAssignedOperator ? (
            <>
              <button
                type="button"
                className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                onClick={() => void submitCommand("queue.claim")}
                disabled={isPending}
              >
                {isPending ? "Claiming..." : "Claim"}
              </button>
              <button
                type="button"
                className={styles.rowAction}
                onClick={() =>
                  setOwnershipAction((current) =>
                    current === "assign" ? null : "assign",
                  )
                }
                disabled={isPending}
              >
                Assign
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.rowAction}
                onClick={() =>
                  setOwnershipAction((current) =>
                    current === "reassign" ? null : "reassign",
                  )
                }
                disabled={isPending}
              >
                Reassign
              </button>
              <button
                type="button"
                className={styles.rowAction}
                onClick={() => void submitCommand("queue.unassign")}
                disabled={isPending}
              >
                Unassign
              </button>
            </>
          )}
        </div>
        {ownershipAction === "assign" && !queueAssignedOperator ? (
          <div className={styles.queueActionInline}>
            <input
              className={styles.queueActionInput}
              value={targetOperator}
              onChange={(event) => setTargetOperator(event.target.value)}
              placeholder="Assign to operator"
            />
            <button
              type="button"
              className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
              onClick={() =>
                void submitCommand("queue.assign", {
                  targetOperator: targetOperator.trim(),
                })
              }
              disabled={isPending || !targetOperator.trim()}
            >
              Confirm assign
            </button>
            <button
              type="button"
              className={`${styles.rowAction} ${styles.queueActionCancel}`}
              onClick={() => setOwnershipAction(null)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        ) : null}
        {ownershipAction === "reassign" && queueAssignedOperator ? (
          <div className={styles.queueActionInline}>
            <input
              className={styles.queueActionInput}
              value={targetOperator}
              onChange={(event) => setTargetOperator(event.target.value)}
              placeholder="New owner"
            />
            <button
              type="button"
              className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
              onClick={() =>
                void submitCommand("queue.reassign", {
                  targetOperator: targetOperator.trim(),
                })
              }
              disabled={isPending || !targetOperator.trim()}
            >
              Confirm reassign
            </button>
            <button
              type="button"
              className={`${styles.rowAction} ${styles.queueActionCancel}`}
              onClick={() => setOwnershipAction(null)}
              disabled={isPending}
            >
              Cancel
            </button>
          </div>
        ) : null}
        <details className={styles.queueActionDetails}>
          <summary className={styles.queueActionSummary}>Admin override</summary>
          <div className={styles.queueActionDetailsBody}>
            <input
              className={styles.queueActionInput}
              value={overrideTarget}
              onChange={(event) => setOverrideTarget(event.target.value)}
              placeholder="Override owner"
            />
            <input
              className={styles.queueActionInput}
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
              placeholder="Override reason"
            />
            <button
              type="button"
              className={styles.rowAction}
              onClick={() =>
                void submitCommand("queue.override_assign", {
                  targetOperator: overrideTarget.trim(),
                  reason: overrideReason.trim(),
                })
              }
              disabled={
                isPending || !overrideTarget.trim() || !overrideReason.trim()
              }
            >
              Override assign
            </button>
          </div>
        </details>
      </div>

      <div
        className={`${styles.queueActionSection}${
          primarySections.has("priority")
            ? ` ${styles.queueActionSectionPrimary}`
            : ` ${styles.queueActionSectionMuted}`
        }`}
      >
        <div className={styles.queueActionTitle}>Priority</div>
        <div className={styles.queueActionPrimaryRow}>
          <select
            className={styles.queueActionSelect}
            value={priority}
            onChange={(event) => setPriority(event.target.value as QueuePriority)}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={`${styles.rowAction}${
              primarySections.has("priority")
                ? ` ${styles.queueActionPrimaryButton}`
                : ""
            }`}
            onClick={() =>
              void submitCommand("queue.set_priority", { priority })
            }
            disabled={isPending}
          >
            Set priority
          </button>
        </div>
      </div>

      {showClarificationSection ? (
        <div
          className={`${styles.queueActionSection}${
            primarySections.has("clarification")
              ? ` ${styles.queueActionSectionPrimary}`
              : ` ${styles.queueActionSectionMuted}`
          }`}
        >
          <div className={styles.queueActionTitle}>Clarification</div>
          {!queueClarificationOutstanding ? (
            <>
              <div className={styles.queueActionPrimaryRow}>
                <button
                  type="button"
                  className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                  onClick={() =>
                    setClarificationAction((current) =>
                      current === "request" ? null : "request",
                    )
                  }
                  disabled={isPending}
                >
                  Request clarification
                </button>
              </div>
              {clarificationAction === "request" ? (
                <div className={styles.queueActionInline}>
                  <input
                    className={styles.queueActionInput}
                    value={clarificationQuestion}
                    onChange={(event) => setClarificationQuestion(event.target.value)}
                    placeholder="Clarification question"
                  />
                  <input
                    className={styles.queueActionInput}
                    value={clarificationReason}
                    onChange={(event) => setClarificationReason(event.target.value)}
                    placeholder="Reason"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.request_clarification", {
                        question: clarificationQuestion.trim(),
                        reason: clarificationReason.trim(),
                      })
                    }
                    disabled={
                      isPending ||
                      !clarificationQuestion.trim() ||
                      !clarificationReason.trim()
                    }
                  >
                    Confirm request
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setClarificationAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className={styles.queueActionPrimaryRow}>
                <button
                  type="button"
                  className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                  onClick={() =>
                    setClarificationAction((current) =>
                      current === "clear" ? null : "clear",
                    )
                  }
                  disabled={isPending}
                >
                  Clear clarification
                </button>
              </div>
              {clarificationAction === "clear" ? (
                <div className={styles.queueActionInline}>
                  <input
                    className={styles.queueActionInput}
                    value={clearClarificationReason}
                    onChange={(event) =>
                      setClearClarificationReason(event.target.value)
                    }
                    placeholder="Clear reason"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.clear_clarification", {
                        reason: clearClarificationReason.trim(),
                      })
                    }
                    disabled={isPending || !clearClarificationReason.trim()}
                  >
                    Confirm clear
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setClarificationAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {showScopeSection ? (
        <div
          className={`${styles.queueActionSection}${
            primarySections.has("scope")
              ? ` ${styles.queueActionSectionPrimary}`
              : ` ${styles.queueActionSectionMuted}`
          }`}
        >
          <div className={styles.queueActionTitle}>Scope contract</div>
          <div className={styles.queueActionRow}>
            Current contract:{" "}
            {queueCurrentScopeContractId
              ? `${queueScopeContractStatus ?? "unknown"} · ${queueCurrentScopeContractId}`
              : "none"}
          </div>
          {queueScopeContractStatus === null ? (
            <>
              <div className={styles.queueActionPrimaryRow}>
                <button
                  type="button"
                  className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                  onClick={() =>
                    setScopeAction((current) =>
                      current === "draft" ? null : "draft",
                    )
                  }
                  disabled={isPending || !canStartScopeDraft}
                >
                  Start scope draft
                </button>
              </div>
              {scopeAction === "draft" ? (
                <div className={styles.queueActionInline}>
                  <textarea
                    className={styles.queueComposerTextarea}
                    value={scopeStatement}
                    onChange={(event) => setScopeStatement(event.target.value)}
                    rows={4}
                    placeholder="Scope statement"
                  />
                  <input
                    className={styles.queueActionInput}
                    value={systemsInScope}
                    onChange={(event) => setSystemsInScope(event.target.value)}
                    placeholder="Systems in scope (comma-separated)"
                  />
                  <input
                    className={styles.queueActionInput}
                    value={actorsInScope}
                    onChange={(event) => setActorsInScope(event.target.value)}
                    placeholder="Actors in scope (comma-separated)"
                  />
                  <input
                    className={styles.queueActionInput}
                    value={explicitOutOfScope}
                    onChange={(event) => setExplicitOutOfScope(event.target.value)}
                    placeholder="Explicitly out of scope (comma-separated)"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.start_scope_draft", {
                        scopeStatement: scopeStatement.trim(),
                        systemsInScope: parseList(systemsInScope),
                        actorsInScope: parseList(actorsInScope),
                        explicitOutOfScope: parseList(explicitOutOfScope),
                      })
                    }
                    disabled={isPending || !scopeStatement.trim() || !canStartScopeDraft}
                  >
                    Confirm draft
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setScopeAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              {!canStartScopeDraft ? (
                <div className={styles.queueActionNote}>
                  Scope drafting is only available during pending review or clarification.
                </div>
              ) : null}
            </>
          ) : null}
          {queueScopeContractStatus === "draft" ? (
            <>
              <div className={styles.queueActionPrimaryRow}>
                <button
                  type="button"
                  className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                  onClick={() =>
                    setScopeAction((current) =>
                      current === "approve" ? null : "approve",
                    )
                  }
                  disabled={isPending || !canApproveScope}
                >
                  Approve scope contract
                </button>
              </div>
              {scopeAction === "approve" ? (
                <div className={styles.queueActionInline}>
                  <input
                    className={styles.queueActionInput}
                    value={approvalNote}
                    onChange={(event) => setApprovalNote(event.target.value)}
                    placeholder="Approval note (optional)"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.approve_scope_contract", {
                        approvalNote: approvalNote.trim() || undefined,
                      })
                    }
                    disabled={isPending || !canApproveScope}
                  >
                    Confirm approval
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setScopeAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          {queueScopeContractStatus === "approved" ? (
            <>
              <div className={styles.queueActionPrimaryRow}>
                <button
                  type="button"
                  className={styles.rowAction}
                  onClick={() =>
                    setScopeAction((current) =>
                      current === "supersede" ? null : "supersede",
                    )
                  }
                  disabled={isPending}
                >
                  Supersede
                </button>
                <button
                  type="button"
                  className={styles.rowAction}
                  onClick={() =>
                    setScopeAction((current) =>
                      current === "withdraw" ? null : "withdraw",
                    )
                  }
                  disabled={isPending}
                >
                  Withdraw
                </button>
              </div>
              {scopeAction === "supersede" ? (
                <div className={styles.queueActionInline}>
                  <input
                    className={styles.queueActionInput}
                    value={supersedeReason}
                    onChange={(event) => setSupersedeReason(event.target.value)}
                    placeholder="Supersede reason"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.supersede_scope_contract", {
                        reason: supersedeReason.trim(),
                      })
                    }
                    disabled={isPending || !supersedeReason.trim()}
                  >
                    Confirm supersede
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setScopeAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
              {scopeAction === "withdraw" ? (
                <div className={styles.queueActionInline}>
                  <input
                    className={styles.queueActionInput}
                    value={withdrawReason}
                    onChange={(event) => setWithdrawReason(event.target.value)}
                    placeholder="Withdraw reason"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.withdraw_scope_contract", {
                        reason: withdrawReason.trim(),
                      })
                    }
                    disabled={isPending || !withdrawReason.trim()}
                  >
                    Confirm withdraw
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setScopeAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          {!scopeActionsAvailable ? (
            <div className={styles.queueActionNote}>
              Scope actions are locked for the current state.
            </div>
          ) : null}
        </div>
      ) : null}

      {showResponseSection ? (
        <div
          className={`${styles.queueActionSection}${
            primarySections.has("response")
              ? ` ${styles.queueActionSectionPrimary}`
              : ` ${styles.queueActionSectionMuted}`
          }`}
        >
          <div className={styles.queueActionTitle}>Queue response</div>
          {queueRespondedAt ? (
            <div className={styles.queueActionNote}>Response already recorded.</div>
          ) : null}
          {canRecordResponse ? (
            <>
              <div className={styles.queueActionPrimaryRow}>
                <button
                  type="button"
                  className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                  onClick={() =>
                    setResponseAction((current) =>
                      current === "record" ? null : "record",
                    )
                  }
                  disabled={isPending}
                >
                  Record queue response
                </button>
              </div>
              {responseAction === "record" ? (
                <div className={styles.queueActionInline}>
                  <textarea
                    className={styles.queueComposerTextarea}
                    value={responseSummary}
                    onChange={(event) => setResponseSummary(event.target.value)}
                    rows={4}
                    placeholder="Response summary"
                  />
                  <input
                    className={styles.queueActionInput}
                    value={clarificationResolutionNote}
                    onChange={(event) =>
                      setClarificationResolutionNote(event.target.value)
                    }
                    placeholder="Clarification resolution note (optional)"
                  />
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionPrimaryButton}`}
                    onClick={() =>
                      void submitCommand("queue.record_response", {
                        responseSummary: responseSummary.trim(),
                        clarificationResolutionNote:
                          clarificationResolutionNote.trim() || undefined,
                      })
                    }
                    disabled={isPending || !responseSummary.trim() || !canRecordResponse}
                  >
                    Confirm response
                  </button>
                  <button
                    type="button"
                    className={`${styles.rowAction} ${styles.queueActionCancel}`}
                    onClick={() => setResponseAction(null)}
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
          {!responseActionsAvailable ? (
            <div className={styles.queueActionNote}>
              Response actions unlock after scope approval.
            </div>
          ) : null}
        </div>
      ) : null}

      {status.message ? (
        <div
          className={
            status.type === "error"
              ? styles.queueActionError
              : styles.queueActionSuccess
          }
        >
          {status.message}
        </div>
      ) : null}
    </div>
  );
}
