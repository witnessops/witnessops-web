import { getSurfaceUrl } from "@public-surfaces/config";
import { permanentRedirect } from "next/navigation";

export default function StatusRedirectPage() {
  permanentRedirect(getSurfaceUrl("status"));
}
