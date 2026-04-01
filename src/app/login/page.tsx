"use client";
import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    const result = await signIn('credentials', {
      loginId,
      password,
      redirect: false,
    });

    if (result?.ok) {
      const session = await getSession();
      const role = (session?.user as any)?.role || '';
      
      const isManagerOrAbove = ['店長', 'マネージャー', '代表'].includes(role);
      
      if (isManagerOrAbove) {
        router.push('/manager/dashboard');
      } else {
        router.push('/staff/mypage');
      }
      router.refresh();
    } else {
      setError('ログインIDまたはパスワードが正しくありません');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={`glass-panel ${styles.loginBox}`}>
        <div className={styles.logo}>
          <picture>
            {/* ダークモード（夜）: 白ロゴ */}
            <source srcSet="/_thehour_logo_20250929_ol_6.png" media="(prefers-color-scheme: dark)" />
            {/* ライトモード（昼）: 黒ロゴ */}
            <img src="/_thehour_logo_20250929_ol_19.png" alt="MY THE HOUR" className={styles.logoImage} />
          </picture>
        </div>
        
        <h1 className={styles.title}>ログイン</h1>
        <p className={styles.subtitle}>業務システムへアクセスします</p>

        <form className={styles.form} onSubmit={handleLogin}>
          <div className={styles.inputGroup}>
            <label htmlFor="loginId">ログインID</label>
            <input
              type="text"
              id="loginId"
              name="loginId"
              placeholder="your-login-id"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">パスワード</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={styles.errorMsg}>❌ {error}</div>
          )}
          
          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}
