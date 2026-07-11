"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, Settings, BookOpen, Users, Package, PlayCircle, Send, ReceiptText, Search, ClipboardList } from "lucide-react";
import { AdminNavLink } from "./admin-nav-link";
import styles from "./admin.module.css";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox },
  { href: "/admin/review-requests", label: "Review Requests", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/proof-runs", label: "Proof Runs", icon: PlayCircle },
  { href: "/admin/deliveries", label: "Deliveries", icon: Send },
  { href: "/admin/receipts", label: "Receipts", icon: ReceiptText },
  { href: "/admin/settings", label: "Settings / Health", icon: Settings },
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
        <form className={styles.adminGlobalSearch} action="/admin/search">
          <Search size={13} aria-hidden />
          <input name="q" placeholder="Search exact ID…" aria-label="Global admin search" />
        </form>
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
