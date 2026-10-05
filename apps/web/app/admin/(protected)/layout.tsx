import { AdminShell } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/admin/auth";
export default async function ProtectedAdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  return <AdminShell admin={admin}>{children}</AdminShell>;
}
