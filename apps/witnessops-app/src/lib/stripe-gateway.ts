import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BillingConfig, BillingPlan } from './billing-config';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Narrow external API envelope; entitlement fields are checked explicitly.
export type StripeObject = Record<string, any>; // External API values are checked at the boundary before granting seats.
export interface StripeGateway {
 request(path: string, fields?: Record<string,string>, key?: string): Promise<StripeObject>;
}
export class StripeHttp implements StripeGateway {
 constructor(private config: BillingConfig) {}
 async request(path: string, fields?: Record<string,string>, key?: string) {
  const response = await fetch('https://api.stripe.com/v1/'+path, {method:fields?'POST':'GET',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000),headers:{Authorization:`Bearer ${this.config.secret}`,'Stripe-Version':'2025-06-30.basil',...(fields?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},...(fields?{body:new URLSearchParams(fields)}:{})});
  if (!response.ok) throw new Error('Stripe request unavailable.');
  const value = await response.json();
  if (!value || typeof value !== 'object' || value.livemode === true) throw new Error('Expected a sandbox Stripe object.');
  return value;
 }
}
export function assertPrice(price: StripeObject, plan: BillingPlan) {
 if (price.id!==plan.priceId || price.livemode!==false || price.active!==true || price.currency!==plan.currency || price.unit_amount!==plan.amount || price.type!=='recurring' || price.recurring?.interval!==plan.interval || price.recurring?.interval_count!==1 || price.recurring?.usage_type!=='licensed' || price.billing_scheme!=='per_unit' || price.transform_quantity) throw new Error('Stripe price does not match the configured sandbox plan.');
}
export function stripeId(value: unknown, prefix: string): string {
 const id = typeof value==='string'?value:(value as {id?:unknown})?.id;
 if (typeof id!=='string' || !new RegExp('^'+prefix+'_[A-Za-z0-9_]+$').test(id)) throw new Error('Invalid Stripe object.');
 return id;
}
/** Verify the exact raw bytes and signed timestamp; never parse/re-serialize first. */
export function verifyStripeEvent(raw: Buffer, signature: string|null, secret: string, now=Date.now()): StripeObject {
 const parts=(signature||'').split(',');const stamps=parts.filter(p=>p.startsWith('t='));
 if(stamps.length!==1 || !/^t=\d+$/.test(stamps[0]))throw new Error('Invalid signature.');
 const timestamp=Number(stamps[0].slice(2));if(Math.abs(now/1000-timestamp)>300)throw new Error('Expired signature.');
 const expected=createHmac('sha256',secret).update(String(timestamp)+'.').update(raw).digest();
 if(!parts.some(p=>/^v1=[a-f0-9]{64}$/.test(p)&&timingSafeEqual(expected,Buffer.from(p.slice(3),'hex'))))throw new Error('Invalid signature.');
 const event=JSON.parse(raw.toString('utf8'));
 if(event.livemode!==false || !/^evt_[A-Za-z0-9]+$/.test(event.id) || typeof event.type!=='string' || !event.data?.object)throw new Error('Expected a sandbox event.');
 return event;
}
