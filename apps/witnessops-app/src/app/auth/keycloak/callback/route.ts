import type { NextRequest } from "next/server";
import { finishKeycloakCallback } from "../../../../lib/keycloak-auth-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(request: NextRequest) { return finishKeycloakCallback(request); }
