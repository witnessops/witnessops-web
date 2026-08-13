import { permanentRedirect } from "next/navigation";

export default function AccessChangeProofRunRedirectPage() {
  permanentRedirect("/catalog/workflows");
}
