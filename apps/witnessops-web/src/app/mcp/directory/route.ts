import { createWitnessOpsDirectoryMcpServer } from "@/lib/server/openai-app/witnessops-directory-mcp-server";
import { createPublicMcpHttpHandler } from "@/lib/server/openai-app/public-mcp-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createPublicMcpHttpHandler(createWitnessOpsDirectoryMcpServer, "mcp-directory");

export const OPTIONS = handler.OPTIONS;
export const GET = handler.handle;
export const POST = handler.handle;
export const DELETE = handler.handle;
