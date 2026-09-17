import {readFileSync,readdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../apps/witnessops-app/package.json',import.meta.url));
const pg=require('pg');
import {migrate} from '../../apps/witnessops-app/scripts/migrate.mjs';
const root=new URL('../../apps/witnessops-app',import.meta.url).pathname;
const uri=parseEnv(readFileSync(root+'/.env.test.local','utf8')).TEST_DATABASE_URL;
const url=new URL(uri);assert(['localhost','127.0.0.1'].includes(url.hostname)&&/^\/[a-z0-9_]+_test$/.test(url.pathname));
const schema='publication_upgrade_'+randomUUID().replaceAll('-','');
const admin=new pg.Pool({connectionString:uri,max:1});
let db;
try {
 await admin.query(`CREATE SCHEMA ${schema}`);
 db=new pg.Pool({connectionString:uri,max:1,options:`-c search_path=${schema},public`});
 await db.query('CREATE TABLE app_migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of readdirSync(root+'/db/migrations').filter(n=>/^000[1-4]_/.test(n)).sort()){
  const sql=readFileSync(root+'/db/migrations/'+name,'utf8');await db.query(sql);await db.query('INSERT INTO app_migrations(name,sha256) VALUES($1,$2)',[name,createHash('sha256').update(sql).digest('hex')]);
 }
 const [user,workspace,asset,run]=Array.from({length:4},randomUUID);
 await db.query('INSERT INTO users(id) VALUES($1)',[user]);
 await db.query("INSERT INTO workspaces(id,name,slug,created_by,creation_key) VALUES($1,'Upgrade fixture','upgrade-fixture',$2,$3)",[workspace,user,randomUUID()]);
 await db.query("INSERT INTO memberships(user_id,workspace_id,role) VALUES($1,$2,'owner')",[user,workspace]);
 const source=JSON.parse(readFileSync(new URL('../external-exposure/fixtures/public-witnessops-snapshot-20260910.json',import.meta.url),'utf8'));
 await db.query("INSERT INTO assets(id,workspace_id,type,normalized_value) VALUES($1,$2,'hostname',$3)",[asset,workspace,source.target]);
 const digest=createHash('sha256').update(JSON.stringify(source)).digest('hex');
 await db.query("INSERT INTO runs(id,workspace_id,asset_id,initiated_by,source_type,status,finished_at,method_id,method_version,source_snapshot,source_digest) VALUES($1,$2,$3,$4,'external-snapshot-v1','completed',now(),'bounded-hostname','external-demo-v0.1',$5,$6)",[run,workspace,asset,user,source,digest]);
 const before=(await db.query('SELECT row_to_json(r) AS record FROM runs r WHERE id=$1',[run])).rows[0].record;
 await migrate(db,{preserveMember:user});
 const after=(await db.query('SELECT row_to_json(r) AS record FROM runs r WHERE id=$1',[run])).rows[0].record;
 for(const [key,value] of Object.entries(before))assert.deepEqual(after[key],value,key);
 assert.equal((await db.query('SELECT count(*) AS n FROM app_migrations')).rows[0].n,'11');
 assert.equal((await db.query('SELECT count(*) AS n FROM early_access_plans')).rows[0].n,'0');
 assert.equal((await db.query('SELECT count(*) AS n FROM early_access_plan_consents')).rows[0].n,'0');
 await assert.rejects(db.query('DELETE FROM runs WHERE id=$1',[run]),/immutable/);
 await migrate(db);
 console.log('PASS: populated 0004 -> 0011, historical run/source/digest unchanged, no implicit plan/consent, immutable trigger retained, reapply idempotent');
} finally {if(db)await db.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();}
