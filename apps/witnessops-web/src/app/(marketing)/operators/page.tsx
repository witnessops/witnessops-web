import { getSurfaceUrl } from "@witnessops/config";
import { permanentRedirect } from "next/navigation";

export default function OperatorsRedirectPage() {
  permanentRedirect(getSurfaceUrl("hub"));
}
