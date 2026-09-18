import {authConfiguration} from '../../lib/auth-config';
import { SharedReport } from '../../components/shared-report';
export const dynamic='force-dynamic';
export default function Page(){return <SharedReport signupUrl={authConfiguration().origin+'/signup'}/>;}
