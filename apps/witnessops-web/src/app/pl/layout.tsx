export default function PolishLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="border-b border-[var(--line)] bg-[var(--paper-2)] px-5 py-2 text-center text-[12px] text-[var(--ink-dim)]">
        PL copy pending native review
      </p>
      {children}
    </>
  );
}
