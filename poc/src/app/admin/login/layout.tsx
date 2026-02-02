/**
 * ログインページ専用レイアウト
 * 管理画面のサイドバーを表示しない
 */

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
