import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { transaction } from './pool';
import { membershipLock } from './membership-lock';
import { requireWorkspaceMembership } from './workspaces';
import { acceptedWorkspacePlan } from './plan-admission';
import { workspaceEntitlement } from './billing-entitlements';
import type { AppUser } from './identity';
import { ApiError } from '../errors';
import type { BillingConfig } from '../billing-config';
import { assertPrice, stripeId, type StripeGateway, type StripeObject } from '../stripe-gateway';
function hostedUrl(value: unknown, host: string) {
 if(typeof value!=='string')throw new Error('Missing hosted URL.');
 const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==host||u.username||u.password||u.port)throw new Error('Invalid hosted URL.');return u.href;
}
export class BillingStore {
 constructor(readonly pool:Pool,readonly stripe:StripeGateway,readonly config:BillingConfig,readonly origin:string){}
 private async lock(client:PoolClient,workspace:string){await membershipLock(client,workspace,true);}
 // A durable, fenced lease serializes billing across processes without retaining a
 // pool client or membership lock during Stripe requests. Crashed leases expire.
 private async operation<T>(workspace:string,user:AppUser|null,action:(step:<R>(work:(client:PoolClient)=>Promise<R>)=>Promise<R>)=>Promise<T>):Promise<T>{
  const token=randomUUID();
  await transaction(this.pool,async client=>{
   await this.lock(client,workspace);if(user)await requireWorkspaceMembership(client,user,workspace,true);
   await client.query('INSERT INTO workspace_billing(workspace_id) VALUES($1) ON CONFLICT DO NOTHING',[workspace]);
   const claimed=await client.query("UPDATE workspace_billing SET operation_token=$2,operation_until=now()+interval '2 minutes' WHERE workspace_id=$1 AND (operation_token IS NULL OR operation_until<now())",[workspace,token]);
   if(!claimed.rowCount)throw new ApiError(409,'A billing operation is in progress. Retry shortly.');
  });
  const step=async<R>(work:(client:PoolClient)=>Promise<R>)=>transaction(this.pool,async client=>{
   await this.lock(client,workspace);
   const lease=await client.query('SELECT 1 FROM workspace_billing WHERE workspace_id=$1 AND operation_token=$2 AND operation_until>now() FOR UPDATE',[workspace,token]);
   if(!lease.rowCount)throw new ApiError(409,'Billing operation expired. Retry to reconcile.');
   if(user)await requireWorkspaceMembership(client,user,workspace,true);
   return work(client);
  });
  try{const result=await action(step);await step(async()=>{});return result;}
  finally{await this.pool.query('UPDATE workspace_billing SET operation_token=NULL,operation_until=NULL WHERE workspace_id=$1 AND operation_token=$2',[workspace,token]);}
 }
 async status(user:AppUser,workspace:string){return transaction(this.pool,async client=>{
  const member=await requireWorkspaceMembership(client,user,workspace);
  const entitlement=await workspaceEntitlement(client,workspace);
  const row=(await client.query('SELECT subscription_status,plan_key,cancel_at_period_end,paid_until,customer_id IS NOT NULL AS customer FROM workspace_billing WHERE workspace_id=$1',[workspace])).rows[0];
  return {sandbox:true,canManage:member.role==='owner',entitlement,status:row?.subscription_status||'free',cancelAtPeriodEnd:row?.cancel_at_period_end||false,hasCustomer:row?.customer||false,plans:this.config.plans.map(({key,name,currency,amount,interval,seats})=>({key,name,currency,amount,interval,seats}))};
 });}
 async checkout(user:AppUser,workspace:string,planKey:unknown){
  const plan=this.config.plans.find(p=>p.key===planKey);if(!plan)throw new ApiError(400,'Choose a configured sandbox plan.');
  return this.operation(workspace,user,async step=>{
   const row=await step(async client=>{
    if((await acceptedWorkspacePlan(client,workspace))?.kind==='historical')throw new ApiError(409,'Historical terms require reconciliation before subscription billing.');
    if((await workspaceEntitlement(client,workspace)).source==='complimentary')throw new ApiError(409,'Complimentary access is already active.');
    await client.query('UPDATE workspace_billing SET checkout_key=$2,checkout_plan=$3,checkout_started_at=now() WHERE workspace_id=$1 AND checkout_key IS NULL',[workspace,randomUUID(),plan.key]);
    return (await client.query('SELECT * FROM workspace_billing WHERE workspace_id=$1',[workspace])).rows[0];
   });
   if(row.checkout_plan!==plan.key)throw new ApiError(409,'Finish or expire the existing checkout before selecting another plan.');
   if(Date.now()-row.checkout_started_at.getTime()>23*3600000&&!row.checkout_session)throw new ApiError(409,'An unresolved checkout needs provider reconciliation before retrying.');
   await assertPrice(await this.stripe.request('prices/'+plan.priceId),plan);
   let customer=row.customer_id;
   if(!customer){
    if(Date.now()-row.created_at.getTime()>23*3600000)throw new ApiError(409,'Customer creation needs provider reconciliation.');
    const created=await this.stripe.request('customers',{'metadata[workspace_id]':workspace},'workspace-customer-'+workspace);
    if(created.livemode!==false)throw new Error('Expected a sandbox customer.');customer=stripeId(created,'cus');
    await step(client=>client.query('UPDATE workspace_billing SET customer_id=$2 WHERE workspace_id=$1',[workspace,customer]));
   }
   const subscriptions=await this.subscriptions(customer);
   if(subscriptions.length)throw new ApiError(409,'This workspace already has a subscription. Use Manage billing.');
   if(row.checkout_session){
    const session=await this.stripe.request('checkout/sessions/'+row.checkout_session+'?expand[]=line_items');
    if(stripeId(session.customer,'cus')!==customer||session.livemode!==false)throw new Error('Checkout binding mismatch.');
    if(session.status==='open'){
     const lines=session.line_items;
     if(session.mode!=='subscription'||session.client_reference_id!==workspace||lines?.has_more!==false||lines.data?.length!==1||lines.data[0].quantity!==1||lines.data[0].price?.id!==plan.priceId)throw new ApiError(409,'Existing checkout no longer matches this workspace plan. Expire it before retrying.');
     return {url:hostedUrl(session.url,'checkout.stripe.com')};
    }
    await step(client=>client.query('UPDATE workspace_billing SET checkout_key=NULL,checkout_plan=NULL,checkout_started_at=NULL,checkout_session=NULL WHERE workspace_id=$1',[workspace]));
    return {retry:true};
   }
   const session=await this.stripe.request('checkout/sessions',{mode:'subscription',customer,'line_items[0][price]':plan.priceId,'line_items[0][quantity]':'1','subscription_data[metadata][workspace_id]':workspace,client_reference_id:workspace,success_url:this.origin+'/settings',cancel_url:this.origin+'/settings',expires_at:String(Math.floor(row.checkout_started_at.getTime()/1000)+3600)},'workspace-checkout-'+row.checkout_key);
   if(session.livemode!==false||stripeId(session.customer,'cus')!==customer)throw new Error('Checkout binding mismatch.');
   const url=hostedUrl(session.url,'checkout.stripe.com');
   await step(client=>client.query('UPDATE workspace_billing SET checkout_session=$2 WHERE workspace_id=$1',[workspace,stripeId(session,'cs')]));return {url};
  });
 }
 private async subscriptions(customer:string):Promise<StripeObject[]>{
  const result=await this.stripe.request('subscriptions?customer='+encodeURIComponent(customer)+'&status=all&limit=100&expand[]=data.latest_invoice');
  if(result.has_more!==false||!Array.isArray(result.data))throw new Error('Subscription inventory is incomplete.');
  for(const sub of result.data)if(sub.livemode!==false||stripeId(sub.customer,'cus')!==customer)throw new Error('Subscription customer mismatch.');
  return result.data.filter((s:StripeObject)=>!['canceled','incomplete_expired'].includes(s.status));
 }
 private async reconciliation(workspace:string,customer:string){
  const subscriptions=await this.subscriptions(customer);
  let status='free',subscription:string|null=null,planKey:string|null=null,seats=1,until:Date|null=null,cancel=false;
  if(subscriptions.length===1){
   const sub=subscriptions[0];subscription=stripeId(sub,'sub');status=sub.status;cancel=sub.cancel_at_period_end===true;
   const item=sub.items?.data?.length===1?sub.items.data[0]:null;
   const plan=this.config.plans.find(p=>p.priceId===item?.price?.id);
   const invoice=sub.latest_invoice;
   if(plan&&item.quantity===1&&sub.metadata?.workspace_id===workspace&&sub.status==='active'&&!sub.pause_collection&&invoice?.status==='paid'&&invoice.amount_remaining===0&&stripeId(invoice.customer,'cus')===customer&&(invoice.parent?.subscription_details?.subscription??invoice.subscription)===subscription){
    assertPrice(await this.stripe.request('prices/'+plan.priceId),plan);
    const lines=invoice.lines?.data;
    const ends=Array.isArray(lines)?lines.filter((line:StripeObject)=>(line.parent?.subscription_item_details?.subscription_item??line.subscription_item)===item.id&&(line.pricing?.price_details?.price??line.price?.id)===plan.priceId).map((line:StripeObject)=>line.period?.end).filter((end:unknown)=>typeof end==='number'&&Number.isFinite(end)):[];
    const end=Math.min(item.current_period_end,Math.max(0,...ends));
    if(Number.isFinite(end)&&end*1000>Date.now()){planKey=plan.key;seats=plan.seats;until=new Date(end*1000);}
   }
   if(!until&&status==='active')status='unpaid_or_unrecognized';
  }else if(subscriptions.length>1)status='multiple_subscriptions';
  return [workspace,subscription,status,planKey,seats,until,cancel];
 }
 private async saveReconciliation(client:PoolClient,values:unknown[]){
  await client.query('UPDATE workspace_billing SET subscription_id=$2,subscription_status=$3,plan_key=$4,seats=$5,paid_until=$6,cancel_at_period_end=$7,reconciled_at=now() WHERE workspace_id=$1',values);
 }
 async refresh(user:AppUser,workspace:string){return this.operation(workspace,user,async step=>{
  const row=await step(async client=>(await client.query('SELECT customer_id FROM workspace_billing WHERE workspace_id=$1',[workspace])).rows[0]);
  if(row?.customer_id){const values=await this.reconciliation(workspace,row.customer_id);await step(client=>this.saveReconciliation(client,values));}return {reconciled:true};
 });}
 async portal(user:AppUser,workspace:string){return this.operation(workspace,user,async step=>{
  const row=await step(async client=>(await client.query('SELECT customer_id FROM workspace_billing WHERE workspace_id=$1',[workspace])).rows[0]);if(!row?.customer_id)throw new ApiError(409,'No billing customer exists for this workspace.');
  const config=await this.stripe.request('billing_portal/configurations/'+this.config.portalConfiguration);
  if(config.livemode!==false||config.active!==true)throw new Error('Expected an active sandbox portal.');
  const update=config.features?.subscription_update;
  if(update?.enabled){
   const products=update.products;
   if(!Array.isArray(products)||products.length===0||!Array.isArray(update.default_allowed_updates)||update.default_allowed_updates.some((x:unknown)=>x!=='price')||products.some((p:StripeObject)=>!Array.isArray(p.prices)||p.prices.length===0||p.prices.some((id:unknown)=>!this.config.plans.some(plan=>plan.priceId===id))))throw new Error('Portal plan changes must use only the configured prices, without quantity changes.');
   for(const plan of this.config.plans)assertPrice(await this.stripe.request('prices/'+plan.priceId),plan);
  }
  const session=await this.stripe.request('billing_portal/sessions',{customer:row.customer_id,configuration:this.config.portalConfiguration,return_url:this.origin+'/settings'});
  return {url:hostedUrl(session.url,'billing.stripe.com')};
 });}
 async event(event:StripeObject){
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','customer.subscription.paused','customer.subscription.resumed','invoice.paid','invoice.payment_failed','invoice.payment_action_required','invoice.updated'].includes(event.type))return {received:true};
  const customer=stripeId(event.data.object.customer,'cus');
  const binding=(await this.pool.query('SELECT workspace_id FROM workspace_billing WHERE customer_id=$1',[customer])).rows[0];if(!binding)return {received:true};
  return this.operation(binding.workspace_id,null,async step=>{
   if(await step(async client=>(await client.query('SELECT 1 FROM billing_events WHERE event_id=$1',[event.id])).rowCount))return {received:true};
   const values=await this.reconciliation(binding.workspace_id,customer);
   await step(async client=>{
    await this.saveReconciliation(client,values);
    await client.query('INSERT INTO billing_events(event_id,workspace_id) VALUES($1,$2)',[event.id,binding.workspace_id]);
   });return {received:true};
  });
 }
}
