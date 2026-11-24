'use client';
import { usePathname } from 'next/navigation';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
/** Public sharing performs no session lookup, refresh or customer auth actions. */
export function AppProviders({ children, publicReport=false, authProvider="workos" }: {
    children: React.ReactNode; publicReport?:boolean; authProvider?:"workos"|"keycloak";
}) {
    const path=usePathname();return publicReport||authProvider==="keycloak"||['/s', '/s/'].includes(path) ? children : <AuthKitProvider>{children}</AuthKitProvider>;
}
