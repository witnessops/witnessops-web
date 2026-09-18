import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { billingConfiguration } from './billing-config';
import { verifyStripeEvent, assertPrice } from './stripe-gateway';
const env={WITNESSOPS_BILLING_SANDBOX:'1',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PORTAL_CONFIGURATION:'bpc_fixture',WITNESSOPS_BILLING_PLANS:JSON.stringify([{key:'team_month',name:'Team test',priceId:'price_fixture',currency:'eur',amount:100,interval:'month',seats:3}])};
test('billing is sandbox-only with unique explicit server catalogue and no guessed commercial amounts',()=>{
 assert.equal(billingConfiguration(env).plans[0].seats,3);
 for(const patch of [{WITNESSOPS_BILLING_SANDBOX:'0'},{STRIPE_SECRET_KEY:'sk_live_fixture'},{WITNESSOPS_BILLING_PLANS:'[]'},{WITNESSOPS_BILLING_PLANS:env.WITNESSOPS_BILLING_PLANS.replace('"seats":3','"seats":0')}])assert.throws(()=>billingConfiguration({...env,...patch}));
 const plan=billingConfiguration(env).plans[0],price={id:plan.priceId,livemode:false,active:true,currency:'eur',unit_amount:100,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'},billing_scheme:'per_unit'};
 assert.doesNotThrow(()=>assertPrice(price,plan));
 for(const patch of [{livemode:true},{unit_amount:4900},{type:'one_time'},{recurring:{interval:'year',interval_count:1,usage_type:'licensed'}},{transform_quantity:{divide_by:3}}])assert.throws(()=>assertPrice({...price,...patch},plan));
});
test('Stripe signature verifies exact raw bytes, supports key rotation signatures and rejects stale/live/forged events',()=>{
 const now=Date.now(),stamp=Math.floor(now/1000),secret='whsec_fixture',raw=Buffer.from(JSON.stringify({id:'evt_fixture',type:'invoice.paid',livemode:false,data:{object:{customer:'cus_fixture'}}}));
 const sign=(bytes:Buffer,t=stamp)=>`t=${t},v1=${createHmac('sha256',secret).update(String(t)+'.').update(bytes).digest('hex')}`;
 assert.equal(verifyStripeEvent(raw,sign(raw)+',v1='+'0'.repeat(64),secret,now).id,'evt_fixture');
 assert.throws(()=>verifyStripeEvent(Buffer.concat([raw,Buffer.from(' ')]),sign(raw),secret,now));
 assert.throws(()=>verifyStripeEvent(raw,sign(raw,stamp-301),secret,now));
 assert.throws(()=>verifyStripeEvent(raw,sign(raw),secret+'wrong',now));
 const live=Buffer.from(raw.toString().replace('false','true'));assert.throws(()=>verifyStripeEvent(live,sign(live),secret,now));
 assert.throws(()=>verifyStripeEvent(raw,sign(raw)+`,t=${stamp}`,secret,now));
});
