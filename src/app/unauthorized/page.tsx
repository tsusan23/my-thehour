export default function UnauthorizedPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '1rem',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '4rem' }}>🔒</span>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>アクセスが拒否されました</h1>
      <p style={{ color: 'var(--secondary-foreground)' }}>このページにアクセスする権限がありません。</p>
      <a href="/login" style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}>ログインページに戻る</a>
    </div>
  );
}
