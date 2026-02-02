/**
 * 管理画面トップページ
 * /admin/questions へリダイレクト
 */

import { redirect } from 'next/navigation';

export default function AdminHomePage() {
  redirect('/admin/questions');
}
