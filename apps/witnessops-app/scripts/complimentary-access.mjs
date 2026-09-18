// Explicit operator command. No browser endpoint or fake Stripe subscription.
import { Pool } from 'pg';
const [workspace,seatsText,expires,operator,reason]=process.argv.slice(2);
const seats=Number(seatsText),date=new Date(expires);
if(process.env.WITNESSOPS_BILLING_SANDBOX!=='1'||!process.env.DATABASE_URL||!/^[0-9a-f-]{36}$/.test(workspace||'')||!Number.isInteger(seats)||seats<2||seats>100||!Number.isFinite(date.getTime())||!operator||operator.length>100||!reason||reason.length>500)throw new Error('Usage: sandbox environment; workspace UUID, seats 2–100, expiry ISO date (past to revoke), operator reference, reason.');
const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});const client=await pool.connect();
try{
 await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::uuid::text,39115))',[workspace]);
 await client.query('INSERT INTO workspace_complimentary_access(workspace_id,seats,expires_at,issued_by,reason) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workspace_id) DO UPDATE SET seats=$2,expires_at=$3,issued_by=$4,reason=$5,updated_at=now()',[workspace,seats,date,operator,reason]);
 await client.query('COMMIT');console.log('Explicit workspace complimentary entitlement recorded.');
}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();await pool.end();}
