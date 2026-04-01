"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

interface Store {
  id: number;
  name: string;
}

export default function StoreManagementPage() {
  const { data: session, status } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Inline edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/admin/stores');
      const json = await res.json();
      if (json.success) {
        setStores(json.stores);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStores();
    }
  }, [status]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStoreName })
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: `店舗「${json.store.name}」を追加しました` });
        setNewStoreName('');
        fetchStores();
      } else {
        setMsg({ type: 'error', text: json.error || '追加に失敗しました' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const startEditing = (store: Store) => {
    setEditingId(store.id);
    setEditingName(store.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleRename = async (id: number) => {
    if (!editingName.trim()) return;
    setIsRenaming(true);

    try {
      const res = await fetch('/api/admin/stores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingName })
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: `「${json.store.name}」に変更しました` });
        cancelEditing();
        fetchStores();
      } else {
        setMsg({ type: 'error', text: json.error || '変更に失敗しました' });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setIsRenaming(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (status === 'loading') return <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>;
  if (!session?.user || (session.user as any).role !== '代表') {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--destructive)' }}>権限がありません。代表アカウントのみアクセス可能です。</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <Link href="/admin/settings" className={styles.backLink}>&lt; 管理・設定へ戻る</Link>
        <h1>店舗の追加・管理</h1>
      </header>

      {/* Add new store */}
      <section className={`glass-panel ${styles.section}`}>
        <h2>新しい店舗を追加</h2>
        <form onSubmit={handleAddStore}>
          <div className={styles.formGroup}>
            <label htmlFor="storeName" className={styles.formLabel}>店舗名</label>
            <input
              id="storeName"
              type="text"
              className={styles.formInput}
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="例：渋谷院"
              required
            />
          </div>

          {msg && (
            <p className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>
              {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
            </p>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isSubmitting || !newStoreName.trim()}>
            {isSubmitting ? '追加中...' : '店舗を追加する'}
          </button>
        </form>
      </section>

      {/* Store list with inline rename */}
      <section className={`glass-panel ${styles.section}`}>
        <h2>登録済みの店舗一覧</h2>
        {stores.length === 0 ? (
          <p style={{ color: 'var(--secondary-foreground)' }}>店舗がありません</p>
        ) : (
          <div className={styles.storeList}>
            {stores.map(store => (
              <div key={store.id} className={styles.storeItem}>
                {editingId === store.id ? (
                  /* Inline edit mode */
                  <div className={styles.storeEditRow}>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(store.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '1rem' }}
                    />
                    <button
                      onClick={() => handleRename(store.id)}
                      disabled={isRenaming || !editingName.trim()}
                      className={styles.saveRenameBtn}
                    >
                      {isRenaming ? '...' : '保存'}
                    </button>
                    <button onClick={cancelEditing} className={styles.cancelRenameBtn}>
                      キャンセル
                    </button>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div>
                      <span className={styles.storeName}>{store.name}</span>
                      <span className={styles.storeId}>ID: {store.id}</span>
                    </div>
                    <button onClick={() => startEditing(store)} className={styles.renameBtn}>
                      ✏️ 名称変更
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
