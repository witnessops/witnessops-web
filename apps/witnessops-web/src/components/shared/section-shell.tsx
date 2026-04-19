interface SectionShellProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
  spacing?: "default" | "compact";
}

export function SectionShell({
  id,
  children,
  className,
  narrow,
  spacing = "default",
}: SectionShellProps) {
  const maxWidth = narrow ? "max-w-[720px]" : "max-w-[1200px]";
  const sectionSpacing = spacing === "compact" ? "py-8 sm:py-10" : "py-10 sm:py-12";
  return (
    <section id={id} className={`relative ${sectionSpacing}${className ? ` ${className}` : ""}`}>
      <div className={`mx-auto ${maxWidth} px-6`}>{children}</div>
    </section>
  );
}
