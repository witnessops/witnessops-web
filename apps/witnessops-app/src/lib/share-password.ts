import 'server-only';
import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {ApiError} from './errors';
export class PasswordChallenge extends ApiError {
 constructor(status=401,message='This report requires its password.') {super(status,message);}
}
export function passwordInput(value:unknown):string {
 if(typeof value!=='string'||value.length<12||Buffer.byteLength(value,'utf8')>256) throw new ApiError(400,'Use a password of at least 12 characters and at most 256 UTF-8 bytes.');
 return value;
}
// OWASP scrypt minimum N=2^17, r=8, p=1; no attacker-controlled work parameters.
// One derivation per slot (a share or a user). At most two run in this process,
// so one tenant does not block every other, and a third is rejected instead of queued.
const slots=new Set<string>();
let active=0;
const MAX_PASSWORD_WORK=2;
export async function runPasswordWork<T>(slot:string,task:()=>Promise<T>):Promise<T> {
 if(!slot||slots.has(slot)||active>=MAX_PASSWORD_WORK)throw new PasswordChallenge(503,'Password checking is busy. Try again shortly.');
 slots.add(slot);active+=1;
 try{return await task();}
 finally{slots.delete(slot);active-=1;}
}
async function derive(password:string,salt:string,slot:string):Promise<Buffer> {
 return runPasswordWork(slot,()=>new Promise<Buffer>((resolve,reject)=>scrypt(password,Buffer.from(salt,'hex'),32,{N:131072,r:8,p:1,maxmem:192*1024*1024},(error,key)=>error?reject(error):resolve(key))));
}
export async function hashSharePassword(value:unknown,slot:string) {
 const password=passwordInput(value),salt=randomBytes(16).toString('hex');
 return `scrypt-v1$${salt}$${(await derive(password,salt,slot)).toString('hex')}`;
}
export async function checkSharePassword(value:unknown,encoded:string,slot:string) {
 if(typeof value!=='string'||Buffer.byteLength(value,'utf8')>256||!value.length)return false;
 const parts=/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded);
 if(!parts)return false;
 return timingSafeEqual(await derive(value,parts[1],slot),Buffer.from(parts[2],'hex'));
}
