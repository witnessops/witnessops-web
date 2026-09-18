import test from 'node:test';
import assert from 'node:assert/strict';
import {reportName,reportHostSuffix,reportHost,reportLinkBase} from './report-host';
test('report names and configured host family reject reserved, nested and injected labels',()=>{
 assert.equal(reportName('acme-q3'),'acme-q3');
 for(const name of ['admin','app','www','login','api','callback','ACME','-acme','acme-','ab','a--b','acme.q3','a/b','a@b','a'.repeat(49)])assert.throws(()=>reportName(name));
 assert.equal(reportHostSuffix('proof.example.com'),'proof.example.com');
 for(const suffix of ['https://proof.example.com','proof.example.com:443','proof.example.com/path','*.example.com','proof.example.com.','example.com@evil.test'])assert.throws(()=>reportHostSuffix(suffix));
 assert.deepEqual(reportHost('acme-q3.proof.example.com','proof.example.com'),{name:'acme-q3',origin:'https://acme-q3.proof.example.com'});
 assert.equal(reportHost('acme-q3.proof.example.com.evil.test','proof.example.com'),null);
 assert.throws(()=>reportHost('other.acme-q3.proof.example.com','proof.example.com'));
 assert.throws(()=>reportHost('proof.example.com','proof.example.com'));
 assert.throws(()=>reportHost('acme-q3.proof.example.com:443','proof.example.com'));
 assert.throws(()=>reportHost('ACME-Q3.proof.example.com','proof.example.com'));
 assert.equal(reportHost('acme-q3.proof.example.com',''),null);
 assert.equal(reportLinkBase('https://app.example.com','acme-q3','proof.example.com'),'https://acme-q3.proof.example.com/');
 assert.equal(reportLinkBase('https://app.example.com',undefined,'proof.example.com'),'https://app.example.com/s');
});
