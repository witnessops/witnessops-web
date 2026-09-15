import {serverCheck} from '../../../../lib/server-check/service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>serverCheck(request);
export const POST=(request:Request)=>serverCheck(request);
