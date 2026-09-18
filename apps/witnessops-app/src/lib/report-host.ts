/** Routing names are public labels, never access credentials. */
const RESERVED=new Set(['www','app','api','admin','auth','login','logout','signup','callback','account','billing','support','help','docs','mail','email','smtp','ftp','status','security','verify','proof','reports','report','assets','static','cdn','localhost','test','staging','production']);
export function reportName(value:unknown):string {
 if(typeof value!=='string'||value!==value.toLowerCase()||! /^[a-z][a-z0-9-]{2,47}$/.test(value)||value.endsWith('-')||value.includes('--')||RESERVED.has(value))throw new Error('Use 3–48 lowercase letters, numbers or single hyphens, starting with a letter. This name may be reserved.');
 return value;
}
export function reportHostSuffix(value=process.env.WITNESSOPS_REPORT_HOST_SUFFIX):string|undefined {
 if(!value)return undefined;
 if(value.length>190||value!==value.toLowerCase()||! /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value))throw new Error('Invalid reporting host suffix');
 return value;
}
export function reportHost(host:string|null,suffix=reportHostSuffix()):{name:string;origin:string}|null {
 if(!suffix||!host)return null;
 const hostname=host.toLowerCase().split(':')[0];
 if(!hostname.endsWith('.'+suffix)&&hostname!==suffix)return null;
 if(host!==hostname)throw new Error('Use the exact reporting host');
 const name=reportName(host.slice(0,-suffix.length-1)); // rejects apex, nested labels and reserved names
 return {name,origin:`https://${name}.${suffix}`};
}
export function reportLinkBase(appOrigin:string,name?:string|null,suffix=reportHostSuffix()):string {
 const base=new URL(appOrigin);
 if(base.origin!==appOrigin||base.username||base.password||!['https:','http:'].includes(base.protocol))throw new Error('Invalid app origin');
 return suffix&&name?`https://${reportName(name)}.${suffix}/`:`${appOrigin}/s`;
}
