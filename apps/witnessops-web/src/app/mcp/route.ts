import { createWitnessOpsMcpServer } from "@/lib/server/openai-app/witnessops-mcp-server";
import { createPublicMcpHttpHandler } from "@/lib/server/openai-app/public-mcp-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createPublicMcpHttpHandler(createWitnessOpsMcpServer, "mcp");

export const OPTIONS = handler.OPTIONS;
export const GET = handler.handle;
export const POST = handler.handle;
export const DELETE = handler.handle;
