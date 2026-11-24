import { startKeycloakLink } from "../../../lib/keycloak-auth-flow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) { return startKeycloakLink(request); }
