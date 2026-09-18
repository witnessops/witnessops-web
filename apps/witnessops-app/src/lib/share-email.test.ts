import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reportEmail,messageDigest} from './share-email';
import {recipientReport} from './share-projection';
import {savedRunReport} from './report-model';
import {RECOMMENDED_PROFILE} from './model';
import {canonicalSource} from './source-digest';
import {createHash} from 'node:crypto';

test('report email uses the configured origin, plain reviewed content and an explicit reports sender',()=>{
 const snapshot=JSON.parse(readFileSync(new URL('../../../../tests/external-exposure/fixtures/public-witnessops-snapshot-20260910.json',import.meta.url),'utf8'));
 const model=recipientReport(savedRunReport({id:'fixture',assetId:'fixture',createdAt:snapshot.finished_at,profile:RECOMMENDED_PROFILE,snapshot,sourceDigest:createHash('sha256').update(canonicalSource(snapshot)).digest('hex')}),'Illustrative <script> title');
 const token='a'.repeat(43),expires=new Date('2026-10-01T00:00:00Z');
 const message=reportEmail('https://app.example.com',token,'recipient@example.com',model,expires,'request');
 assert.equal(message.html,undefined);assert.ok(message.text.includes('/s#'+token));assert.ok(message.text.includes('not a verification claim'));
 assert.ok(!message.text.includes('Private workspace'));assert.equal(message.signatureProfile,'none');assert.equal(message.replyTo,'engage@mail.witnessops.com');
 assert.notEqual(messageDigest(message),messageDigest({...message,to:'different@example.com'}));
 for(const origin of ['https://evil@example.com','https://app.example.com/path','https://app.example.com?redirect=evil','https://app.example.com/#bad']) assert.throws(()=>reportEmail(origin,token,message.to,model,expires,'request'));
});
