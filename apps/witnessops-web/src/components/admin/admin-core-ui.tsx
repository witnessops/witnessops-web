"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

interface ActionProps {
  endpoint: string;
  body?: Record<string, unknown>;
  label: string;
  confirmText?: string;
}

export function CoreAction({ endpoint, body = {}, label, confirmText }: ActionProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Action failed.");
      setMessage("Saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className={styles.coreActionWrap}>
      <button type="button" className={styles.rowAction} onClick={run} disabled={busy}>
        {busy ? "Working…" : label}
      </button>
      {message ? <span className={styles.coreActionMessage}>{message}</span> : null}
    </span>
  );
}

export function GmailImportForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    body.recipients = String(body.recipients || "").split(",").map((value) => value.trim()).filter(Boolean) as unknown as string;
    body.gmailLabels = String(body.gmailLabels || "").split(",").map((value) => value.trim()).filter(Boolean) as unknown as string;
    try {
      const response = await fetch("/api/admin/core/inbox/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Gmail import failed.");
      setMessage("Inbox item imported.");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gmail import failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }}>
      <div className={styles.coreFormGrid}>
        <input name="gmailMessageId" placeholder="Gmail message ID" required className={styles.queueActionInput} />
        <input name="gmailThreadId" placeholder="Gmail thread ID" required className={styles.queueActionInput} />
        <input name="sender" placeholder="sender@example.com" required className={styles.queueActionInput} />
        <input name="recipients" placeholder="recipients, comma separated" className={styles.queueActionInput} />
        <input name="subject" placeholder="Subject" required className={styles.queueActionInput} />
        <input name="receivedAt" placeholder="2026-07-11T12:00:00Z" required className={styles.queueActionInput} />
        <input name="gmailLabels" placeholder="labels, comma separated" className={styles.queueActionInput} />
      </div>
      <textarea name="excerpt" placeholder="Message excerpt; original content remains in Gmail." className={styles.queueComposerTextarea} />
      <p className={styles.coreFormNote}>Attachments are imported as metadata only. Do not copy them into evidence automatically.</p>
      <div className={styles.queueActionPrimaryRow}>
        <button className={styles.rowAction} disabled={busy}>{busy ? "Importing…" : "Import Gmail item"}</button>
        {message ? <span className={styles.coreActionMessage}>{message}</span> : null}
      </div>
    </form>
  );
}

export function SyncInboxAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; counts: Record<string, number>; failures: string[] } | null>(null);
  const [error, setError] = useState("");
  async function sync() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/core/inbox/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `gmail-sync:${crypto.randomUUID()}` }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string; receipt?: { status: string; counts: Record<string, number>; failures: Array<{ error: string }> } };
      if (!response.ok || !payload.ok || !payload.receipt) throw new Error(payload.error || "Inbox sync failed.");
      setResult({ status: payload.receipt.status, counts: payload.receipt.counts, failures: payload.receipt.failures.map((failure) => failure.error) });
      router.refresh();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Inbox sync failed.");
    } finally {
      setBusy(false);
    }
  }
  return <div className={styles.coreSyncAction}><button type="button" className={styles.rowAction} onClick={() => void sync()} disabled={busy}>{busy ? "Syncing Gmail…" : "Sync Inbox"}</button>{result ? <div className={styles.coreSyncResult}><span>Sync {result.status}</span><span>Threads inspected: {result.counts.threadsInspected}</span><span>Inbox items created: {result.counts.inboxItemsCreated}</span><span>Existing items updated: {result.counts.existingItemsUpdated}</span><span>Security messages excluded: {result.counts.securityMessagesExcluded}</span><span>No-op: {result.counts.noOp}</span><span>Label failures: {result.counts.labelFailures}</span>{result.failures.map((failure, index) => <span className={styles.queueWarning} key={`${index}-${failure}`}>{failure}</span>)}</div> : null}{error ? <div className={styles.queueActionError}>{error}</div> : null}</div>;
}

