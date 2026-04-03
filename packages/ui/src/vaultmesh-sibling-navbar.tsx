"use client";

import { useEffect, useState } from "react";
import { getWitnessOpsSiblingNavContract } from "../../config/src/surfaces";

type Announcement = {
  enabled: boolean;
  text: string;
  href: string;
};

type VaultMeshSiblingNavSurfaceId =
  | "vaultmesh"
  | "verify"
  | "attest"
  | "hub"
  | "status";

type VaultMeshSiblingNavLink = {
  label: string;
  href: string;
  matchPrefixes?: string[];
};

type VaultMeshSiblingNavCta = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | "ghost";
  matchPrefixes?: string[];
};

export type VaultMeshSiblingNavbarProps = {
  surfaceId: VaultMeshSiblingNavSurfaceId;
  links: VaultMeshSiblingNavLink[];
  cta?: VaultMeshSiblingNavCta | null;
  announcement?: Announcement;
  ctaStyle?: "standard" | "compact";
  logoAriaLabel?: string;
  logoTitle?: string;
};

export type WitnessOpsSiblingNavbarProps = {
  announcement?: Announcement;
  ctaStyle?: "standard" | "compact";
  logoAriaLabel?: string;
  logoTitle?: string;
};

function isAbsoluteHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function matchesPrefix(pathname: string, prefix: string) {
  if (prefix === "/") {
    return pathname === "/";
  }

  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPathActive(pathname: string, item: VaultMeshSiblingNavLink | VaultMeshSiblingNavCta) {
  if (item.matchPrefixes?.length) {
    return item.matchPrefixes.some((prefix) => matchesPrefix(pathname, prefix));
  }

  if (isAbsoluteHref(item.href)) {
    return false;
  }

  return matchesPrefix(pathname, item.href);
}

function NavItem({
  href,
  children,
  className,
  ariaCurrent,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaCurrent?: "page";
  onClick?: () => void;
}) {
  return (
    <a href={href} className={className} aria-current={ariaCurrent} onClick={onClick}>
      {children}
    </a>
  );
}

export function VaultMeshSiblingNavbar({
  surfaceId,
  links,
  cta = null,
  announcement = { enabled: false, text: "", href: "/" },
  ctaStyle = "standard",
  logoAriaLabel = "VaultMesh home",
  logoTitle = "VaultMesh verification network",
}: VaultMeshSiblingNavbarProps) {
  const [pathname, setPathname] = useState("/");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = `vaultmesh-mobile-menu-${surfaceId}`;

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const ctaActive = cta ? isPathActive(pathname, cta) : false;
  const desktopCtaClass =
    ctaStyle === "compact"
      ? "vm-nav-cta-compact"
      : cta?.variant === "primary"
        ? "vm-btn vm-btn-primary vm-nav-cta"
        : "vm-btn vm-btn-ghost vm-nav-cta";
  const mobileCtaClass =
    cta?.variant === "primary"
      ? "vm-btn vm-btn-primary vm-nav-mobile-cta"
      : "vm-btn vm-btn-ghost vm-nav-mobile-cta";

  return (
    <>
      {announcement.enabled && (
        <div className="vm-announcement">
          <div className="vm-frame">
            <a href={announcement.href} className="vm-announcement-link">
              <span>{announcement.text}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      )}
      <nav className="vm-nav">
        <div className="vm-nav-inner">
          <a
            href="/"
            className="vm-nav-logo"
            aria-label={logoAriaLabel}
            title={logoTitle}
            onClick={closeMenu}
          >
            <span className="vm-phi vm-motion-target" aria-hidden="true">
              &phi;
            </span>
            <span className="vm-nav-insignia" aria-hidden="true">
              01
            </span>
          </a>

          <div className="vm-nav-rail">
            <ul id={menuId} className={`vm-nav-links ${menuOpen ? "open" : ""}`}>
              {links.map((link) => {
                const active = isPathActive(pathname, link);
                return (
                  <li key={`${link.label}:${link.href}`}>
                    <NavItem
                      href={link.href}
                      ariaCurrent={active ? "page" : undefined}
                      className={active ? "active" : undefined}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </NavItem>
                  </li>
                );
              })}
              {cta && (
                <li className="vm-nav-contact-mobile">
                  <NavItem
                    href={cta.href}
                    className={ctaActive ? `${mobileCtaClass} active` : mobileCtaClass}
                    ariaCurrent={ctaActive ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    {cta.label}
                  </NavItem>
                </li>
              )}
            </ul>
            {cta && (
              <NavItem
                href={cta.href}
                className={ctaActive ? `${desktopCtaClass} active` : desktopCtaClass}
                ariaCurrent={ctaActive ? "page" : undefined}
              >
                {ctaStyle === "compact" ? cta.label.toUpperCase() : cta.label}
                {ctaStyle === "compact" && cta.variant === "primary" && (
                  <span aria-hidden="true">&nbsp;&rarr;</span>
                )}
              </NavItem>
            )}
            <button
              type="button"
              className="vm-hamburger"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

export function WitnessOpsSiblingNavbar({
  announcement = { enabled: false, text: "", href: "/" },
  ctaStyle = "standard",
  logoAriaLabel = "WitnessOps home",
  logoTitle = "WitnessOps governed security operations",
}: WitnessOpsSiblingNavbarProps) {
  const contract = getWitnessOpsSiblingNavContract("witnessops");
  const [pathname, setPathname] = useState("/");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = "witnessops-mobile-menu";

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const cta = contract.cta;
  const ctaActive = cta ? isPathActive(pathname, cta) : false;
  const desktopCtaClass =
    ctaStyle === "compact"
      ? "vm-nav-cta-compact"
      : cta?.variant === "primary"
        ? "vm-btn vm-btn-primary vm-nav-cta"
        : "vm-btn vm-btn-ghost vm-nav-cta";
  const mobileCtaClass =
    cta?.variant === "primary"
      ? "vm-btn vm-btn-primary vm-nav-mobile-cta"
      : "vm-btn vm-btn-ghost vm-nav-mobile-cta";

  return (
    <>
      {announcement.enabled && (
        <div className="vm-announcement">
          <div className="vm-frame">
            <a href={announcement.href} className="vm-announcement-link">
              <span>{announcement.text}</span>
              <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      )}
      <nav className="vm-nav">
        <div className="vm-nav-inner">
          <a
            href="/"
            className="vm-nav-logo"
            aria-label={logoAriaLabel}
            title={logoTitle}
            onClick={closeMenu}
          >
            <span className="vm-phi vm-motion-target" aria-hidden="true">
              &phi;
            </span>
            <span className="vm-nav-insignia" aria-hidden="true">
              01
            </span>
          </a>

          <div className="vm-nav-rail">
            <ul id={menuId} className={`vm-nav-links ${menuOpen ? "open" : ""}`}>
              {contract.links.map((link) => {
                const active = isPathActive(pathname, link);
                return (
                  <li key={`${link.label}:${link.href}`}>
                    <NavItem
                      href={link.href}
                      ariaCurrent={active ? "page" : undefined}
                      className={active ? "active" : undefined}
                      onClick={closeMenu}
                    >
                      {link.label}
                    </NavItem>
                  </li>
                );
              })}
              {cta && (
                <li className="vm-nav-contact-mobile">
                  <NavItem
                    href={cta.href}
                    className={ctaActive ? `${mobileCtaClass} active` : mobileCtaClass}
                    ariaCurrent={ctaActive ? "page" : undefined}
                    onClick={closeMenu}
                  >
                    {cta.label}
                  </NavItem>
                </li>
              )}
            </ul>
            {cta && (
              <NavItem
                href={cta.href}
                className={ctaActive ? `${desktopCtaClass} active` : desktopCtaClass}
                ariaCurrent={ctaActive ? "page" : undefined}
              >
                {ctaStyle === "compact" ? cta.label.toUpperCase() : cta.label}
                {ctaStyle === "compact" && cta.variant === "primary" && (
                  <span aria-hidden="true">&nbsp;&rarr;</span>
                )}
              </NavItem>
            )}
            <button
              type="button"
              className="vm-hamburger"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setMenuOpen((open) => !open)}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
