import { notFound } from "next/navigation";

import { ProductApp } from "../../components/product-app";
import { isAasrStagingBuild } from "../../lib/aasr-staging/config";
import { appAuthMode } from "../../lib/auth-mode";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ view?: string[] }>;
};

export default async function Page({ params }: PageProps) {
  const { view = [] } = await params;
  if (view[0]?.toLowerCase() === "api") notFound();

  if (isAasrStagingBuild()) {
    const { AasrStagingEntry } = await import("../../components/aasr-staging-entry");
    return <AasrStagingEntry />;
  }
  return <ProductApp authProvider={appAuthMode()} keycloakLinkAvailable={appAuthMode() === "workos" && process.env.WITNESSOPS_KEYCLOAK_LINK_ENABLED === "1"} />;
}
