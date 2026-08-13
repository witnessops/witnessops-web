import { NextRequest, NextResponse } from "next/server";

import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import { runGmailInboxSync } from "@/lib/server/admin-gmail-reconciliation";
import { sendVerificationEmail } from "@/lib/server/send-verification-email";
import {
  AdminCoreError,
  approveReviewRequest,
  buildDeliveryReadiness,
  buildProofReadiness,
  classifyInboxAttachment,
  convertInboxItemToReviewRequest,
  createProductContractVersion,
  createProofRunForRequest,
  getAdminCoreDashboard,
  getAdminCoreHealth,
  getCustomer,
  getDelivery,
  getInboxItem,
  getProductContract,
  getProofRun,
  getReceiptRecord,
  getReviewRequest,
  importGmailInboxItem,
  linkReceiptToDelivery,
  listAuditEvents,
  listCustomers,
  listDeliveries,
  listGmailSyncReceipts,
  listInboxItems,
  listProductContracts,
  listProofRuns,
  listReceiptRecords,
  listReviewRequests,
  prepareDelivery,
  recordGmailLabelSync,
  recordIntegrationFailure,
  searchCoreRecords,
  sendAuthorizedDelivery,
  transitionDelivery,
  transitionProofRun,
  transitionReviewRequest,
  updateDeliveryDraft,
  updateProofRun,
  type CoreActor,
  type DeliveryState,
  type EvidenceState,
  type ReviewRequestState,
  type ProofRunState,
  type AttachmentClassification,
} from "@/lib/server/admin-core-spine";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

function responseError(error: unknown): NextResponse {
  if (error instanceof AdminCoreError) {
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code, details: error.details },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "Admin core action failed." },
    { status: 500 },
  );
}

function roleFromEnvironment(): CoreActor["role"] {
  const role = process.env.WITNESSOPS_ADMIN_ROLE;
  if (role === "Delegated Operator" || role === "Administrator" || role === "Founder") return role;
  return "Founder";
}

async function actorFor(request: NextRequest): Promise<CoreActor | null> {
  const session = await getVerifiedAdminSession(request);
  return session ? { actor: session.actor, role: roleFromEnvironment() } : null;
}

async function jsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    throw new AdminCoreError("INVALID_INPUT", "Invalid JSON request body.", 400);
  }
}

function stringValue(body: Record<string, unknown>, key: string, required = true): string {
  const value = typeof body[key] === "string" ? body[key] as string : "";
  if (required && !value.trim()) throw new AdminCoreError("INVALID_INPUT", `${key} is required.`);
  return value.trim();
}

