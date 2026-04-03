interface SectionShellProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

export function SectionShell({ id, children, className, narrow }: SectionShellProps) {
  const maxWidth = narrow ? "max-w-[720px]" : "max-w-[1200px]";
  return (
    <section id={id} className={`relative py-20 sm:py-24${className ? ` ${className}` : ""}`}>
      <div className={`mx-auto ${maxWidth} px-6`}>{children}</div>
    </section>
  );
}
