import Link from "next/link";

export function AskAiDisclosure({ model, className }: { model?: string; className?: string }) {
  return (
    <details className={className ?? "mt-2 text-xs leading-relaxed text-text-muted"}>
      <summary className="inline-flex min-h-8 cursor-pointer items-center underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
        About this AI
      </summary>
      <p className="mt-1">
        Uses public WitnessOps material. AI can make mistakes; a person confirms fit and scope.
        {model ? ` Model: ${model}.` : ""}
      </p>
      <p className="mt-1">
        Eligible questions and recent conversation are sent to OpenAI with <code>store: false</code>;
        provider retention may still apply. This tab remembers up to three exchanges until you
        start over or reload. No transcript is saved by WitnessOps unless you choose to share
        a request with a person. <Link href="/privacy" className="underline underline-offset-4">Privacy</Link>
      </p>
      <p className="mt-1">We count feature use without recording questions or email addresses in analytics.</p>
      <p className="mt-1">Do not paste secrets, logs, credentials, private keys, MFA codes, screenshots, customer evidence, or raw exports.</p>
    </details>
  );
}
