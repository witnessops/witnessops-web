import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs Assistant Disabled | WitnessOps",
  robots: { index: false, follow: false },
};

export default function DocsAssistantDisabledPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-20 text-slate-950">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
        Disabled skeleton
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        WitnessOps Docs Assistant is not enabled yet.
      </h1>
      <p className="mt-6 text-lg leading-8 text-slate-700">
        This page is a disabled skeleton. It does not answer questions,
        retrieve sources, call a model, verify proof bundles, or inspect
        customer data.
      </p>
      <p className="mt-6 text-base leading-7 text-slate-700">
        For published receipt checks, use the {" "}
        <Link className="font-semibold underline underline-offset-4" href="/verify">
          /verify
        </Link>{" "}
        path.
      </p>
    </main>
  );
}
