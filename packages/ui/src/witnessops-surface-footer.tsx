import {
  getSurfaceUrl,
  getVaultMeshFooterContract,
  getWitnessOpsFooterContract,
  type VaultMeshFooterLink,
  type VaultMeshFooterSurfaceId,
} from "../../config/src/surfaces";
import styles from "./witnessops-surface-footer.module.css";

export interface VaultMeshSurfaceFooterProps {
  surfaceId: VaultMeshFooterSurfaceId;
}

export interface WitnessOpsSurfaceFooterProps {
  surfaceId?: "witnessops";
}

function renderLink(
  link: VaultMeshFooterLink,
  currentHref?: string,
  extraClassName?: string,
) {
  const isCurrent = currentHref === link.href;

  return (
    <a
      href={link.href}
      className={extraClassName}
      aria-current={isCurrent ? "page" : undefined}
      data-current={isCurrent ? "true" : undefined}
    >
      {link.label}
    </a>
  );
}

export function VaultMeshSurfaceFooter({
  surfaceId,
}: VaultMeshSurfaceFooterProps) {
  const contract = getVaultMeshFooterContract(surfaceId);
  const currentSurfaceHref = getSurfaceUrl(surfaceId);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <div className={styles.logo} aria-label={contract.brandLine}>
              <span className={styles.phi} aria-hidden="true">
                φ
              </span>
              <span className={styles.wordmark}>{contract.brandLine}</span>
            </div>
            <a
              href={contract.partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.partner}
            >
              <span className={styles.partnerDot} aria-hidden="true" />
              {contract.partner.label}
            </a>
            <p className={styles.tagline}>{contract.subline}</p>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Surfaces</h3>
            <ul className={styles.linkList}>
              {contract.surfaces.map((link) => (
                <li key={link.href}>{renderLink(link, currentSurfaceHref)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Docs</h3>
            <ul className={styles.linkList}>
              {contract.docs.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Support</h3>
            <ul className={styles.linkList}>
              {contract.support.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Legal</h3>
            <ul className={styles.linkList}>
              {contract.legal.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.separator} />

        <div className={styles.statusRow}>
          <span className={styles.protocol}>
            <span className={styles.protocolDot} aria-hidden="true" />
            {contract.protocolLabel}
          </span>
          <span className={styles.domain}>{contract.domainLabel}</span>
          <span className={styles.copyright}>{contract.copyright}</span>
        </div>

        <div className={styles.strip}>
          <h4 className={styles.stripHeading}>Verification Surfaces</h4>
          <ul className={styles.stripList}>
            {contract.strip.map((surface) => (
              <li key={surface.href}>
                <a
                  href={surface.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.stripLink}
                  aria-current={
                    currentSurfaceHref === surface.href ? "page" : undefined
                  }
                  data-current={
                    currentSurfaceHref === surface.href ? "true" : undefined
                  }
                >
                  <span className={styles.stripDot} aria-hidden="true" />
                  {surface.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export function WitnessOpsSurfaceFooter({
  surfaceId = "witnessops",
}: WitnessOpsSurfaceFooterProps) {
  const contract = getWitnessOpsFooterContract(surfaceId);
  const currentSurfaceHref = getSurfaceUrl(surfaceId);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <div className={styles.logo} aria-label={contract.brandLine}>
              <span className={styles.phi} aria-hidden="true">
                φ
              </span>
              <span className={styles.wordmark}>{contract.brandLine}</span>
            </div>
            <a
              href={contract.partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.partner}
            >
              <span className={styles.partnerDot} aria-hidden="true" />
              {contract.partner.label}
            </a>
            <p className={styles.tagline}>{contract.subline}</p>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Surface</h3>
            <ul className={styles.linkList}>
              {contract.surfaces.map((link) => (
                <li key={link.href}>{renderLink(link, currentSurfaceHref)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Docs</h3>
            <ul className={styles.linkList}>
              {contract.docs.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Support</h3>
            <ul className={styles.linkList}>
              {contract.support.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          <div className={styles.column}>
            <h3 className={styles.heading}>Legal</h3>
            <ul className={styles.linkList}>
              {contract.legal.map((link) => (
                <li key={link.href}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.separator} />

        <div className={styles.statusRow}>
          <span className={styles.protocol}>
            <span className={styles.protocolDot} aria-hidden="true" />
            {contract.protocolLabel}
          </span>
          <span className={styles.domain}>{contract.domainLabel}</span>
          <span className={styles.copyright}>{contract.copyright}</span>
        </div>

        <div className={styles.strip}>
          <h4 className={styles.stripHeading}>Verification Surface</h4>
          <ul className={styles.stripList}>
            {contract.strip.map((surface) => (
              <li key={surface.href}>
                <a
                  href={surface.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.stripLink}
                  aria-current={
                    currentSurfaceHref === surface.href ? "page" : undefined
                  }
                  data-current={
                    currentSurfaceHref === surface.href ? "true" : undefined
                  }
                >
                  <span className={styles.stripDot} aria-hidden="true" />
                  {surface.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
