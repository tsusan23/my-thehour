"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

interface StaffDataItem {
  id: number;
  name: string;
  storeName: string;
  targetKgi: number;
}

export default function KPISettingsPage() {
  const { data: session, status } = useSession();

  const [targetMonth, setTargetMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [filterStore, setFilterStore] = useState('all');
  const [stores, setStores] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<StaffDataItem[]>([]);
  
  const [kgiMap, setKgiMap] = useState<Record<number, string>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isExecutive = session?.user && ['マネージャー', '代表'].includes((session.user as any).role);

  const fetchData = async () => {
    setIsLoading(true);
    setMsg(null);
    try {
      let url = `/api/manager/kpi?targetMonth=${targetMonth}`;
      if (filterStore !== 'all') url += `&storeId=${filterStore}`;
      
      const res = await fetch(url);
      const json = await res.json();
      
      if (json.success) {
        setStaffList(json.staff);
        setStores(json.stores || []);
        
        // Initialize KGI input map
        const newMap: Record<number, string> = {};
        json.staff.forEach((s: StaffDataItem) => {
          newMap[s.id] = s.targetKgi.toLocaleString();
        });
        setKgiMap(newMap);
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: 'error', text: 'データの取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, targetMonth, filterStore]);

  const handleKgiChange = (id: number, rawValue: string) => {
    // Only allow numbers and commas for typing
    const cleanValue = rawValue.replace(/[^\d,]/g, '');
    setKgiMap(prev => ({ ...prev, [id]: cleanValue }));
  };

  const handleKgiBlur = (id: number) => {
    // Format with commas on blur
    const numericValue = parseInt((kgiMap[id] || '0').replace(/,/g, ''), 10);
    if (!isNaN(numericValue)) {
      setKgiMap(prev => ({ ...prev, [id]: numericValue.toLocaleString() }));
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setMsg(null);

    // Prepare payload
    const payloadData = staffList.map(s => {
      const valStr = kgiMap[s.id] || '0';
      const kgi = parseInt(valStr.replace(/,/g, ''), 10);
      return {
        userId: s.id,
        targetKgi: isNaN(kgi) ? 0 : kgi
      };
    });

    try {
      const res = await fetch('/api/manager/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetMonth,
          kpiData: payloadData
        })
      });

      const json = await res.json();
      if (json.success) {
        setMsg({ type: 'success', text: 'すべての目標設定を保存しました。' });
        // Optional: you can re-fetch to sync exact DB values
        fetchData();
      } else {
        setMsg({ type: 'error', text: json.error || '保存に失敗しました' });
      }
    } catch {
      setMsg({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!session?.user) return <div style={{ padding: '2rem' }}>認証エラー</div>;

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1>KPI/KGI 目標設定</h1>
          <Link href="/admin/settings" className={styles.backLink}>&lt; 管理・設定へ戻る</Link>
        </div>
        
        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>対象月:</span>
            <input 
              type="month" 
              className={styles.filterInput}
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
            />
          </div>

          {isExecutive && (
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>店舗絞り込み:</span>
              <select 
                className={styles.filterSelect} 
                value={filterStore}
                onChange={(e) => setFilterStore(e.target.value)}
              >
                <option value="all">全店舗</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </header>

      <main className={`glass-panel ${styles.mainContent}`}>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
          {targetMonth.replace('-', '年')}月の目標設定
        </h2>
        
        <div className={styles.tableWrapper}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>
          ) : (
            <table className={styles.targetTable}>
              <thead>
                <tr>
                  <th>スタッフ名</th>
                  <th>所属店舗</th>
                  <th>個人目標売上 (KGI)</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <tr key={staff.id}>
                    <td style={{ fontWeight: '600' }}>{staff.name}</td>
                    <td>{staff.storeName}</td>
                    <td>
                      <input 
                        type="text" 
                        value={kgiMap[staff.id] || ''}
                        onChange={(e) => handleKgiChange(staff.id, e.target.value)}
                        onBlur={() => handleKgiBlur(staff.id)}
                        className={styles.kgiInput}
                        placeholder="0"
                      />
                      <span className={styles.currencySymbol}>円</span>
                    </td>
                  </tr>
                ))}
                {staffList.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--secondary-foreground)' }}>
                      対象スタッフがいません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className={styles.actionFooter}>
          {msg && (
            <span className={`${styles.message} ${styles[msg.type]}`}>
              {msg.type === 'success' ? '✅ ' : '❌ '}{msg.text}
            </span>
          )}
          <button 
            className={styles.saveBtn} 
            onClick={handleSaveAll}
            disabled={isSaving || staffList.length === 0 || isLoading}
          >
            {isSaving ? '保存中...' : '一括保存する'}
          </button>
        </div>
      </main>
    </div>
  );
}
