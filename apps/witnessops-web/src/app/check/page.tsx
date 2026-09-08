import type { Metadata } from 'next';
import { ExternalExposureWorkspace } from '@/components/external-exposure/external-exposure-workspace';

export const metadata: Metadata = {
  title: 'External Exposure Snapshot',
  description: 'Ten bounded public observations of one hostname, with explicit limitations and an unsigned report.',
  robots: { index: false, follow: false },
};

export default function CheckPage() { return <ExternalExposureWorkspace />; }
