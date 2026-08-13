import { permanentRedirect } from "next/navigation";

export default function CatalogOffsecRedirectPage() {
  permanentRedirect("/catalog");
}
