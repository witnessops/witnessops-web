import { NextRequest, NextResponse } from "next/server";

import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { getVerifiedAdminSession } from "@/lib/server/admin-session";
import {
  ADMIN_JSON_BODY_LIMIT_BYTES,
  readBoundedRequestJson,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request-body";
import { runGmailInboxSync } from "@/lib/server/admin-gmail-reconciliation";
import { sendVerificationEmail } from "@/lib/server/send-verification-email";
import { logUnexpectedRouteError } from "@/lib/server/route-error-boundary";
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
  reconcileDeliverySendReservation,
  reserveDeliverySend,
  failDeliverySendReservation,
  markDeliverySendOutcomeUnknown,
  recordDeliverySent,
  recordGmailLabelSync,
  recordIntegrationFailure,
  searchCoreRecords,
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
    if (error.status >= 500 && error.code !== "STORE_BUSY") {
      logUnexpectedRouteError("Admin core action failed", error);
      return NextResponse.json(
        { ok: false, error: "Admin core action failed.", code: "INTERNAL_ERROR", details: null },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: error.message, code: error.code, details: error.details },
      { status: error.status },
    );
  }
  logUnexpectedRouteError("Admin core action failed", error);
  return NextResponse.json(
    { ok: false, error: "Admin core action failed." },
    { status: 500 },
  );
}

async function actorFor(request: NextRequest): Promise<CoreActor | null> {
  const session = await getVerifiedAdminSession(request);
  return session ? { actor: session.actor, role: session.role } : null;
}

async function jsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await readBoundedRequestJson(request, ADMIN_JSON_BODY_LIMIT_BYTES);
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      throw new AdminCoreError("PAYLOAD_TOO_LARGE", "Request body is too large.", 413);
    }
    throw new AdminCoreError("INVALID_INPUT", "Invalid JSON request body.", 400);
  }
}

function stringValue(body: Record<string, unknown>, key: string, required = true): string {
  const value = typeof body[key] === "string" ? body[key] as string : "";
  if (required && !value.trim()) throw new AdminCoreError("INVALID_INPUT", `${key} is required.`);
  if (value.length > 16_384) throw new AdminCoreError("INVALID_INPUT", `${key} is too long.`);
  return value.trim();
}