function stringArray(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await actorFor(request);
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const { path } = await context.params;
  const parts = path ?? [];
  const [resource, idValue, action] = parts;

  try {
    if (resource === "dashboard") return NextResponse.json({ ok: true, dashboard: await getAdminCoreDashboard() });
    if (resource === "health") return NextResponse.json({ ok: true, health: getAdminCoreHealth() });
    if (resource === "search") return NextResponse.json({ ok: true, results: await searchCoreRecords(request.nextUrl.searchParams.get("q") ?? "") });
    if (resource === "audit") return NextResponse.json({ ok: true, events: await listAuditEvents(idValue) });
    if (resource === "inbox" && idValue === "sync-runs") return NextResponse.json({ ok: true, receipts: await listGmailSyncReceipts() });
    if (resource === "inbox") {
      const item = idValue ? await getInboxItem(idValue) : null;
      if (idValue && !item) throw new AdminCoreError("NOT_FOUND", "Inbox item not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [item] : await listInboxItems() });
    }
    if (resource === "review-requests") {
      const reviewRequest = idValue ? await getReviewRequest(idValue) : null;
      if (idValue && !reviewRequest) throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [reviewRequest] : await listReviewRequests() });
    }
    if (resource === "customers") {
      const customer = idValue ? await getCustomer(idValue) : null;
      if (idValue && !customer) throw new AdminCoreError("NOT_FOUND", "Customer not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [customer] : await listCustomers() });
    }
    if (resource === "products") {
      const product = idValue ? await getProductContract(idValue) : null;
      if (idValue && !product) throw new AdminCoreError("NOT_FOUND", "Product contract not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [product] : await listProductContracts() });
    }
    if (resource === "proof-runs") {
      if (idValue && action === "readiness") return NextResponse.json({ ok: true, readiness: await buildProofReadiness(idValue) });
      const proofRun = idValue ? await getProofRun(idValue) : null;
      if (idValue && !proofRun) throw new AdminCoreError("NOT_FOUND", "Proof run not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [proofRun] : await listProofRuns() });
    }
    if (resource === "deliveries") {
      if (idValue && action === "readiness") return NextResponse.json({ ok: true, readiness: await buildDeliveryReadiness(idValue) });
      const delivery = idValue ? await getDelivery(idValue) : null;
      if (idValue && !delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [delivery] : await listDeliveries() });
    }
    if (resource === "receipts") {
      const receipt = idValue ? await getReceiptRecord(idValue) : null;
      if (idValue && !receipt) throw new AdminCoreError("NOT_FOUND", "Receipt not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [receipt] : await listReceiptRecords() });
    }
    return NextResponse.json({ ok: false, error: "Unknown admin core resource." }, { status: 404 });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const actor = await actorFor(request);
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const { path } = await context.params;
  const parts = path ?? [];
  const [resource, idValue, action] = parts;

  try {
    const body = await jsonBody(request);
    if (resource === "inbox" && idValue === "sync") {
      const result = await runGmailInboxSync(actor, {
        idempotencyKey: stringValue(body, "idempotencyKey", false) || undefined,
      });
      return NextResponse.json({ ok: true, receipt: result.receipt, idempotent: result.idempotent });
    }
    if (resource === "inbox" && idValue === "import") {
      const result = await importGmailInboxItem({
        gmailMessageId: stringValue(body, "gmailMessageId"),
        gmailThreadId: stringValue(body, "gmailThreadId"),
        sender: stringValue(body, "sender"),
        recipients: stringArray(body, "recipients"),
        subject: stringValue(body, "subject"),
        receivedAt: stringValue(body, "receivedAt"),
        excerpt: stringValue(body, "excerpt", false),
        gmailLabels: stringArray(body, "gmailLabels"),
        attachments: Array.isArray(body.attachments) ? body.attachments.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map((attachment) => ({
          attachmentId: typeof attachment.attachmentId === "string" ? attachment.attachmentId : "",
          filename: typeof attachment.filename === "string" ? attachment.filename : "",
          mimeType: typeof attachment.mimeType === "string" ? attachment.mimeType : "application/octet-stream",
          sizeBytes: typeof attachment.sizeBytes === "number" ? attachment.sizeBytes : null,
          driveFileId: typeof attachment.driveFileId === "string" ? attachment.driveFileId : null,
        })) : [],
      }, actor);
      return NextResponse.json({ ok: true, ...result });
    }
    if (resource === "inbox" && idValue && action === "convert") {
      return NextResponse.json({ ok: true, ...(await convertInboxItemToReviewRequest(idValue, actor, stringValue(body, "idempotencyKey", false) || `convert:${idValue}`)) });
    }
    if (resource === "inbox" && idValue && action === "classify-attachment") {
      const classification = stringValue(body, "classification") as AttachmentClassification;
      if (!["reference", "scope_material", "evidence_candidate", "excluded"].includes(classification)) throw new AdminCoreError("INVALID_INPUT", "Unknown attachment classification.");
      return NextResponse.json({ ok: true, item: await classifyInboxAttachment(idValue, stringValue(body, "attachmentId"), classification, actor) });
    }
    if (resource === "inbox" && idValue && action === "labels") {
      const status = stringValue(body, "status") as "succeeded" | "failed" | "retryable";
      if (!["succeeded", "failed", "retryable"].includes(status)) throw new AdminCoreError("INVALID_INPUT", "Unknown Gmail label sync status.");
      return NextResponse.json({ ok: true, item: await recordGmailLabelSync(idValue, stringArray(body, "labels"), { status, error: stringValue(body, "error", false) || null }, actor) });
    }
    if (resource === "review-requests" && idValue && action === "transition") {
      return NextResponse.json({ ok: true, item: await transitionReviewRequest(idValue, stringValue(body, "nextState") as ReviewRequestState, actor) });
    }
    if (resource === "review-requests" && idValue && action === "approve") {
      const approved = await approveReviewRequest(idValue, stringValue(body, "productContractVersionId"), actor);
      const proofRun = await createProofRunForRequest(idValue, approved.productContractVersionId as string, actor, stringValue(body, "idempotencyKey", false) || `proof-run:${idValue}`);
      return NextResponse.json({ ok: true, reviewRequest: approved, proofRun });
    }
    if (resource === "review-requests" && idValue && action === "note") {
      const { addReviewRequestNote } = await import("@/lib/server/admin-core-spine");
      return NextResponse.json({ ok: true, item: await addReviewRequestNote(idValue, stringValue(body, "note"), actor) });
    }
    if (resource === "products" && idValue === "create") {
      return NextResponse.json({ ok: true, item: await createProductContractVersion({
        productId: stringValue(body, "productId"),
        productName: stringValue(body, "productName"),
        contractVersion: stringValue(body, "contractVersion"),
        scope: stringValue(body, "scope"),
        boundaries: stringArray(body, "boundaries"),
        expectedInputs: stringArray(body, "expectedInputs"),
        expectedOutputs: stringArray(body, "expectedOutputs"),
        evidenceClasses: stringArray(body, "evidenceClasses"),
        verificationPath: stringValue(body, "verificationPath"),
        deliveryRequirements: stringArray(body, "deliveryRequirements"),
        receiptRequirements: stringArray(body, "receiptRequirements"),
        responsibleOperator: stringValue(body, "responsibleOperator", false) || null,
        commercialTerms: stringValue(body, "commercialTerms", false) || null,
        sourceCatalogVersion: stringValue(body, "sourceCatalogVersion", false) || null,
      }, actor) });
    }
    if (resource === "proof-runs" && idValue && action === "transition") {
      return NextResponse.json({ ok: true, item: await transitionProofRun(idValue, stringValue(body, "nextState") as ProofRunState, actor) });
    }
    if (resource === "proof-runs" && idValue && action === "update") {
      return NextResponse.json({ ok: true, item: await updateProofRun(idValue, {
        scopeComplete: typeof body.scopeComplete === "boolean" ? body.scopeComplete : undefined,
        outputReferences: stringArray(body, "outputReferences"),
        evidenceReferences: stringArray(body, "evidenceReferences"),
        knownGaps: stringArray(body, "knownGaps"),
        verificationInstructions: stringValue(body, "verificationInstructions", false),
        customerWordingReviewed: typeof body.customerWordingReviewed === "boolean" ? body.customerWordingReviewed : undefined,
        unsupportedClaims: stringArray(body, "unsupportedClaims"),
        driveFileIds: stringArray(body, "driveFileIds"),
        owner: stringValue(body, "owner", false) || undefined,
        nextAction: stringValue(body, "nextAction", false) || undefined,
        evidenceState: stringValue(body, "evidenceState", false) as EvidenceState || undefined,
      }, actor) });
    }
    if (resource === "proof-runs" && idValue && action === "prepare-delivery") {
      return NextResponse.json({ ok: true, item: await prepareDelivery(idValue, actor) });
    }
    if (resource === "deliveries" && idValue && action === "transition") {
      return NextResponse.json({ ok: true, item: await transitionDelivery(idValue, stringValue(body, "nextState") as DeliveryState, actor) });
    }
    if (resource === "deliveries" && idValue && action === "update") {
      return NextResponse.json({ ok: true, item: await updateDeliveryDraft(idValue, {
        subject: stringValue(body, "subject", false) || undefined,
        body: stringValue(body, "body", false) || undefined,
        downloadLinks: stringArray(body, "downloadLinks"),
        verificationInstructions: stringValue(body, "verificationInstructions", false) || undefined,
        customerWordingReviewed: typeof body.customerWordingReviewed === "boolean" ? body.customerWordingReviewed : undefined,
        unsupportedClaims: stringArray(body, "unsupportedClaims"),
      }, actor) });
    }
    if (resource === "deliveries" && idValue && action === "link-receipt") {
      return NextResponse.json({ ok: true, item: await linkReceiptToDelivery(idValue, {
        receiptId: stringValue(body, "receiptId"),
        claimScope: stringValue(body, "claimScope"),
        structurallyValid: typeof body.structurallyValid === "boolean" ? body.structurallyValid : true,
        evidenceReferences: stringArray(body, "evidenceReferences"),
        verifierMechanism: stringValue(body, "verifierMechanism"),
        verifierResult: stringValue(body, "verifierResult"),
        limitations: stringArray(body, "limitations"),
        archiveLocation: stringValue(body, "archiveLocation"),
        supersedesReceiptId: stringValue(body, "supersedesReceiptId", false) || null,
      }, actor) });
    }
    if (resource === "deliveries" && idValue && action === "send") {
      const idempotencyKey =
        stringValue(body, "idempotencyKey", false) ||
        `delivery-send:${idValue}`;
      let providerAttempted = false;
      try {
        const item = await sendAuthorizedDelivery(
          idValue,
          actor,
          async (message) => {
            providerAttempted = true;
            const result = await sendVerificationEmail({
              ...message,
              replyTo: PUBLIC_CONTACT_EMAIL,
            });
            return { ...result, sentAt: result.deliveredAt };
          },
          idempotencyKey,
        );
        return NextResponse.json({ ok: true, item });
      } catch (error) {
        if (providerAttempted) {
          const delivery = await getDelivery(idValue);
          await recordIntegrationFailure({ integration: "mail", operation: "send_delivery", idempotencyKey, externalId: null, error: error instanceof Error ? error.message : "Mail delivery failed." }, actor, { recordType: "delivery", recordId: idValue, lineageId: delivery?.lineageId ?? null });
        }
        throw error;
      }
    }
    return NextResponse.json({ ok: false, error: "Unknown admin core action." }, { status: 404 });
  } catch (error) {
    return responseError(error);
  }
}
