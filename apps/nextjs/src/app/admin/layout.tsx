import { redirect } from "next/navigation";

import { authOptions, getCurrentUser } from "@saasfly/auth";

// Force dynamic rendering to avoid build-time auth queries
export const dynamic = 'force-dynamic';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const user = await getCurrentUser();

  if (!user || !user.isAdmin) {
    redirect(authOptions?.pages?.signIn ?? "/login-clerk");
  }

  return <div className="min-h-screen">{children}</div>;
}
