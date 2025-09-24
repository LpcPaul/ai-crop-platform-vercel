import { redirect } from "next/navigation";

import { authOptions, getCurrentUser } from "@saasfly/auth";

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
