"use client";

import { useState } from "react";

const plans = [
  { name: "Observe", label: "Start", monthly: 0, description: "Record one bounded hostname check and keep the snapshot you can inspect.", features: ["One bounded hostname check", "Keep the snapshot", "Inspect observations and unknowns", "7-day illustrative retention", "1 seat"] },
  { name: "Compare", label: "Comparison", monthly: 49, description: "Retest after a change. Keep before-and-after evidence and a portable pack.", features: ["Unlimited hostname checks", "Compare a later result", "Portable evidence pack", "12-month retention", "1 seat", "Named-review enquiry"] },
  { name: "Workspace", label: "Team", monthly: 149, description: "Seats, Linux import and a case workspace when more than one person inspects evidence.", features: ["Everything in Compare", "Linux import", "Case workspace", "3 seats", "Priority named-review intake", "24-month retention"] },
] as const;
const capabilities = [
  ["Hostname checks", "1", "Unlimited", "Unlimited"],
  ["Keep the snapshot", "Yes", "Yes", "Yes"],
  ["Compare a later result", "—", "Yes", "Yes"],
  ["Portable evidence pack", "—", "Yes", "Yes"],
  ["Linux import", "—", "—", "Yes"],
  ["Case workspace", "—", "—", "Yes"],
  ["Seats", "1", "1", "3"],
  ["Retention", "7 days", "12 months", "24 months"],
  ["Named-review intake", "Enquire", "Enquire", "Priority"],
];
const eyebrow = "text-xs uppercase tracking-[0.16em] text-text-muted";
const button = "min-h-11 rounded border border-surface-border-strong px-5 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";

export function AppPricing() {
  const [annual, setAnnual] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  return <>
    <section className="border-b border-surface-border py-12 lg:py-16" aria-labelledby="subscription-heading" aria-describedby="app-pricing-draft">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div><p className={eyebrow}>App access · Illustrative draft</p><h2 id="subscription-heading" className="mt-3 text-3xl font-medium">Subscription</h2></div>
        <div role="group" aria-label="Billing period" className="flex max-w-full flex-wrap gap-1 rounded border border-surface-border-strong p-1">
          <button type="button" aria-pressed={!annual} onClick={() => setAnnual(false)} className={`${button} text-text-primary border-transparent ${!annual ? "bg-surface-card" : ""}`}>Monthly</button>
          <button type="button" aria-pressed={annual} onClick={() => setAnnual(true)} className={`${button} text-text-primary border-transparent ${annual ? "bg-surface-card" : ""}`}>Annual · 2 months included</button>
        </div>
      </div>
      <p id="app-pricing-draft" className="mt-5 max-w-3xl text-sm leading-6 text-text-secondary">Proposed prices and capabilities for discussion, not current paid entitlements. Creating an account is free; workspace access currently requires an invitation.</p>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map(plan => <article key={plan.name} data-app-plan={plan.name} className={`flex min-w-0 flex-col gap-4 rounded-lg border p-6 lg:p-7 ${plan.name === "Compare" ? "border-brand-accent bg-surface-card/40" : "border-surface-border-strong"}`}>
          <p className={eyebrow}>{plan.label}</p><h3 className="text-[22px] font-medium">{plan.name}</h3>
          <p className="text-text-secondary"><strong className="text-[32px] font-medium tracking-tight text-text-primary">€{new Intl.NumberFormat("en-IE").format(plan.monthly * (annual ? 10 : 1))}</strong> <span className="text-sm">/ {annual ? "year" : "month"}</span></p>
          <p className="text-xs text-text-muted">excluding VAT · illustrative {annual ? "annual total" : "monthly price"}</p>
          <p className="text-sm leading-6 text-text-secondary">{plan.description}</p>
          <ul className="mb-2 space-y-2 text-sm leading-6 text-text-secondary">{plan.features.map(feature => <li key={feature} className="flex gap-3"><span aria-hidden="true" className="text-signal-green">✓</span><span>{feature}</span></li>)}</ul>
          <button type="button" aria-pressed={selected === plan.name} onClick={() => setSelected(plan.name)} className={`${button} mt-auto ${plan.name === "Compare" ? "border-brand-accent bg-brand-accent text-text-inverse" : "text-text-primary"}`}>Preview {plan.name}</button>
        </article>)}
      </div>
      <div role="status" aria-live="polite" className="mt-5 text-sm leading-6 text-text-secondary">{selected ? `${selected} selected for preview. No payment taken, account changed or check started.` : "Preview a plan to explore the draft. Selection applies only to this page."}</div>
      <a href="https://app.witnessops.com/signup" className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Create an account</a>
    </section>
    <section className="border-b border-surface-border py-12 lg:py-16" aria-labelledby="capabilities-heading">
      <p className={eyebrow}>Compare · Proposed capabilities</p><h2 id="capabilities-heading" className="mt-3 text-3xl font-medium">What each plan records</h2>
      <div role="region" aria-label="Plan capability comparison" tabIndex={0} className="mt-8 overflow-x-auto rounded-lg border border-surface-border-strong focus-visible:ring-2 focus-visible:ring-brand-accent">
        <table className="w-full min-w-[580px] text-left text-sm"><caption className="sr-only">Illustrative plan comparison, not current paid entitlements</caption><thead className="bg-surface-card"><tr>{["Capability", ...plans.map(p => p.name)].map(name => <th key={name} scope="col" className="px-5 py-5 font-medium">{name}</th>)}</tr></thead><tbody>{capabilities.map(([name, ...values]) => <tr key={name} className="border-t border-surface-border"><th scope="row" className="px-5 py-5 font-normal text-text-secondary">{name}</th>{values.map((value, i) => <td key={i} className="px-5 py-5 text-text-secondary">{value === "—" ? <span aria-label="Not included">—</span> : value}</td>)}</tr>)}</tbody></table>
      </div>
      <p className="mt-5 text-sm leading-6 text-text-muted">A plan does not authorise a scan or establish that a system is secure. Scope and permission remain specific to each check.</p>
    </section>
  </>;
}

