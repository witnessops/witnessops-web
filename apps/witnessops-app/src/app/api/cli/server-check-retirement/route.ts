import {serverCheckRetirement} from '../../../../lib/server-check/service';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=(request:Request)=>serverCheckRetirement(request);
export const POST=(request:Request)=>serverCheckRetirement(request);
