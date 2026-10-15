import { PolishDocsFrame } from "./polish-docs-frame";

export default function PolishDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PolishDocsFrame>{children}</PolishDocsFrame>;
}
