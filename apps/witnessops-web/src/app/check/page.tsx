import type { Metadata } from 'next';
import { ExternalExposureWorkspace } from '@/components/external-exposure/external-exposure-workspace';
import { getWorkspaceAppUrl } from '@/lib/workspace-access';

export const metadata: Metadata = {
  title: 'External Exposure Snapshot',
  description: 'Run a free external exposure check for your company hostname. Ten bounded public observations, explained findings and practical follow-up steps. No email required.',
  alternates: { canonical: '/check' },
  robots: { index: true, follow: true },
};

export default function CheckPage() { return <ExternalExposureWorkspace workspaceUrl={getWorkspaceAppUrl()} />; }
