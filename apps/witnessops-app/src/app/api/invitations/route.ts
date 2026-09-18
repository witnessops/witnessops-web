import { memberRequest } from '../../../lib/member-server';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => memberRequest(request, true);
export const POST = GET;
