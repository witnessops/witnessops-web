export const DOCUMENT_LANGUAGE_HEADER = "x-witnessops-document-language";

export type DocumentLanguage = "en" | "pl";

export function documentLanguageForPathname(pathname: string): DocumentLanguage {
  return pathname === "/pl" || pathname.startsWith("/pl/") ? "pl" : "en";
}

export function parseDocumentLanguage(value: string | null): DocumentLanguage {
  return value === "pl" ? "pl" : "en";
}
