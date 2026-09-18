'use client';
import { usePathname } from 'next/navigation';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
/** Public sharing performs no session lookup, refresh or customer auth actions. */
export function AppProviders({ children, publicReport=false }: {
    children: React.ReactNode; publicReport?:boolean;
}) {
    const path=usePathname();return publicReport||['/s', '/s/'].includes(path) ? children : <AuthKitProvider>{children}</AuthKitProvider>;
}