export function PricingQuestions() {
  return <>
    <section className="grid gap-8 border-t border-surface-border py-12 md:grid-cols-2" aria-label="Plan scope">
      {[
        ["Included in the draft", "What a plan includes", ["Access to record a bounded check you authorise", "The snapshot, observations and unknowns", "Comparison on Compare and Workspace", "A portable pack preview on Compare and Workspace"]],
        ["Not included", "What a plan does not do", ["Authorise collection on its own", "Monitor continuously or certify a system", "Replace a penetration test", "Charge a live card in this preview"]],
      ].map(([label, title, items]) => <div key={String(title)}><p className={eyebrow}>{label}</p><h2 className="mt-3 text-2xl font-medium">{title}</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-text-secondary">{(items as string[]).map(item => <li key={item}>{item}</li>)}</ul></div>)}
    </section>
    <section className="border-t border-surface-border py-12" aria-labelledby="plan-start-heading">
      <h2 id="plan-start-heading" className={eyebrow}>How a plan starts</h2>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
        ["Choose access", "Explore Observe, Compare or Workspace. The annual draft includes two months."],
        ["Preview in this browser", "Selection is a page preview. Nothing is billed and no card is collected."],
        ["Create your account", "Create an account to sign in. Workspace access currently requires an invitation; creating an account does not start a check."],
        ["Escalate if needed", "A named review stays a separate, scoped engagement."],
      ].map(([title, body], i) => <li key={title} className="rounded-lg border border-surface-border p-5"><p className={eyebrow}>0{i + 1}</p><h3 className="mt-3 font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-text-secondary">{body}</p></li>)}</ol>
    </section>
    <section className="py-8" aria-labelledby="price-faq-heading"><p className={eyebrow}>Questions</p><h2 id="price-faq-heading" className="mt-3 text-3xl font-medium">Price FAQ</h2>
      <div className="mt-6">{[
        ["Is a payment taken in this draft?", "No. Previewing a plan changes only this page. Nothing is billed, no card is collected and no account entitlement changes. App prices and capabilities are illustrative."],
        ["What does Observe include?", "The draft proposes one bounded hostname check, a saved snapshot, observations and unknowns, one seat and seven-day retention. See Early Access for current availability."],
        ["What do I pay for on a subscription?", "The draft distinguishes comparison, retention, portable packs and team access. These are proposed plans, not a live subscription offer. Named reviews remain separately scoped."],
        ["Are named review fees public?", "Yes. The named reviews use the public catalogue fees, excluding VAT. Fit, scope, timing and evidence handling are confirmed before work begins."],
        ["Does a plan authorise a scan?", "No. Selecting a plan, asking for support or making a payment does not authorise testing. You must have authority for the specific target and agreed scope."],
        ["Can I change or cancel?", "You can change the preview selection on this page. There is no live subscription to cancel; live billing and cancellation terms are not established by this draft."],
        ["Monthly or annual?", "The illustrative annual price includes two months: Compare is €490 per year and Workspace is €1,490 per year, excluding VAT. The toggle displays the full annual total."],
      ].map(([question, answer]) => <details key={question} className="border-b border-surface-border"><summary className="cursor-pointer py-5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-brand-accent">{question}</summary><p className="max-w-3xl pb-5 text-sm leading-6 text-text-secondary">{answer}</p></details>)}</div>
    </section>
  </>;
}
