import { cliAuth } from "../../../../lib/cli-auth-service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => cliAuth.handle(request, "session");
export const POST = (request: Request) => cliAuth.handle(request, "session");
