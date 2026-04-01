"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: number;
  initialStatus: string; // '未着手' | '入力中' | '提出済' | 'OFF_DAY'
  targetDate: string; // ISO string without time
}

export default function StatusToggleBtn({ userId, initialStatus, targetDate }: Props) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  // Derive display status
  let displayStatus = initialStatus;
  let badgeClass = 'badgeDefault';
  if (displayStatus === '提出済' || displayStatus === 'SUBMITTED') {
    badgeClass = 'badgeSuccess';
    displayStatus = '提出済';
  } else if (displayStatus === 'OFF_DAY') {
    badgeClass = 'badgeDefault';
    displayStatus = '公休';
  } else if (displayStatus === '入力中' || displayStatus === 'DRAFT') {
    badgeClass = 'badgeWarning';
    displayStatus = '入力中';
  } else {
    displayStatus = '未着手';
  }

  const toggleOffDay = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    // Toggle logic: If currently OFF_DAY, revert to UNSTARTED, else set to OFF_DAY
    const newStatus = displayStatus === '公休' ? 'UNSTARTED' : 'OFF_DAY';

    try {
      const res = await fetch('/api/manager/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          targetDate,
          status: newStatus
        })
      });

      if (res.ok) {
        // Refresh the page to load updated data server-side
        router.refresh();
      } else {
        alert('ステータスの更新に失敗しました');
      }
    } catch {
      alert('ネットワークエラー');
    } finally {
      setIsUpdating(false);
    }
  };

  const badgeStyle = {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: badgeClass === 'badgeDefault' ? 'var(--foreground)' : '#fff',
    backgroundColor: badgeClass === 'badgeSuccess' ? 'var(--success)' : 
                     badgeClass === 'badgeWarning' ? 'var(--accent)' : 'var(--border)'
  };

  return (
    <button 
      onClick={toggleOffDay} 
      style={badgeStyle} 
      title="クリックで公休状態を切り替え"
      disabled={isUpdating}
    >
      {isUpdating ? '...' : displayStatus}
    </button>
  );
}
