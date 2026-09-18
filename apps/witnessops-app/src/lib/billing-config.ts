import 'server-only';
export type BillingPlan = { key: string; name: string; priceId: string; currency: string; amount: number; interval: 'month' | 'year'; seats: number };
export type BillingConfig = { secret: string; webhookSecret: string; portalConfiguration: string; plans: BillingPlan[] };
export function billingEnabled(env: Record<string,string|undefined> = process.env) { return env.WITNESSOPS_BILLING_SANDBOX === '1'; }
/** No live-mode switch in this slice. Commercial prices are explicit server configuration. */
export function billingConfiguration(env: Record<string,string|undefined> = process.env): BillingConfig {
 if (!billingEnabled(env)) throw new Error('Sandbox billing is disabled.');
 const secret = env.STRIPE_SECRET_KEY || '', webhookSecret = env.STRIPE_WEBHOOK_SECRET || '', portalConfiguration = env.STRIPE_PORTAL_CONFIGURATION || '';
 if (!/^(sk|rk)_test_/.test(secret) || !webhookSecret.startsWith('whsec_') || !/^bpc_[A-Za-z0-9]+$/.test(portalConfiguration)) throw new Error('Sandbox billing configuration is incomplete.');
 const plans: unknown = JSON.parse(env.WITNESSOPS_BILLING_PLANS || '[]');
 if (!Array.isArray(plans) || plans.length < 1 || plans.length > 8) throw new Error('Configure sandbox plans.');
 const keys = new Set(), prices = new Set();
 for (const p of plans) {
  if (!p || typeof p !== 'object' || !/^[a-z][a-z0-9_-]{1,39}$/.test(p.key) || typeof p.name !== 'string' || p.name.length < 1 || p.name.length > 80 || !/^price_[A-Za-z0-9]+$/.test(p.priceId) || !['eur','usd','gbp'].includes(p.currency) || !Number.isSafeInteger(p.amount) || p.amount <= 0 || !['month','year'].includes(p.interval) || !Number.isInteger(p.seats) || p.seats < 2 || p.seats > 100 || keys.has(p.key) || prices.has(p.priceId)) throw new Error('Invalid sandbox plan configuration.');
  keys.add(p.key); prices.add(p.priceId);
 }
 return { secret, webhookSecret, portalConfiguration, plans };
}
