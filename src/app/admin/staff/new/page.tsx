"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

const ROLES = ['新人', 'スタッフ', '店長'];

export default function NewStaffPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    loginId: '',
    password: '',
    confirmPassword: '',
    roleName: 'スタッフ',
    storeId: '1',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError('パスワードと確認用パスワードが一致しません');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          loginId: form.loginId,
          password: form.password,
          roleName: form.roleName,
          storeId: form.storeId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setForm({ name: '', loginId: '', password: '', confirmPassword: '', roleName: 'スタッフ', storeId: '1' });
      } else {
        setError(json.error || '作成に失敗しました');
      }
    } catch {
      setError('ネットワークエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <Link href="/manager/dashboard" className={styles.backLink}>&lt; ダッシュボードに戻る</Link>
        <div className={styles.headerTitle}>
          <h1>新規スタッフ作成</h1>
          <span className={styles.adminBadge}>管理者専用</span>
        </div>
        <p className={styles.headerDesc}>新しいスタッフのアカウントを作成します。作成後、スタッフはログインIDとパスワードでアクセスできます。</p>
      </header>

      <div className={`glass-panel ${styles.formCard}`}>
        {success && (
          <div className={styles.successBox}>
            ✅ スタッフアカウントを作成しました！続けて作成するか、ダッシュボードに戻ってください。
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">氏名 <span className={styles.required}>*</span></label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="山田 花子"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="loginId">ログインID <span className={styles.required}>*</span></label>
            <input
              id="loginId"
              name="loginId"
              type="text"
              placeholder="hanako.yamada（3文字以上・半角英数字推奨）"
              value={form.loginId}
              onChange={handleChange}
              required
              minLength={3}
            />
          </div>

          <div className={styles.formRow2}>
            <div className={styles.formGroup}>
              <label htmlFor="roleName">役職 <span className={styles.required}>*</span></label>
              <select id="roleName" name="roleName" value={form.roleName} onChange={handleChange} required>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="storeId">所属店舗 <span className={styles.required}>*</span></label>
              <select id="storeId" name="storeId" value={form.storeId} onChange={handleChange} required>
                <option value="1">新宿院</option>
              </select>
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.formGroup}>
            <label htmlFor="password">初期パスワード <span className={styles.required}>*</span></label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="6文字以上"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
            <span className={styles.hint}>スタッフが最初にログインするときに使用します</span>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">パスワード（確認） <span className={styles.required}>*</span></label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="もう一度入力"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className={styles.errorBox}>❌ {error}</div>}

          <div className={styles.formActions}>
            <Link href="/manager/dashboard" className={styles.cancelBtn}>キャンセル</Link>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? '作成中...' : 'アカウントを作成する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
