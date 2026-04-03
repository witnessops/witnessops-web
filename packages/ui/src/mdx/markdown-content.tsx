import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
  source: string;
  /** Base URL for rewriting relative non-docs links (e.g., "https://witnessops.com") */
  siteBaseUrl?: string;
}

function resolveHref(href: string | undefined, siteBaseUrl: string | undefined): string | undefined {
  if (!href || !siteBaseUrl) return href;
  if (!href.startsWith("/")) return href;
  if (href.startsWith("/docs/") || href === "/docs") return href;
  return `${siteBaseUrl.replace(/\/$/, "")}${href}`;
}

export function MarkdownContent({ source, siteBaseUrl }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-12 text-2xl font-semibold text-text-primary">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-8 text-xl font-semibold text-text-primary">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mt-4 leading-7 text-text-secondary">{children}</p>
        ),
        a: ({ children, href }) => (
          <a
            href={resolveHref(href, siteBaseUrl)}
            className="text-brand-accent underline decoration-brand-accent/40 underline-offset-4 hover:decoration-brand-accent"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="mt-4 list-inside list-disc space-y-2 text-text-secondary">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mt-4 list-inside list-decimal space-y-2 text-text-secondary">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mt-6 border-l-2 border-brand-accent/40 pl-4 text-text-muted">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-10 border-surface-border" />,
        table: ({ children }) => (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-surface-border text-text-muted">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-surface-border/60 text-text-secondary">
            {children}
          </tbody>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 font-medium">{children}</th>
        ),
        td: ({ children }) => <td className="px-4 py-3 align-top">{children}</td>,
        pre: ({ children }) => (
          <pre className="mt-6 overflow-x-auto rounded-lg border border-surface-border bg-surface-card p-4 text-sm text-text-secondary">
            {children}
          </pre>
        ),
        code: ({ children, className }) => {
          if (className) {
            return <code className={className}>{children}</code>;
          }

          return (
            <code className="rounded bg-surface-card px-1.5 py-0.5 font-mono text-sm text-text-primary">
              {children}
            </code>
          );
        },
      }}
    >
      {source}
    </ReactMarkdown>
  );
}
