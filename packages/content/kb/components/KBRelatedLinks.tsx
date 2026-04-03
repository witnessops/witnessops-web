import Link from "next/link";
import styles from "./kb-components.module.css";

export function KBRelatedLinks({
  links,
}: {
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div className={styles.related}>
      {links.map((link) =>
        link.external ? (
          <a
            key={link.href}
            href={link.href}
            className={styles.relatedLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            &#8599; {link.label}
          </a>
        ) : (
          <Link key={link.href} href={link.href} className={styles.relatedLink}>
            &rarr; {link.label}
          </Link>
        ),
      )}
    </div>
  );
}
