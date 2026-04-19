import { permanentRedirect } from "next/navigation";

export default function ContactRedirectPage() {
  permanentRedirect("/review/request");
}
