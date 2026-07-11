"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Inbox, Settings, BookOpen, Users, Package, PlayCircle, Send, ReceiptText, Search, ClipboardList } from "lucide-react";
import { AdminNavLink } from "./admin-nav-link";
import { AdminWizSidebarIdentity } from "./admin-wiz-brief";
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

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className={`${styles.sidebar}${mobileOpen ? ` ${styles.sidebarOpen}` : ""}`} aria-label="Admin navigation">
      <div className={styles.sidebarHeader}>
        <a href="/admin" className={styles.sidebarBrand} aria-label="WitnessOps Admin Console">
          <Image src="/brand/witnessops-mark-white.svg" alt="WitnessOps" width={28} height={20} priority />
          <span>WITNESSOPS <small>HQ</small></span>
        </a>
      </div>
      <AdminWizSidebarIdentity />
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
              onClick={onClose}
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
