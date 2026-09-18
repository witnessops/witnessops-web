import { billingRequest } from '../../../../lib/billing-server';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>billingRequest(request,true);