export function ProofRunOperatorForm({ proofRunId, initial }: { proofRunId: string; initial: { scopeComplete: boolean; outputReferences: string[]; evidenceReferences: string[]; knownGaps: string[]; verificationInstructions: string; customerWordingReviewed: boolean; unsupportedClaims: string[]; evidenceState: string } }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(form: HTMLFormElement) {
    setBusy(true);
    const data = new FormData(form);
    const body: Record<string, unknown> = {
      scopeComplete: data.get("scopeComplete") === "on",
      outputReferences: String(data.get("outputReferences") || "").split(",").map((value) => value.trim()).filter(Boolean),
      evidenceReferences: String(data.get("evidenceReferences") || "").split(",").map((value) => value.trim()).filter(Boolean),
      knownGaps: String(data.get("knownGaps") || "").split(",").map((value) => value.trim()).filter(Boolean),
      verificationInstructions: String(data.get("verificationInstructions") || ""),
      customerWordingReviewed: data.get("customerWordingReviewed") === "on",
      unsupportedClaims: String(data.get("unsupportedClaims") || "").split(",").map((value) => value.trim()).filter(Boolean),
      evidenceState: String(data.get("evidenceState") || "not_started"),
    };
    try {
      const response = await fetch(`/api/admin/core/proof-runs/${proofRunId}/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Proof run update failed.");
      setMessage("Saved");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Proof run update failed.");
    } finally { setBusy(false); }
  }
  return (
    <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget); }}>
      <div className={styles.coreFormGrid}>
        <label className={styles.coreCheckbox}><input type="checkbox" name="scopeComplete" defaultChecked={initial.scopeComplete} /> Scope complete or explicitly bounded</label>
        <label className={styles.coreCheckbox}><input type="checkbox" name="customerWordingReviewed" defaultChecked={initial.customerWordingReviewed} /> Customer wording reviewed</label>
        <select name="evidenceState" defaultValue={initial.evidenceState} className={styles.queueActionSelect}>
          {['not_started', 'expected', 'partial', 'complete', 'blocked', 'excluded', 'not_applicable'].map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      <input name="outputReferences" defaultValue={initial.outputReferences.join(", ")} placeholder="Output references, comma separated" className={styles.queueActionInput} />
      <input name="evidenceReferences" defaultValue={initial.evidenceReferences.join(", ")} placeholder="Evidence references, comma separated" className={styles.queueActionInput} />
      <input name="knownGaps" defaultValue={initial.knownGaps.join(", ")} placeholder="Known gaps, comma separated" className={styles.queueActionInput} />
      <textarea name="verificationInstructions" defaultValue={initial.verificationInstructions} className={styles.queueComposerTextarea} />
      <input name="unsupportedClaims" defaultValue={initial.unsupportedClaims.join(", ")} placeholder="Unsupported claims to remove or bound" className={styles.queueActionInput} />
      <div className={styles.queueActionPrimaryRow}><button className={styles.rowAction} disabled={busy}>{busy ? "Saving…" : "Save proof state"}</button>{message ? <span className={styles.coreActionMessage}>{message}</span> : null}</div>
    </form>
  );
}

export function DeliveryDraftForm({ deliveryId, initial }: { deliveryId: string; initial: { subject: string; body: string; verificationInstructions: string; customerWordingReviewed: boolean; unsupportedClaims: string[]; downloadLinks: string[] } }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = { subject: String(data.get("subject") || ""), body: String(data.get("body") || ""), verificationInstructions: String(data.get("verificationInstructions") || ""), customerWordingReviewed: data.get("customerWordingReviewed") === "on", unsupportedClaims: String(data.get("unsupportedClaims") || "").split(",").map((value) => value.trim()).filter(Boolean), downloadLinks: String(data.get("downloadLinks") || "").split(",").map((value) => value.trim()).filter(Boolean) };
    const response = await fetch(`/api/admin/core/deliveries/${deliveryId}/update`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || "Delivery update failed.");
    setMessage("Saved");
    router.refresh();
  }
  return <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget).catch((error) => setMessage(error instanceof Error ? error.message : "Delivery update failed.")); }}>
    <input name="subject" defaultValue={initial.subject} className={styles.queueActionInput} />
    <textarea name="body" defaultValue={initial.body} className={styles.queueComposerTextarea} />
    <input name="downloadLinks" defaultValue={initial.downloadLinks.join(", ")} placeholder="Download links, comma separated" className={styles.queueActionInput} />
    <textarea name="verificationInstructions" defaultValue={initial.verificationInstructions} className={styles.queueComposerTextarea} />
    <label className={styles.coreCheckbox}><input type="checkbox" name="customerWordingReviewed" defaultChecked={initial.customerWordingReviewed} /> Customer wording reviewed</label>
    <input name="unsupportedClaims" defaultValue={initial.unsupportedClaims.join(", ")} placeholder="Unsupported claims" className={styles.queueActionInput} />
    <div className={styles.queueActionPrimaryRow}><button className={styles.rowAction}>Save delivery draft</button>{message ? <span className={styles.coreActionMessage}>{message}</span> : null}</div>
  </form>;
}

export function DeliverySendReconciliationForm({ deliveryId }: { deliveryId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function reconcile(form: HTMLFormElement) {
    if (!window.confirm("Confirm the provider outcome from independent delivery evidence?")) return;
    setBusy(true);
    setMessage("");
    const data = new FormData(form);
    const body = Object.fromEntries(data.entries());
    try {
      const response = await fetch(`/api/admin/core/deliveries/${deliveryId}/reconcile-send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Delivery reconciliation failed.");
      setMessage("Provider outcome reconciled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delivery reconciliation failed.");
    } finally {
      setBusy(false);
    }
  }
  return <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void reconcile(event.currentTarget); }}>
    <select name="outcome" className={styles.queueActionSelect} required>
      <option value="">Select confirmed outcome</option>
      <option value="not_sent">Confirmed not sent — unlock retry</option>
      <option value="sent">Confirmed sent — record delivery</option>
    </select>
    <div className={styles.coreFormGrid}>
      <input name="provider" placeholder="Provider (required when sent)" className={styles.queueActionInput} />
      <input name="providerMessageId" placeholder="Provider message ID, if available" className={styles.queueActionInput} />
      <input name="sentAt" placeholder="Sent timestamp, required when sent" className={styles.queueActionInput} />
    </div>
    <textarea name="note" placeholder="Evidence used to confirm the provider outcome" required className={styles.queueComposerTextarea} />
    <div className={styles.queueActionPrimaryRow}><button className={styles.rowAction} disabled={busy}>{busy ? "Reconciling…" : "Record reconciled outcome"}</button>{message ? <span className={styles.coreActionMessage}>{message}</span> : null}</div>
  </form>;
}

