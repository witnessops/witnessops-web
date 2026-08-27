interface SectionShellProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  spacing?: "default" | "compact" | "spacious";
}

export function SectionShell({
  id,
  children,
  className,
  narrow,
  spacing = "default",
}: SectionShellProps) {
  const maxWidth = narrow ? "max-w-[720px]" : "max-w-[1200px]";
  const sectionSpacing =
    spacing === "compact"
      ? "py-8 sm:py-10"
      : spacing === "spacious"
        ? "py-16 sm:py-20 lg:py-24"
        : "py-10 sm:py-12";
  return (
    <section id={id} className={`relative ${sectionSpacing}${className ? ` ${className}` : ""}`}>
      <div className={`mx-auto ${maxWidth} px-6`}>{children}</div>
    </section>
  );
}
