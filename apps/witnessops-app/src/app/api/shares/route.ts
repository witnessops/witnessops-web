import { shareRequest } from '../../../lib/share-server';
export const dynamic='force-dynamic';
export const POST=(request:Request)=>shareRequest(request);
