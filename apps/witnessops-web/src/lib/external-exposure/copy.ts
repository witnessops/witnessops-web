import {
  EXPOSURE_SNAPSHOT_CONTACT_EMAIL,
  EXPOSURE_SNAPSHOT_MAILTO,
  EXPOSURE_SNAPSHOT_REVIEW,
  EXPOSURE_SNAPSHOT_SAMPLE_PLACEHOLDER,
} from "./catalog";

export const exposureSnapshotCopy = {
  eyebrow: "External Exposure Snapshot",
  title:
    "See what your public edge exposes — before your customers' security team does.",
  lede:
    "A free, passive, outside-in snapshot of one internet-facing system. No credentials, no exploitation, no pen test.",
  onePage: "One page, manually checked.",
  whatYouGetTitle: "What you get",
  glance:
    "Your public attack-surface at a glance: domains, hostnames, TLS, exposed services we can see from the outside.",
  observations: "Up to 3 manually-validated observations",
  observationsRest: "each with the public evidence we used.",
  notThis:
    "What it is NOT: not a vulnerability scan dump, not a guarantee, not a compliance claim.",
  howTitle: "How it works",
  steps: [
    "You give us one domain you own and a short, non-secret description.",
    "We run passive discovery on public data only.",
  ],
  enquiry: "An enquiry is not authorisation to test.",
  turnaround: "2 business days",
  whereTitle: "Where it leads",
  whereBefore:
    "If the Snapshot shows something worth a proper look, the",
  whereScope: "covers one authorised public-facing system. You receive:",
  whereAfter:
    "Scope, exclusions, price and authority are agreed in writing before any active check.",
  proofTitle: "Proof",
  proof:
    "We run this on our own infrastructure first.",
  sample: EXPOSURE_SNAPSHOT_SAMPLE_PLACEHOLDER,
  cta: "Request your free Snapshot",
  email: EXPOSURE_SNAPSHOT_CONTACT_EMAIL,
  mailto: EXPOSURE_SNAPSHOT_MAILTO,
  review: EXPOSURE_SNAPSHOT_REVIEW,
} as const;
