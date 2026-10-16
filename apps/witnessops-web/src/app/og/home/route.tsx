import { DEFAULT_SOCIAL_IMAGE_PATH } from "@/lib/social-metadata";

// Preserve older /og/home links without serving retired artwork.
// Current social metadata points directly at the versioned asset for cache refresh.
export function GET(request: Request) {
  return Response.redirect(new URL(DEFAULT_SOCIAL_IMAGE_PATH, request.url), 308);
}
