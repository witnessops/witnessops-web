import type { Metadata } from "next";
import Link from "next/link";
import { listProductContracts } from "@/lib/server/admin-core-spine";
import {
  CoreMeta,
  CorePage,
  CoreState,
  CoreTable,
} from "../../../../components/admin/admin-core-view";
import { getAdminPageActor } from "@/lib/server/admin-page-session";
import { listAdminBuyerServices } from "@/lib/admin-service-catalog";
import styles from "../../../../components/admin/admin.module.css";

export const metadata: Metadata = {
  title: "Admin — Services & Contracts",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await listProductContracts(await getAdminPageActor());
  const services = listAdminBuyerServices();
  const selectedHandoffs = services.filter(
    (service) => service.requestContext.preservesSelection,
  ).length;

  return (
    <CorePage
      title="Services & contracts"
      eyebrow="Public offers and immutable execution authority"
      actions={
        <Link
          href="/catalog"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.inlineLink}
        >
          Open public catalogue
        </Link>
      }
    >
      <div className={styles.coreMetaGrid}>
        <CoreMeta label="Buyer-facing services" value={services.length} />
        <CoreMeta
          label="Selected-offer handoffs"
          value={`${selectedHandoffs} of ${services.length}`}
        />
        <CoreMeta
          label="Generic handoffs"
          value={services.length - selectedHandoffs}
        />
        <CoreMeta label="Immutable contract versions" value={products.length} />
      </div>

      <section className={styles.coreSection} aria-labelledby="buyer-services-title">
        <div className={styles.coreSectionHeader}>
          <span className={styles.coreSectionTitle} id="buyer-services-title">
            Buyer-facing services
          </span>
        </div>
        <p className={styles.adminServiceSectionNote}>
          Mirrors the public catalogue. A selected handoff carries the named
          offer into review intake; a generic handoff does not.
        </p>
        <CoreTable
          headers={["Service", "Commercial terms", "Timing", "Request handoff", "Public page"]}
          rows={services.map((service) => [
            <span className={styles.adminServiceIdentity} key={service.id}>
              <strong>{service.name}</strong>
              <code>{service.id}</code>
            </span>,
            service.price,
            service.timing,
            <span className={styles.adminServiceHandoff} key="handoff">
              <CoreState
                value={
                  service.requestContext.preservesSelection
                    ? "selected"
                    : "generic"
                }
              />
              <code>{service.requestContext.label}</code>
              <Link
                href={service.requestHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open intake
              </Link>
            </span>,
            <Link
              href={service.publicHref}
              target="_blank"
              rel="noopener noreferrer"
              key="public"
            >
              View service
            </Link>,
          ])}
        />
      </section>

      <section className={styles.coreSection} aria-labelledby="product-contracts-title">
        <div className={styles.coreSectionHeader}>
          <span className={styles.coreSectionTitle} id="product-contracts-title">
            Immutable product contracts
          </span>
        </div>
        <p className={styles.adminServiceSectionNote}>
          Execution contracts stay separate from public offers and remain
          pinned by version on proof runs.
        </p>
        <CoreTable
          headers={["Contract", "Product ID", "Version", "Status", "Expected outputs"]}
          rows={products.map((product) => [
            <Link href={`/admin/products/${product.id}`} key={product.id}>
              {product.productName}
            </Link>,
            product.productId,
            product.contractVersion,
            <CoreState value={product.status} key="status" />,
            product.expectedOutputs.join(", "),
          ])}
        />
      </section>
    </CorePage>
  );
}
