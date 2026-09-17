"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { PublicNavigationLink as Link } from "./document-navigation";
import { PUBLIC_NAV_GROUPS } from "./public-nav-groups";
import styles from "./desktop-navbar-menu.module.css";

export function DesktopNavbarMenu() {
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const pathname = usePathname();
  useEffect(() => { setOpen(null); }, [pathname]);
  useEffect(() => {
    if (open === null) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      triggers.current[open]?.focus();
      setOpen(null);
    };
    const resize = () => { if (window.innerWidth < 1024) setOpen(null); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
    };
  }, [open]);
  return <div ref={root} className={styles.root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(null);
  }}>
    {PUBLIC_NAV_GROUPS.map((group, index) => <div key={group.label}>
      <button ref={node => { triggers.current[index] = node; }} type="button" className={styles.trigger}
        aria-expanded={open === index} aria-controls={`public-nav-group-${index}`}
        onClick={() => setOpen(open === index ? null : index)}
        onKeyDown={event => {
          if (event.key === "ArrowDown") {
            event.preventDefault(); setOpen(index);
            requestAnimationFrame(() => document.getElementById(`public-nav-group-${index}`)?.querySelector<HTMLAnchorElement>("a")?.focus());
          }
        }}>
        {group.label}<ChevronDown size={14} aria-hidden="true" />
      </button>
      <div id={`public-nav-group-${index}`} hidden={open !== index} className={styles.panel}>
        <div className={styles.intro}><p>{group.label}</p><h2>{group.description}</h2></div>
        <div className={styles.links}>{group.links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(null)} aria-current={pathname === link.href ? "page" : undefined}>
          <span>{link.label}<ArrowUpRight size={15} aria-hidden="true" /></span><p>{link.description}</p>
        </Link>)}</div>
        <div className={styles.bottom}><span>REPEATABLE. INDEPENDENT.</span><Link href="/docs/getting-started/cli" onClick={() => setOpen(null)}>CLI setup</Link><Link href="https://app.witnessops.com/login" onClick={() => setOpen(null)}>Log in<ArrowUpRight size={13} aria-hidden="true" /></Link></div>
      </div>
    </div>)}
    <Link className={styles.trigger} href="/pricing">Pricing</Link>
  </div>;
}
