import type { Metadata } from 'next';
import { ExternalExposureWorkspace } from '@/components/external-exposure/external-exposure-workspace';

export const metadata: Metadata = {
  title: 'External Exposure Snapshot',
  description: 'Run a free external exposure check for your company hostname. Ten bounded public observations, clear limitations and a report. No email required.',
  alternates: { canonical: '/check' },
  robots: { index: true, follow: true },
};

export default function CheckPage() { return <ExternalExposureWorkspace />; }
