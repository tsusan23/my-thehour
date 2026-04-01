"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

interface Store { id: number; name: string; }

export default function ExportPage() {
  const { data: session, status } = useSession();
  const userRole = (session?.user as any)?.role || '';
  const isExec = ['マネージャー', '代表'].includes(userRole);

  const [stores, setStores] = useState<Store[]>([]);
  const [exportType, setExportType] = useState('daily');
  const [storeId, setStoreId] = useState('');
  const [yearMonth, setYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetch('/api/admin/stores').then(r => r.json()).then(json => {
      if (json.success) setStores(json.stores);
    });
  }, []);

  const buildExportUrl = () => {
    const params = new URLSearchParams({ type: exportType });
    if (storeId) params.set('storeId', storeId);
    if (exportType !== 'staff') params.set('yearMonth', yearMonth);
    return `/api/admin/export?${params.toString()}`;
  };

  const exportTypeLabel = {
    daily: '日次スタッフ実績',
    staff: 'スタッフ一覧',
    kgi:   'KGI目標設定',
  }[exportType] || '';

  if (status === 'loading') return <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>;
  if (!['店長', 'マネージャー', '代表'].includes(userRole)) {
    return <div style={{ padding: '2rem', color: 'var(--destructive)' }}>権限がありません</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <Link href="/admin/settings" className={styles.backLink}>&lt; 管理・設定へ戻る</Link>
        <h1>📤 データエクスポート</h1>
        <p>業績データをCSV形式でダウンロードし、Excelやスプレッドシートで活用できます。</p>
      </header>

      {/* CSV Export */}
      <section className={`glass-panel ${styles.exportCard}`}>
        <h2>📊 CSVエクスポート</h2>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>エクスポートの種類</label>
            <select
              className={styles.formSelect}
              value={exportType}
              onChange={e => setExportType(e.target.value)}
            >
              <option value="daily">日次スタッフ実績</option>
              <option value="staff">スタッフ一覧</option>
              <option value="kgi">KGI目標設定</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>店舗（空欄で全店舗）</label>
            <select
              className={styles.formSelect}
              value={storeId}
              onChange={e => setStoreId(e.target.value)}
            >
              <option value="">全店舗</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {exportType !== 'staff' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>対象月</label>
              <input
                type="month"
                className={styles.formInput}
                value={yearMonth}
                onChange={e => setYearMonth(e.target.value)}
              />
            </div>
          )}
        </div>

        <hr className={styles.divider} />

        <p className={styles.hint}>
          📁 ダウンロードされるファイル：<strong>{exportTypeLabel}</strong>
          {exportType !== 'staff' && ` (${yearMonth})`}
          {storeId && ` — ${stores.find(s => String(s.id) === storeId)?.name || ''}`}
        </p>

        <a
          href={buildExportUrl()}
          download
          className={styles.downloadBtn}
        >
          ⬇️ CSVをダウンロード
        </a>
      </section>

      {/* DB Backup — 代表のみ */}
      {isExec && (
        <section className={styles.backupCard}>
          <h2>💾 データベースバックアップ</h2>
          <p className={styles.backupNote}>
            全データが入ったデータベースファイル（<code>.db</code>）をそのままダウンロードします。<br />
            定期的にバックアップを取得し、安全な場所に保管することを推奨します。<br />
            復元が必要な場合は <code>prisma/dev.db</code> を置き換えてサーバーを再起動してください。
          </p>
          <a href="/api/admin/backup" download className={styles.backupBtn}>
            📦 DBファイルをダウンロード
          </a>
          <p className={styles.hint}>
            ※ ファイル名にタイムスタンプが自動付与されます（例: mth_backup_20260401_1530.db）
          </p>
        </section>
      )}
    </div>
  );
}
