"use client";
import { signOut } from 'next-auth/react';

interface Props {
  compact?: boolean;
}

export default function LogoutBtn({ compact = false }: Props) {
  const handleLogout = () => {
    const confirmed = window.confirm('ログアウトしますか？');
    if (confirmed) {
      signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <button
      onClick={handleLogout}
      style={{
        background: 'transparent',
        color: 'var(--secondary-foreground)',
        border: '1px solid var(--border)',
        padding: compact ? '0.2rem 0.6rem' : '0.3rem 0.75rem',
        borderRadius: '6px',
        fontWeight: 400,
        fontSize: compact ? '0.7rem' : '0.75rem',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.3rem',
        opacity: 0.6,
        transition: 'opacity 0.2s, border-color 0.2s',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        e.currentTarget.style.color = '#ef4444';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.opacity = '0.6';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--secondary-foreground)';
      }}
    >
      <span style={{ fontSize: compact ? '0.65rem' : '0.7rem' }}>🚪</span>
      ログアウト
    </button>
  );
}
