import Link from "next/link";

interface PageAnswerLink {
  href: string;
  label: string;
}

interface PageAnswerProps {
  question: string;
  links: PageAnswerLink[];
}

export function PageAnswer({ question, links }: PageAnswerProps) {
  return (
    <section className="callout callout-trust kb-page-answer" aria-label="This page answers">
      <div className="kb-page-answer-label">This Page Answers</div>
      <p>{question}</p>
      <nav className="kb-related kb-page-links" aria-label="Related pages">
        {links.map((link) => (
          <Link key={`${link.href}:${link.label}`} href={link.href} className="kb-related-link">
            {link.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}

export default PageAnswer;
