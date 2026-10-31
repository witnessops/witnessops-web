import "server-only";
import { notFound, redirect } from "next/navigation";
import { logout } from "../app/actions/logout";
import { authenticatedWebSession } from "../lib/auth";
import { ApiError } from "../lib/errors";
import { aasrFixtureAssignmentReady } from "../lib/aasr-fixture/assignment";
import { isAasrStagingBuild, stagingRuntimeReady } from "../lib/aasr-staging/config";
import { AasrFixtureApp } from "./aasr-fixture";
import { AasrStagingWelcome } from "./aasr-staging-welcome";

const sessionActions = <form action={logout} className="header-signout"><button className="text-button" aria-label="Sign out of WitnessOps">Sign out</button></form>;

/** Only the compiled staging profile enters this native-authenticated shell. */
export async function AasrStagingEntry({ openFixture = false }: { openFixture?: boolean }) {
  if (!isAasrStagingBuild() || !stagingRuntimeReady()) notFound();
  let web;
  try { web = await authenticatedWebSession(); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    return <AasrStagingWelcome signedIn={false} sessionRejected sessionActions={sessionActions} />;
  }
  if (!web) return <AasrStagingWelcome signedIn={false} />;
  if (!await aasrFixtureAssignmentReady(web)) return <AasrStagingWelcome signedIn sessionActions={sessionActions} />;
  if (!openFixture) redirect("/aasr-fixture");
  return <AasrFixtureApp staging sessionActions={sessionActions} />;
}
