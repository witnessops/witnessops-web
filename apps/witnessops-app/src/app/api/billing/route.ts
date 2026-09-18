import { billingRequest } from '../../../lib/billing-server';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>billingRequest(request);
export const POST=(request:Request)=>billingRequest(request);
