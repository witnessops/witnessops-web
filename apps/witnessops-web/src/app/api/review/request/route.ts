import { handleReviewRequestIntake } from "@/lib/server/review-request-intake";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleReviewRequestIntake(request, {
    rateLimitNamespace: "review-request",
    source: "api/review/request",
  });
}
