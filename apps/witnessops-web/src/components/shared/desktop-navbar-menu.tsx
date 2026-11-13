"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { PublicNavigationLink as Link } from "./document-navigation";
import type { PublicNavGroup } from "./public-nav-groups";
import styles from "./desktop-navbar-menu.module.css";

type DesktopNavbarMenuProps = {
  groups: readonly PublicNavGroup[];
  currentPath: string;
};

export function DesktopNavbarMenu({ groups, currentPath }: DesktopNavbarMenuProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusFrameRef = useRef<number | null>(null);
  const previousPathRef = useRef(currentPath);

  useEffect(() => {
    if (previousPathRef.current !== currentPath) setOpenId(null);
    previousPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => () => {
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
  }, []);

  useEffect(() => {
    if (openId === null) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpenId(null);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      triggerRefs.current[openId]?.focus();
      setOpenId(null);
    };
    const closeOnMobile = () => {
      if (window.innerWidth < 1024) setOpenId(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    window.addEventListener("resize", closeOnMobile);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
      window.removeEventListener("resize", closeOnMobile);
    };
  }, [openId]);

  function focusFirstLink(id: string) {
    setOpenId(id);
    if (focusFrameRef.current !== null) cancelAnimationFrame(focusFrameRef.current);
    focusFrameRef.current = requestAnimationFrame(() => {
      focusFrameRef.current = null;
      document.getElementById(`public-nav-group-${id}`)?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
    });
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpenId(null);
      }}
    >
      {groups.map((group) => {
        const open = openId === group.id;
        const panelId = `public-nav-group-${group.id}`;
        const triggerId = `${panelId}-trigger`;
        const containsCurrentPage = group.links.some((link) => link.href.split("?")[0] === currentPath);
        return (
          <div key={group.id}>
            <button
              ref={(node) => { triggerRefs.current[group.id] = node; }}
              id={triggerId}
              type="button"
              className={styles.trigger}
              aria-expanded={open}
              aria-controls={panelId}
              data-current-group={containsCurrentPage || undefined}
              onClick={() => setOpenId((current) => current === group.id ? null : group.id)}
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown") return;
                event.preventDefault();
                focusFirstLink(group.id);
              }}
            >
              {group.label}<ChevronDown aria-hidden="true" size={14} />
            </button>
            <section
              id={panelId}
              className={styles.panel}
              hidden={!open}
              aria-labelledby={triggerId}
            >
              <div className={styles.intro}>
                <p>{group.label}</p>
                <h2>{group.description}</h2>
              </div>
              <div className={styles.links}>
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={false}
                    className={styles.link}
                    aria-current={currentPath === link.href.split("?")[0] ? "page" : undefined}
                    onClick={() => setOpenId(null)}
                  >
                    <span className={styles.linkTitle}>{link.label}<ArrowUpRight aria-hidden="true" size={15} /></span>
                    <span className={styles.linkDescription}>{link.description}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}
