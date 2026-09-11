"use server";
import { headers } from "next/headers";
import { signOut } from "@workos-inc/authkit-nextjs";
import { authConfiguration } from "../../lib/auth-config";
export async function logout() {
  const { origin } = authConfiguration(), incoming = await headers();
  if (incoming.get("origin") !== origin || ![null, "same-origin", "none"].includes(incoming.get("sec-fetch-site"))) throw new Error("Use the app origin.");
  // Next server actions use a 303 after POST. AuthKit terminates the provider
  // session and deletes its host-only cookie without deleting workspace data.
  await signOut({ returnTo: `${origin}/` });
}
