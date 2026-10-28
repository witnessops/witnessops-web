import { redirect } from "next/navigation";

/** Temporary. The Polish index follows the English review index. */
export default function PolishReviewsPage() {
  redirect("/pl/reviews/agent-action-security-review");
}
