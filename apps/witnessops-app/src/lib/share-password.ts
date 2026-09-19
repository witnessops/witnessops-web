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
// Reject excess work instead of accumulating an unbounded memory-hard queue.
let working=false;
async function derive(password:string,salt:string):Promise<Buffer> {
 if(working)throw new PasswordChallenge(503,'Password checking is busy. Try again shortly.');
 working=true;
 try{return await new Promise<Buffer>((resolve,reject)=>scrypt(password,Buffer.from(salt,'hex'),32,{N:131072,r:8,p:1,maxmem:192*1024*1024},(error,key)=>error?reject(error):resolve(key)));}
 finally{working=false;}
}
export async function hashSharePassword(value:unknown) {
 const password=passwordInput(value),salt=randomBytes(16).toString('hex');
 return `scrypt-v1$${salt}$${(await derive(password,salt)).toString('hex')}`;
}
export async function checkSharePassword(value:unknown,encoded:string) {
 if(typeof value!=='string'||Buffer.byteLength(value,'utf8')>256||!value.length)return false;
 const parts=/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(encoded);
 if(!parts)return false;
 return timingSafeEqual(await derive(value,parts[1]),Buffer.from(parts[2],'hex'));
}