export function ReceiptLinkForm({ deliveryId }: { deliveryId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function save(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = { receiptId: String(data.get("receiptId") || ""), claimScope: String(data.get("claimScope") || ""), structurallyValid: data.get("structurallyValid") === "on", evidenceReferences: String(data.get("evidenceReferences") || "").split(",").map((value) => value.trim()).filter(Boolean), verifierMechanism: String(data.get("verifierMechanism") || ""), verifierResult: String(data.get("verifierResult") || ""), limitations: String(data.get("limitations") || "").split(",").map((value) => value.trim()).filter(Boolean), archiveLocation: String(data.get("archiveLocation") || ""), supersedesReceiptId: String(data.get("supersedesReceiptId") || "") };
    const response = await fetch(`/api/admin/core/deliveries/${deliveryId}/link-receipt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || "Receipt link failed.");
    setMessage("Receipt linked"); router.refresh();
  }
  return <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget).catch((error) => setMessage(error instanceof Error ? error.message : "Receipt link failed.")); }}>
    <div className={styles.coreFormGrid}><input name="receiptId" placeholder="Exact receipt ID" required className={styles.queueActionInput} /><input name="archiveLocation" placeholder="Receipt archive location" required className={styles.queueActionInput} /><input name="verifierMechanism" placeholder="Named verifier mechanism" required className={styles.queueActionInput} /><input name="verifierResult" placeholder="Verifier result" required className={styles.queueActionInput} /></div>
    <input name="claimScope" placeholder="Bounded claim scope" required className={styles.queueActionInput} /><label className={styles.coreCheckbox}><input type="checkbox" name="structurallyValid" defaultChecked /> Receipt is structurally valid</label><input name="evidenceReferences" placeholder="Evidence references, comma separated" className={styles.queueActionInput} /><input name="limitations" placeholder="Limitations, comma separated" className={styles.queueActionInput} /><input name="supersedesReceiptId" placeholder="Superseded receipt ID, optional" className={styles.queueActionInput} />
    <div className={styles.queueActionPrimaryRow}><button className={styles.rowAction}>Link receipt</button>{message ? <span className={styles.coreActionMessage}>{message}</span> : null}</div>
  </form>;
}

export function ProductApproveForm({ reviewRequestId, products }: { reviewRequestId: string; products: Array<{ id: string; productName: string; contractVersion: string }> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function approve(form: HTMLFormElement) {
    const data = new FormData(form);
    const response = await fetch(`/api/admin/core/review-requests/${reviewRequestId}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productContractVersionId: String(data.get("productContractVersionId") || ""), idempotencyKey: `proof-run:${reviewRequestId}` }) });
    const result = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || "Approval failed.");
    setMessage("Approved and proof run created"); router.refresh();
  }
  return <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void approve(event.currentTarget).catch((error) => setMessage(error instanceof Error ? error.message : "Approval failed.")); }}>
    <select name="productContractVersionId" className={styles.queueActionSelect} required>{products.map((product) => <option value={product.id} key={product.id}>{product.productName} · v{product.contractVersion}</option>)}</select>
    <div className={styles.queueActionPrimaryRow}><button className={styles.rowAction}>Approve and create proof run</button>{message ? <span className={styles.coreActionMessage}>{message}</span> : null}</div>
  </form>;
}

export function ReviewNoteForm({ reviewRequestId }: { reviewRequestId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  async function save(form: HTMLFormElement) {
    const note = String(new FormData(form).get("note") || "");
    const response = await fetch(`/api/admin/core/review-requests/${reviewRequestId}/note`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    const result = await response.json() as { ok?: boolean; error?: string };
    if (!response.ok || !result.ok) throw new Error(result.error || "Note failed.");
    form.reset(); setMessage("Note appended"); router.refresh();
  }
  return <form className={styles.coreForm} onSubmit={(event) => { event.preventDefault(); void save(event.currentTarget).catch((error) => setMessage(error instanceof Error ? error.message : "Note failed.")); }}><textarea name="note" placeholder="Internal note; prior notes remain in the audit trail" required className={styles.queueComposerTextarea} /><div className={styles.queueActionPrimaryRow}><button className={styles.rowAction}>Append internal note</button>{message ? <span className={styles.coreActionMessage}>{message}</span> : null}</div></form>;
}
