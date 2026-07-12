import { PolishLocaleBoundary } from "@/components/shared/polish-locale-boundary";

export default function PolishLayout({ children }: { children: React.ReactNode }) {
  return <PolishLocaleBoundary>{children}</PolishLocaleBoundary>;
}
