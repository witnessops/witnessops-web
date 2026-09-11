import { headers } from "next/headers";
import { localAppEnabled } from "../../lib/server";
import { ProductApp } from "../../components/product-app";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!localAppEnabled((await headers()).get("host"))) return <main className="locked"><h1>WitnessOps app foundation</h1><p>This product surface is available only through the explicitly enabled local development session. Customer authentication and production deployment are not configured.</p></main>;
  return <ProductApp />;
}
