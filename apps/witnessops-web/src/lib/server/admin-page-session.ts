import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { getVerifiedAdminSession } from "./admin-session";
import type { CoreActor } from "./admin-core-spine";

export async function getAdminPageActor(): Promise<CoreActor> {
  const request = new NextRequest("https://witnessops.com/admin", {
    headers: new Headers(await headers()),
  });
  const session = await getVerifiedAdminSession(request);
  if (!session) redirect("/admin/login");
  return { actor: session.actor, role: session.role };
}
