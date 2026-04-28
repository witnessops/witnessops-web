import { handleReviewRequestIntake } from "@/lib/server/review-request-intake";

export async function POST(request: Request) {
  return handleReviewRequestIntake(request, {
    rateLimitNamespace: "contact",
    source: "api/contact",
  });
}
