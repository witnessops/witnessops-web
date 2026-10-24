import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./admin.module.css";

interface AdminNavLinkProps {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
  trailing?: ReactNode;
}

export function AdminNavLink({ href, label, icon: Icon, active, onClick, trailing }: AdminNavLinkProps) {
  return (
    <Link
      href={href}
      className={`${styles.navLink}${active ? ` ${styles.navLinkActive}` : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <Icon size={14} aria-hidden />
      <span>{label}</span>
      {trailing}
    </Link>
  );
}
