import {
  offerRevisionFields,
  type OfferRevisionSnapshot,
} from "@/lib/offer-revision-snapshot";

export function OfferRevisionDetails({
  submission,
  className,
  labelClassName,
}: {
  submission: { intent?: string | null; offerSnapshot?: OfferRevisionSnapshot };
  className?: string;
  labelClassName?: string;
}) {
  const fields = offerRevisionFields(submission);
  if (fields.length === 0) return null;
  return (
    <details data-testid="offer-revision-details">
      <summary>Offer at enquiry: {submission.offerSnapshot?.scopeRevision ?? "unversioned"}</summary>
      <div className={className}>
        {fields.map(({ label, value }) => (
          <span key={label}>
            <span className={labelClassName}>{label}</span>
            {value}
          </span>
        ))}
      </div>
    </details>
  );
}
