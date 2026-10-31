export interface AasrBuildProfile {
  readonly profile: string;
  readonly origin: string;
  readonly workosClientId: string;
  readonly databaseSha256: string;
}
export function aasrBuildProfile(env?: Record<string, string | undefined>): AasrBuildProfile;
export function stagingDatabaseTargetDigest(connection: string): string;
export function validStagingOrigin(origin: string): boolean;
