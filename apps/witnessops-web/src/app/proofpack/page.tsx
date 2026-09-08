import type { Metadata } from 'next';
import { ProofpackWorkspace } from '@/components/proofpack/proofpack-workspace';
export const metadata: Metadata = { title: 'Proofpack Report', description: 'Open a Local Audit 1.2.2 proofpack on your device, check its evidence and export a buyer report.', robots: { index: false, follow: false } };
export default function ProofpackPage() { return <ProofpackWorkspace />; }
