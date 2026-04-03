"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, Settings, BarChart3, BookOpen } from "lucide-react";
import { AdminNavLink } from "./admin-nav-link";
import styles from "./admin.module.css";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/queue", label: "Queue", icon: Inbox },
  { href: "/admin/system", label: "System", icon: Settings },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.sidebar} aria-label="Admin navigation">
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>
          <span className={styles.sidebarGlyph}>&#x2B21;</span> Admin
        </span>
      </div>
      <div className={styles.sidebarNav}>
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <AdminNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
            />
          );
        })}
      </div>
      <div className={styles.sidebarFooter}>
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sidebarExternalLink}
        >
          <BookOpen size={14} aria-hidden />
          <span>Knowledge Base</span>
        </a>
      </div>
    </nav>
  );
}
