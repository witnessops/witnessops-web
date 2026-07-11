import type { Metadata } from "next";
import Link from "next/link";
import { listReviewRequests } from "@/lib/server/admin-core-spine";
import { CorePage, CoreState, CoreTable } from "../../../../components/admin/admin-core-view";

export const metadata: Metadata = { title: "Admin — Review Requests", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminReviewRequestsPage() {
  const requests = await listReviewRequests();
  return <CorePage title="Review Requests" eyebrow="Operator triage">
    <CoreTable headers={["Request", "Customer", "State", "Next action", "Origin"]} rows={requests.map((request) => [<Link href={`/admin/review-requests/${request.id}`} key={request.id}>{request.id}</Link>, request.customerId, <CoreState value={request.state} key="state" />, request.nextAction, request.originatingGmailThreadId])} />
  </CorePage>;
}
