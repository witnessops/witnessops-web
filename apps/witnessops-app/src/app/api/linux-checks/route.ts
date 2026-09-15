import { foundation } from '../../../lib/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => foundation.handle(request, 'linux-checks');
export const POST = (request: Request) => foundation.handle(request, 'linux-checks');
