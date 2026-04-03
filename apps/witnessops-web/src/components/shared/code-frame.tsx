interface CodeFrameProps {
  language?: string;
  lines: string[];
  title?: string;
  variant?: "code" | "terminal";
}

export function CodeFrame({
  language,
  lines,
  title,
  variant: explicitVariant,
}: CodeFrameProps) {
  const variant =
    explicitVariant ??
    (language === "bash" || language === "shell" ? "terminal" : "code");

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0e17] shadow-2xl shadow-black/40">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        {title && (
          <span className="text-xs font-medium text-white/40">{title}</span>
        )}
        {/* Spacer to balance the traffic lights */}
        <div className="w-[52px]" />
      </div>

      {/* Body */}
      <div className="overflow-x-auto px-5 py-4">
        {variant === "terminal" ? (
          <div className="space-y-0.5 font-mono text-sm leading-6">
            {lines.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap">
                {line.startsWith("$") ? (
                  <>
                    <span className="select-none text-brand-accent/60">$ </span>
                    <span className="text-white/90">{line.slice(2)}</span>
                  </>
                ) : line === "" ? (
                  <span>&nbsp;</span>
                ) : line.includes("PASS") ||
                  line.includes("MATCH") ||
                  line.includes("VALID") ||
                  line.includes("COMPLETE") ||
                  line.includes("verified") ? (
                  <span className="text-brand-accent">{line}</span>
                ) : line.includes("FAIL") || line.includes("ERROR") ? (
                  <span className="text-signal-red">{line}</span>
                ) : (
                  <span className="text-white/70">{line}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <pre className="font-mono text-sm leading-6">
            <code data-language={language}>
              {lines.map((line, i) => (
                <span key={i} className="table-row">
                  <span className="table-cell select-none pr-5 text-right text-white/20 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="table-cell whitespace-pre-wrap text-white/80">
                    {colorizeJson(line)}
                  </span>
                  {"\n"}
                </span>
              ))}
            </code>
          </pre>
        )}
      </div>
    </div>
  );
}

/** Lightweight JSON syntax coloring — no external deps, preserves all punctuation */
function colorizeJson(line: string): React.ReactNode {
  const tokens: React.ReactNode[] = [];
  const re = /("[\w_-]+")\s*:|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\btrue\b|\bfalse\b|\bnull\b)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      tokens.push(
        <span key={`p${last}`} className="text-white/40">
          {line.slice(last, match.index)}
        </span>,
      );
    }

    if (match[1]) {
      tokens.push(
        <span key={`k${match.index}`} className="text-brand-accent/90">
          {match[1]}
        </span>,
      );
      tokens.push(
        <span key={`c${match.index}`} className="text-white/40">
          :
        </span>,
      );
    } else if (match[2]) {
      tokens.push(
        <span key={`s${match.index}`} className="text-[#a8c7fa]">
          {match[2]}
        </span>,
      );
    } else if (match[3]) {
      tokens.push(
        <span key={`n${match.index}`} className="text-[#f2b866]">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      tokens.push(
        <span key={`b${match.index}`} className="text-[#c792ea]">
          {match[4]}
        </span>,
      );
    }

    last = re.lastIndex;
  }

  if (last < line.length) {
    tokens.push(
      <span key={`t${last}`} className="text-white/40">
        {line.slice(last)}
      </span>,
    );
  }

  return tokens.length > 0 ? tokens : <span className="text-white/40">{line}</span>;
}
