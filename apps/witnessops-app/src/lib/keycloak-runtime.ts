import "server-only";
import type { PoolClient } from "pg";
import { database } from "./db/pool";
import { authConfiguration } from "./auth-config";
import { discoverKeycloakOidc, keycloakSessionProvider, parseKeycloakOidcSettings } from "./keycloak-oidc";
import { loadKeycloakSessionCodec } from "./keycloak-session-codec";
import { KeycloakSessionStore, PostgresKeycloakSessionRepository } from "./keycloak-sessions";

let discovered: ReturnType<typeof discoverKeycloakOidc> | undefined;

/** All Keycloak routes and session reads use one fixed, server-owned client. */
export async function keycloakRuntime(client?: PoolClient) {
  const app = authConfiguration();
  const settings = parseKeycloakOidcSettings({
    issuer: process.env.WITNESSOPS_KEYCLOAK_ISSUER ?? "",
    clientId: process.env.WITNESSOPS_KEYCLOAK_CLIENT_ID ?? "",
    clientSecret: process.env.WITNESSOPS_KEYCLOAK_CLIENT_SECRET ?? "",
    callbackUrl: process.env.WITNESSOPS_KEYCLOAK_CALLBACK_URL ?? "",
  });
  if (settings.callback.origin !== app.origin || settings.callback.href !== `${app.origin}/auth/keycloak/callback`) {
    throw new Error("Keycloak callback must match the app origin.");
  }
  const keyring = process.env.WITNESSOPS_KEYCLOAK_TOKEN_KEYRING_FILE;
  if (!keyring) throw new Error("Keycloak session keyring is required.");
  const codec = loadKeycloakSessionCodec(keyring, { issuer: settings.issuer.href, clientId: settings.clientId });
  const configuration = await (discovered ??= discoverKeycloakOidc(settings).catch(error => {
    discovered = undefined;
    throw error;
  }));
  const repository = client
    ? new PostgresKeycloakSessionRepository(client, { callerTransaction: true })
    : new PostgresKeycloakSessionRepository(database());
  const store = new KeycloakSessionStore(repository, codec);
  return { settings, configuration, store, provider: keycloakSessionProvider(configuration, settings) };
}
