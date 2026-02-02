/**
 * 管理画面レイアウト
 */

import { AdminLayout } from '@/components/admin';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
