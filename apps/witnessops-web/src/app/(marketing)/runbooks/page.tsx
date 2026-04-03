import { getSurfaceUrl } from "@witnessops/config";
import { permanentRedirect } from "next/navigation";

export default function RunbooksRedirectPage() {
  permanentRedirect(getSurfaceUrl("hub", "/runbooks"));
}
