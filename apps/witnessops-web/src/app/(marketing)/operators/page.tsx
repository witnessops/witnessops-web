import { getSurfaceUrl } from "@public-surfaces/config";
import { permanentRedirect } from "next/navigation";

export default function OperatorsRedirectPage() {
  permanentRedirect(getSurfaceUrl("hub"));
}
