import { handleAdminMcpMethod, handleAdminMcpPost } from "@/lib/server/admin-mcp/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  return handleAdminMcpMethod(request);
}

export function POST(request: Request): Promise<Response> {
  return handleAdminMcpPost(request);
}

export function PUT(request: Request): Response {
  return handleAdminMcpMethod(request);
}

export function PATCH(request: Request): Response {
  return handleAdminMcpMethod(request);
}

export function DELETE(request: Request): Response {
  return handleAdminMcpMethod(request);
}

export function OPTIONS(request: Request): Response {
  return handleAdminMcpMethod(request);
}

export function HEAD(request: Request): Response {
  return handleAdminMcpMethod(request);
}
