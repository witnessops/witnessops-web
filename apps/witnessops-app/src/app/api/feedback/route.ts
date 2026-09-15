import { foundation } from '../../../lib/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return foundation.handle(request, 'feedback'); }
export function POST(request: Request) { return foundation.handle(request, 'feedback'); }
