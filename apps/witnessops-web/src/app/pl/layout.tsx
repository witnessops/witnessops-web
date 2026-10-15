export default function PolishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="pl-copy-review border-b border-[var(--line)] bg-[var(--paper-2)] py-2 text-center text-[var(--ink-dim)]">
        PL copy pending native review
      </p>
      {children}
    </>
  );
}
