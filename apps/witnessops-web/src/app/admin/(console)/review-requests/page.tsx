import type { Metadata } from "next";
import Link from "next/link";
import { listCustomers, listReviewRequests } from "@/lib/server/admin-core-spine";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";
import { getAdminPageActor } from "@/lib/server/admin-page-session";
import { filterReviewQueue, REVIEW_QUEUE_STAGES } from "@/lib/admin-review-queue";
import styles from "../../../../components/admin/admin.module.css";

export const metadata: Metadata = { title: "Admin | Review Requests", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminReviewRequestsPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; stage?: string | string[] }>;
}) {
  const actor = await getAdminPageActor();
  const [requests, customers, params] = await Promise.all([listReviewRequests(actor), listCustomers(actor), searchParams]);
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const stage = typeof params.stage === "string" && ["all", "open", ...REVIEW_QUEUE_STAGES].includes(params.stage) ? params.stage : "open";
  const customerById = new Map(customers.map((customer) => [customer.id, customer]));
  const items = filterReviewQueue(requests.map((request) => ({
    id: request.id, requestText: request.requestText, state: request.state,
    customerName: customerById.get(request.customerId)?.name ?? "Customer unavailable",
    customerEmail: customerById.get(request.customerId)?.email ?? "",
    nextAction: request.nextAction, timing: request.timing,
  })), q, stage);
  return <CorePage title="Review Requests" eyebrow="Find the enquiry and its next step">
    <form action="/admin/review-requests" className={styles.reviewQueueFilters}>
      <label className={styles.briefField}><span>Search enquiries</span><input className={styles.queueActionInput} name="q" defaultValue={q} maxLength={200} placeholder="Customer, email, request or ID" /></label>
      <label className={styles.briefField}><span>Stage</span><select className={styles.queueActionInput} name="stage" defaultValue={stage}><option value="open">Open requests</option><option value="all">All requests</option>{REVIEW_QUEUE_STAGES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <button className={styles.rowAction} type="submit">Apply filters</button><Link href="/admin/review-requests" className={styles.inlineLink}>Reset</Link>
    </form>
    <p className={styles.coreFormNote}>{items.length} matching {items.length === 1 ? "request" : "requests"}.</p>
    <CoreTable scrollLabel="Review requests" emptyMessage={requests.length ? "No requests match these filters. Try another search or show all stages." : "No review requests yet. Open an enquiry in Inbox to start triage."} headers={["Enquiry", "Customer", "Stage", "Next action", "Timing"]} rows={items.map((request) => [<Link href={`/admin/review-requests/${request.id}`} key={request.id}>{request.requestText.length > 120 ? `${request.requestText.slice(0, 117)}…` : request.requestText}</Link>, request.customerName, <CoreState value={request.state} key="state" />, request.nextAction, request.timing || "Not recorded"])} />
  </CorePage>;
}
