import {
  COMPANY_DETAILS,
  type CompanyDetailsLocale,
} from "@/lib/company-details";

export function CompanyDetails({
  locale,
  placement,
}: {
  locale: CompanyDetailsLocale;
  placement: "footer" | "contact";
}) {
  const copy = COMPANY_DETAILS[locale];
  const lines = [
    copy.legalName,
    copy.address,
    copy.krs,
    copy.nip,
    copy.regon,
  ];

  return (
    <section
      aria-label={copy.heading}
      data-company-details={placement}
      data-company-details-locale={locale}
      className={
        placement === "footer"
          ? "mt-5 max-w-3xl border-t border-surface-border pt-4"
          : "max-w-3xl border-t border-surface-border pt-6"
      }
    >
      <h2 className="text-sm font-semibold leading-5 text-text-primary">
        {copy.heading}
      </h2>
      <div className="mt-2 space-y-1 text-xs leading-5 text-text-secondary">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export function ContactCompanyDetails({
  locale,
}: {
  locale: CompanyDetailsLocale;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-16">
      <CompanyDetails locale={locale} placement="contact" />
    </div>
  );
}
