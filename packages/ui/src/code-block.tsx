export type CodeBlockProps = {
  lines: string[];
  showLineNumbers?: boolean;
  className?: string;
};

export function CodeBlock({
  lines,
  showLineNumbers = false,
  className = "",
}: CodeBlockProps) {
  return (
    <pre
      className={`overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0a0e17] p-5 font-mono text-sm leading-6 shadow-lg ${className}`}
    >
      <code>
        {lines.map((line, i) => (
          <div key={i} className="flex">
            {showLineNumbers && (
              <span className="inline-block min-w-[2.5rem] select-none pr-5 text-right text-white/20 tabular-nums">
                {i + 1}
              </span>
            )}
            <span className="text-white/80">{line}</span>
          </div>
        ))}
      </code>
    </pre>
  );
}
