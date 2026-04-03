function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const CHECKMARK = "\u2713";
export const CROSS_MARK = "\u2717";
export const PROOF_MARK = "\u03C6";

export const VERIFIED_LABEL = "Verified";
export const UNVERIFIED_LABEL = "Unverified";

export function getProofStatusLabel(verified: boolean) {
  return verified ? VERIFIED_LABEL : UNVERIFIED_LABEL;
}

export function formatVerifiedLine(label = "verified") {
  return `${PROOF_MARK} ${label}`;
}

export function isVerifiedLine(line: string) {
  return line.startsWith(`${PROOF_MARK} `);
}

type ProofStatusBadgeProps = {
  verified: boolean;
  size?: "sm" | "md";
  className?: string;
};

export function ProofStatusBadge({
  verified,
  size = "sm",
  className,
}: ProofStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        verified
          ? "bg-signal-green/20 text-signal-green"
          : "bg-signal-amber/20 text-signal-amber",
        className,
      )}
    >
      {getProofStatusLabel(verified)}
    </span>
  );
}