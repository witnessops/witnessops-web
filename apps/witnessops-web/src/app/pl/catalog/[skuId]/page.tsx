import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyerServiceDetail } from "@/components/marketing/buyer-service-detail";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { CtaButton } from "@/components/shared/cta-button";
import { buyerServiceByProductId } from "@/lib/buyer-services";
import { POLISH_NO_SECRETS_NOTE, POLISH_OFFERS, polishOfferRequestHref, type CanonicalOffsecProductId } from "@/lib/public-i18n";
import { getSku, resolveSkuId } from "@witnessops/catalog";

type PageProps = { params: Promise<{ skuId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = resolveSkuId((await params).skuId);
  if (!resolved || !(resolved in POLISH_OFFERS)) return { title: "Nie znaleziono oferty" };
  const id = resolved as CanonicalOffsecProductId;
  const copy = POLISH_OFFERS[id];
  const buyerService = buyerServiceByProductId(id);
  return { title: buyerService?.name.pl ?? copy.name, description: buyerService?.situation.pl ?? copy.situation, alternates: { canonical: `/pl/catalog/${id.toLowerCase()}`, languages: { en: `/catalog/${id.toLowerCase()}`, pl: `/pl/catalog/${id.toLowerCase()}`, "x-default": `/catalog/${id.toLowerCase()}` } } };
}

function Section({ title, children, buyer = false }: { title: string; children: React.ReactNode; buyer?: boolean }) {
  return <section className={buyer ? "" : "mb-8"}><h2 className={buyer ? "text-xl font-semibold text-text-primary" : "text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"}>{title}</h2><div className="mt-3 text-sm leading-7 text-text-secondary">{children}</div></section>;
}

export default async function PolishOfferPage({ params }: PageProps) {
  const id = resolveSkuId((await params).skuId) as CanonicalOffsecProductId | null;
  if (!id || !(id in POLISH_OFFERS)) notFound();
  const sku = getSku(id);
  if (!sku) notFound();
  const copy = POLISH_OFFERS[id];
  const buyerService = buyerServiceByProductId(id);
  if (buyerService) {
    return (
      <BuyerServiceDetail
        locale="pl"
        service={buyerService}
        technicalId={id}
        requestHref={polishOfferRequestHref(id)}
      >
        <div className="grid gap-9 lg:grid-cols-2 lg:gap-12">
          <Section title="Co robi WitnessOps" buyer>
            <ol className="space-y-3">
              {copy.process.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="font-semibold text-brand-accent">{index + 1}.</span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="Co otrzymasz" buyer>
            <ul className="grid gap-3">
              {copy.deliverables.map((item) => (
                <li key={item} className="border border-surface-border bg-surface-card/40 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Co musisz dostarczyć" buyer>
            <ul className="space-y-3">
              {copy.inputs.map((item) => <li key={item}>— {item}</li>)}
            </ul>
            <p className="mt-4 font-semibold text-text-primary">{POLISH_NO_SECRETS_NOTE}</p>
          </Section>
          <div className="grid gap-8">
            <Section title="Czego oferta nie obejmuje" buyer>
              <ul className="space-y-3">
                {copy.exclusions.map((item) => <li key={item}>— {item}</li>)}
              </ul>
            </Section>
            <Section title="Jak zweryfikować wynik" buyer>
              <p>{copy.verification}</p>
            </Section>
          </div>
        </div>
      </BuyerServiceDetail>
    );
  }
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
      <Link href="/pl/catalog" className="text-xs uppercase tracking-wider text-brand-accent hover:underline">← Wróć do ofert</Link>
      <header className="mt-4 border-b border-surface-border pb-8"><h1 className="text-3xl font-semibold text-text-primary">{copy.name}</h1><p className="mt-4 text-sm leading-7 text-text-secondary">{copy.situation}</p></header>
      <div className="mt-8">
        <Section title="Sytuacja"><p>{copy.situation}</p></Section>
        <Section title="Rezultat"><p>{copy.result}</p></Section>
        <Section title="Co robi WitnessOps"><ol className="space-y-2">{copy.process.map((item, i) => <li key={item}><span className="mr-2 text-brand-accent">{i + 1}.</span>{item}</li>)}</ol></Section>
        <Section title="Co otrzymasz"><ul className="space-y-2">{copy.deliverables.map((item) => <li key={item}>— {item}</li>)}</ul></Section>
        <Section title="Co musisz dostarczyć"><ul className="space-y-2">{copy.inputs.map((item) => <li key={item}>— {item}</li>)}</ul><p className="mt-4 font-semibold text-text-primary">{POLISH_NO_SECRETS_NOTE}</p></Section>
        <Section title="Termin"><p>{copy.timing}</p></Section>
        <Section title="Cena"><p>{copy.price}</p>{copy.priceDetail ? <p>{copy.priceDetail}</p> : null}</Section>
        <Section title="Czego oferta nie obejmuje"><ul className="space-y-2">{copy.exclusions.map((item) => <li key={item}>— {item}</li>)}</ul></Section>
        <Section title="Jak zweryfikować wynik"><p>{copy.verification}</p></Section>
      </div>
      <section className="border border-surface-border bg-surface-card/30 p-5"><h2 className="font-semibold text-text-primary">Rozpocznij przegląd</h2><p className="mt-2 text-sm leading-6 text-text-muted">Najpierw sprawdzimy, czy oferta odpowiada Twojej sytuacji, a następnie uzgodnimy zakres, upoważnienie, cenę, termin oraz sposób postępowania z materiałami.</p><div className="mt-5"><CtaButton href={polishOfferRequestHref(id)} variant="primary" label="Rozpocznij przegląd" /></div></section>
      <div className="mt-10"><PublicContactRoute /></div>
    </main>
  );
}
