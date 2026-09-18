import 'server-only';
import type { PoolClient } from 'pg';
import { billingEnabled } from '../billing-config';
/** Caller holds the workspace membership lock. Existing members and evidence are never removed. */
export async function workspaceEntitlement(client: PoolClient, workspace: string) {
 const features={comparison:true,share:true,linux_import:true};
 if(!billingEnabled())return {source:'existing' as const,seats:10,...features};
 const grant=(await client.query('SELECT seats,expires_at FROM workspace_complimentary_access WHERE workspace_id=$1 AND expires_at>now()',[workspace])).rows[0];
 const paid=(await client.query("SELECT seats,paid_until,plan_key FROM workspace_billing WHERE workspace_id=$1 AND subscription_status='active' AND paid_until>now()",[workspace])).rows[0];
 if(grant&&(!paid||grant.seats>paid.seats))return {source:'complimentary' as const,seats:grant.seats,expiresAt:grant.expires_at.toISOString(),...features};
 if(paid)return {source:'subscription' as const,seats:paid.seats,expiresAt:paid.paid_until.toISOString(),planKey:paid.plan_key,...features};
 return {source:'free' as const,seats:1,...features};
}
