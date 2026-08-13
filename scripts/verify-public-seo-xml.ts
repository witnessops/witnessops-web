const XML_ENTITIES: ReadonlyArray<readonly [string, string]> = [
  ["&quot;", '"'],
  ["&apos;", "'"],
  ["&lt;", "<"],
  ["&gt;", ">"],
  // Decode ampersands last so an encoded entity such as &amp;quot; is decoded
  // once to &quot;, rather than recursively becoming a quote.
  ["&amp;", "&"],
];

export function decodeXmlText(value: string) {
  return XML_ENTITIES.reduce(
    (decoded, [entity, character]) => decoded.replaceAll(entity, character),
    value,
  );
}
