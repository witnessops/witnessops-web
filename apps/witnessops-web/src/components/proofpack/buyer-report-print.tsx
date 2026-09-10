"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { isBuyerReport, printBuyerReport, type ProofpackReportV1 } from '@/lib/proofpack/report-model';
import { BuyerReportDocument } from './buyer-report';
import styles from './buyer-report-print.module.css';

/** A body-level print boundary, independent of route chrome and its ancestors. */
export function useBuyerReportPrint(model: ProofpackReportV1 | null) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => { setBody(document.body); }, []);
  const admitted = model && isBuyerReport(model);
  return {
    print: () => { if (body && admitted) printBuyerReport(model, () => window.print()); },
    printRoot: body && admitted ? createPortal(
      <div className={styles.root} data-buyer-print-root><BuyerReportDocument model={model} /></div>, body,
    ) : null,
  };
}
