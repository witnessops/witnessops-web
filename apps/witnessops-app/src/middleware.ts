import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import {reportHost} from './lib/report-host';
import { authConfiguration } from "./lib/auth-config";

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    const named=reportHost(request.headers.get('host'));
    if(named){
      const path=request.nextUrl.pathname;
      const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive'};
      if(path==='/'&&['GET','HEAD'].includes(request.method)) {const target=request.nextUrl.clone();target.pathname='/s';return NextResponse.rewrite(target,{headers});}
      if(path==='/api/shared-report'&&request.method==='POST')return NextResponse.next({headers});
      if(['/s','/s/'].includes(path)&&['GET','HEAD'].includes(request.method))return NextResponse.next({headers});
      return new NextResponse('Not found',{status:404,headers});
    }
  }catch{return new NextResponse('Reporting host unavailable',{status:404,headers:{'Cache-Control':'no-store'}});}
  if (['/s', '/s/', '/api/shared-report', '/api/shared-report/', '/api/billing/webhook', '/api/billing/webhook/'].includes(request.nextUrl.pathname)) return;
  try { authConfiguration(); } catch { return new Response("App authentication is not configured.", { status: 503 }); }
  return authkitMiddleware({ middlewareAuth: { enabled: false, unauthenticatedPaths: [] } })(request, event);
}
export const config = { runtime: "nodejs", matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
