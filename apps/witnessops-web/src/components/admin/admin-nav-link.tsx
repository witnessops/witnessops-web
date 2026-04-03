import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import styles from "./admin.module.css";

interface AdminNavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}

export function AdminNavLink({ href, label, icon: Icon, active }: AdminNavLinkProps) {
  return (
    <Link
      href={href}
      className={`${styles.navLink}${active ? ` ${styles.navLinkActive}` : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={14} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}
