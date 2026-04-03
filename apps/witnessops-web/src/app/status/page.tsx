import { getSurfaceUrl } from "@witnessops/config";
import { permanentRedirect } from "next/navigation";

export default function StatusRedirectPage() {
  permanentRedirect(getSurfaceUrl("status"));
}
