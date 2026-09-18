'use client';
import { usePathname } from 'next/navigation';
import { AuthKitProvider } from '@workos-inc/authkit-nextjs/components';
/** Public sharing performs no session lookup, refresh or customer auth actions. */
export function AppProviders({ children }: {
    children: React.ReactNode;
}) {
    return ['/s', '/s/'].includes(usePathname()) ? children : <AuthKitProvider>{children}</AuthKitProvider>;
}
