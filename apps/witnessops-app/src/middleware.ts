import { authkitMiddleware } from "@workos-inc/authkit-nextjs";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import {reportHost} from './lib/report-host';
import { authConfiguration } from "./lib/auth-config";
import { appReportOnlyContentSecurityPolicy, createCspNonce } from "./lib/app-security-headers";
import { aasrStagingRequestBoundary } from './lib/aasr-staging/routes';

const reportOnlyHeader = "Content-Security-Policy-Report-Only";

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const stagingRefusal = aasrStagingRequestBoundary(request);
  if (stagingRefusal) return stagingRefusal;
  // Preserve the ordinary artifact's former matcher exclusions; staging still
  // checks its runtime and route boundary before serving any static response.
  if (['_next/static', '_next/image', 'favicon.ico'].some(path => request.nextUrl.pathname.startsWith(`/${path}`))) return NextResponse.next();
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
  if (request.nextUrl.pathname === "/.well-known/security.txt" && ["GET", "HEAD"].includes(request.method)) return NextResponse.next();
  if (['/s', '/s/', '/api/shared-report', '/api/shared-report/', '/api/billing/webhook', '/api/billing/webhook/'].includes(request.nextUrl.pathname)) return;
  const policy = appReportOnlyContentSecurityPolicy(createCspNonce());
  try { authConfiguration(); } catch {
    return new Response("App authentication is not configured.", { status: 503, headers: { [reportOnlyHeader]: policy } });
  }
  // Next nonces framework scripts from this request header. The enforced CSP remains the next.config response header.
  request.headers.set(reportOnlyHeader, policy);
  return Promise.resolve(authkitMiddleware({ middlewareAuth: { enabled: false, unauthenticatedPaths: [] } })(request, event)).then((response) => {
    if (!response) throw new Error("AuthKit middleware returned no response.");
    response.headers.set(reportOnlyHeader, policy);
    return response;
  });
}
export const config = { runtime: "nodejs", matcher: ["/:path*"] };
