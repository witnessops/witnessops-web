import {
  COMPANY_DETAILS,
  type CompanyDetailsLocale,
} from "@/lib/company-details";

export function CompanyDetails({
  locale,
  placement,
}: {
  locale: CompanyDetailsLocale;
  placement: "page" | "contact";
}) {
  const copy = COMPANY_DETAILS[locale];
  const lines = [
    copy.legalName,
    copy.address,
    copy.krs,
    copy.nip,
    copy.regon,
  ];
  const onPage = placement === "page";

  return (
    <section
      aria-label={copy.heading}
      data-company-details={placement}
      data-company-details-locale={locale}
      className={
        onPage
          ? "min-w-0 max-w-full"
          : "min-w-0 max-w-full border-t border-surface-border pt-4 text-text-muted"
      }
    >
      {onPage ? (
        <h1 className="text-2xl font-semibold leading-8 text-text-primary">
          {copy.heading}
        </h1>
      ) : (
        <h2 className="text-xs font-medium leading-5 text-text-muted">
          {copy.heading}
        </h2>
      )}
      <div
        className={
          onPage
            ? "mt-4 min-w-0 max-w-full space-y-2 text-sm leading-6 break-words text-text-secondary"
            : "mt-2 min-w-0 max-w-full space-y-1 text-xs leading-5 break-words"
        }
      >
        {lines.map((line) => (
          <p
            key={line}
            className="min-w-0 max-w-full break-words"
            {...(line === copy.krs ? { "data-company-registry": "" } : {})}
          >
            {line}
          </p>
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
    <div className="mx-auto w-full min-w-0 max-w-3xl px-6 pb-12">
      <CompanyDetails locale={locale} placement="contact" />
    </div>
  );
}
