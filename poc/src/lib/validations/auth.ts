/**
 * 認証関連のバリデーションスキーマ
 */

import { z } from 'zod';

// ログインリクエストのスキーマ
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(1, 'パスワードを入力してください')
    .min(8, 'パスワードは8文字以上で入力してください'),
});

export type LoginSchema = z.infer<typeof loginSchema>;

// 管理者ユーザーのスキーマ（内部用）
export const adminUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string().min(1),
  role: z.enum(['admin', 'editor']),
  created_at: z.string(),
  updated_at: z.string(),
  last_login_at: z.string().nullable(),
});

export type AdminUserSchema = z.infer<typeof adminUserSchema>;