function stringArray(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];
  if (!Array.isArray(value)) return [];
  if (value.length > 128) throw new AdminCoreError("INVALID_INPUT", `${key} has too many items.`);
  const strings = value.filter((item): item is string => typeof item === "string");
  if (strings.some((item) => item.length > 4_096)) {
    throw new AdminCoreError("INVALID_INPUT", `${key} contains an item that is too long.`);
  }
  return strings;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const actor = await actorFor(request);
  if (!actor) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const { path } = await context.params;
  const parts = path ?? [];
  const [resource, idValue, action] = parts;

  try {
    if (resource === "dashboard") return NextResponse.json({ ok: true, dashboard: await getAdminCoreDashboard(actor) });
    if (resource === "health") return NextResponse.json({ ok: true, health: getAdminCoreHealth() });
    if (resource === "search") return NextResponse.json({ ok: true, results: await searchCoreRecords(request.nextUrl.searchParams.get("q") ?? "", actor) });
    if (resource === "audit") return NextResponse.json({ ok: true, events: await listAuditEvents(idValue, actor) });
    if (resource === "inbox" && idValue === "sync-runs") return NextResponse.json({ ok: true, receipts: await listGmailSyncReceipts(20, actor) });
    if (resource === "inbox") {
      const item = idValue ? await getInboxItem(idValue, actor) : null;
      if (idValue && !item) throw new AdminCoreError("NOT_FOUND", "Inbox item not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [item] : await listInboxItems(actor) });
    }
    if (resource === "review-requests") {
      const reviewRequest = idValue ? await getReviewRequest(idValue, actor) : null;
      if (idValue && !reviewRequest) throw new AdminCoreError("NOT_FOUND", "Review request not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [reviewRequest] : await listReviewRequests(actor) });
    }
    if (resource === "customers") {
      const customer = idValue ? await getCustomer(idValue, actor) : null;
      if (idValue && !customer) throw new AdminCoreError("NOT_FOUND", "Customer not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [customer] : await listCustomers(actor) });
    }
    if (resource === "products") {
      const product = idValue ? await getProductContract(idValue, actor) : null;
      if (idValue && !product) throw new AdminCoreError("NOT_FOUND", "Product contract not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [product] : await listProductContracts(actor) });
    }
    if (resource === "proof-runs") {
      if (idValue && action === "readiness") return NextResponse.json({ ok: true, readiness: await buildProofReadiness(idValue, actor) });
      const proofRun = idValue ? await getProofRun(idValue, actor) : null;
      if (idValue && !proofRun) throw new AdminCoreError("NOT_FOUND", "Proof run not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [proofRun] : await listProofRuns(actor) });
    }
    if (resource === "deliveries") {
      if (idValue && action === "readiness") return NextResponse.json({ ok: true, readiness: await buildDeliveryReadiness(idValue, actor) });
      const delivery = idValue ? await getDelivery(idValue, actor) : null;
      if (idValue && !delivery) throw new AdminCoreError("NOT_FOUND", "Delivery not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [delivery] : await listDeliveries(actor) });
    }
    if (resource === "receipts") {
      const receipt = idValue ? await getReceiptRecord(idValue, actor) : null;
      if (idValue && !receipt) throw new AdminCoreError("NOT_FOUND", "Receipt not found.", 404);
      return NextResponse.json({ ok: true, items: idValue ? [receipt] : await listReceiptRecords(actor) });
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
      const idempotencyKey = stringValue(body, "idempotencyKey", false) || `delivery-send:${idValue}`;
      const reservation = await reserveDeliverySend(idValue, actor, idempotencyKey);
      const delivery = reservation.delivery;
      if (reservation.kind === "replay") return NextResponse.json({ ok: true, item: delivery, idempotent: true });
      if (reservation.kind === "in_progress") {
        return NextResponse.json(
          { ok: false, error: "Delivery send is already in progress.", code: "DELIVERY_SEND_IN_PROGRESS" },
          { status: 409 },
        );
      }
      const customer = await getCustomer(delivery.customerId, actor);
      if (!customer) {
        await failDeliverySendReservation(
          idValue,
          reservation.reservationToken,
          actor,
          "Delivery customer is missing.",
        );
        throw new AdminCoreError("STORE_CORRUPT", "Delivery customer is missing.", 500);
      }
      let result: Awaited<ReturnType<typeof sendVerificationEmail>>;
      try {
        result = await sendVerificationEmail({
          to: customer.email,
          replyTo: PUBLIC_CONTACT_EMAIL,
          subject: delivery.subject,
          text: delivery.body,
          deliveryAttemptId: delivery.id,
        });
      } catch {
        await markDeliverySendOutcomeUnknown(
          idValue,
          reservation.reservationToken,
          actor,
        );
        await recordIntegrationFailure({ integration: "mail", operation: "send_delivery", idempotencyKey, externalId: null, error: "Mail delivery outcome is unknown." }, actor, { recordType: "delivery", recordId: idValue, lineageId: delivery.lineageId });
        throw new AdminCoreError(
          "MAIL_DELIVERY_OUTCOME_UNKNOWN",
          "Mail delivery outcome is unresolved; reconcile it before retrying.",
          502,
        );
      }
      try {
        return NextResponse.json({ ok: true, item: await recordDeliverySent(idValue, { ...result, sentAt: result.deliveredAt }, actor, idempotencyKey, reservation.reservationToken) });
      } catch {
        await markDeliverySendOutcomeUnknown(
          idValue,
          reservation.reservationToken,
          actor,
        );
        await recordIntegrationFailure({ integration: "mail", operation: "commit_delivery_send", idempotencyKey, externalId: result.providerMessageId, error: "Mail delivery was accepted, but local confirmation failed." }, actor, { recordType: "delivery", recordId: idValue, lineageId: delivery.lineageId });
        throw new AdminCoreError(
          "MAIL_DELIVERY_CONFIRMATION_UNRESOLVED",
          "Mail delivery was accepted, but local confirmation is unresolved; reconcile it before retrying.",
          500,
        );
      }
    }
    if (resource === "deliveries" && idValue && action === "reconcile-send") {
      const outcome = stringValue(body, "outcome");
      if (outcome !== "sent" && outcome !== "not_sent") {
        throw new AdminCoreError("INVALID_INPUT", "Unknown delivery reconciliation outcome.");
      }
      return NextResponse.json({
        ok: true,
        item: await reconcileDeliverySendReservation(
          idValue,
          outcome === "sent"
            ? {
                outcome,
                provider: stringValue(body, "provider"),
                providerMessageId: stringValue(body, "providerMessageId", false) || null,
                sentAt: stringValue(body, "sentAt"),
                note: stringValue(body, "note"),
              }
            : {
                outcome,
                note: stringValue(body, "note"),
              },
          actor,
        ),
      });
    }
    return NextResponse.json({ ok: false, error: "Unknown admin core action." }, { status: 404 });
  } catch (error) {
    return responseError(error);
  }
}
