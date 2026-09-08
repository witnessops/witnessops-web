import { createExternalExposureHandler } from '@/lib/external-exposure/request';
import { runSnapshot } from '@/lib/external-exposure/runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = createExternalExposureHandler(runSnapshot);
