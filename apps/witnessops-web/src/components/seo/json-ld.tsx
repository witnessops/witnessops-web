type JsonLdValue = Record<string, unknown> | readonly Record<string, unknown>[];

export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function JsonLd({ id, value }: { id: string; value: JsonLdValue }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(value) }}
    />
  );
}
