import { redirect } from "next/navigation";

/** Temporary. The index has no remaining job once one review is public. */
export default function ReviewsIndexPage() {
  redirect("/reviews/agent-action-security-review");
}
