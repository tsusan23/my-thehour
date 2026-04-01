"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import styles from './page.module.css';

export default function StaffManagementPage() {
  const { data: session, status } = useSession();
  
  const [staffList, setStaffList] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  
  const [filterStore, setFilterStore] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    loginId: '',
    roleId: '',
    storeId: '',
    password: '',
    isInactive: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const isExecutive = session?.user && ['マネージャー', '代表'].includes((session.user as any).role);
  const userStoreId = (session?.user as any)?.storeId;

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      let url = '/api/manager/staff?';
      if (filterStore !== 'all') url += `storeId=${filterStore}&`;
      if (showInactive) url += `status=ALL`; // "ALL" means we ignore the active filter in backend, backend defaults to ACTIVE if not set to ALL (Actually, wait, my backend logic: if (statusParam === 'ACTIVE') query.status = 'ACTIVE'. So sending 'ALL' works!)
      
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStaffList(json.staff);
        setStores(json.stores);
        setRoles(json.roles);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStaff();
    }
  }, [status, filterStore, showInactive]);

  const openEditModal = (staff: any) => {
    setEditingStaff(staff);
    setEditForm({
      name: staff.name || '',
      loginId: staff.loginId || '',
      roleId: staff.roleId ? String(staff.roleId) : '',
      storeId: staff.storeId ? String(staff.storeId) : '',
      password: '',
      isInactive: staff.status === 'INACTIVE'
    });
    setSaveMsg(null);
  };

  const closeEditModal = () => {
    setEditingStaff(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMsg(null);

    const payload: any = {
      name: editForm.name,
      loginId: editForm.loginId,
      roleId: editForm.roleId,
      status: editForm.isInactive ? 'INACTIVE' : 'ACTIVE'
    };
    
    // Only send storeId if executive
    if (isExecutive) {
      payload.storeId = editForm.storeId;
    }
    
    // Only send password if user typed something
    if (editForm.password) {
      payload.password = editForm.password;
    }

    try {
      const res = await fetch(`/api/manager/staff/${editingStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setSaveMsg({ type: 'success', text: '更新しました' });
        fetchStaff(); // Refresh list
        setTimeout(() => closeEditModal(), 1500);
      } else {
        setSaveMsg({ type: 'error', text: json.error || 'エラーが発生しました' });
      }
    } catch (e) {
      setSaveMsg({ type: 'error', text: 'ネットワークエラー' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;
  if (!session?.user) return <div style={{ padding: '2rem' }}>認証エラー</div>;

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1>スタッフ管理コンソール</h1>
          <Link href="/admin/settings" className={styles.backLink}>&lt; 管理・設定へ戻る</Link>
        </div>
        
        {/* Filters */}
        <div className={styles.filterSection}>
          {isExecutive && (
            <>
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
            </>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--foreground)', fontSize: '0.9rem', marginLeft: isExecutive ? '1rem' : '0' }}>
            <input 
              type="checkbox" 
              checked={showInactive} 
              onChange={(e) => setShowInactive(e.target.checked)} 
            />
            退職者（無効化済）も表示する
          </label>
        </div>
      </header>

      {/* Table */}
      <div className={`glass-panel ${styles.tableWrapper}`}>
        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>
        ) : (
          <table className={styles.staffTable}>
            <thead>
              <tr>
                <th>スタッフ名</th>
                <th>ログインID</th>
                <th>所属店舗</th>
                <th>役職</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(staff => (
                <tr key={staff.id} className={staff.status === 'INACTIVE' ? styles.inactiveRow : ''}>
                  <td>
                    <div className={styles.staffInfo}>
                      {staff.avatarUrl ? (
                         <Image src={staff.avatarUrl} alt={staff.name} width={32} height={32} className={styles.avatarImg} />
                      ) : (
                         <div className={styles.avatar}>{staff.name.charAt(0)}</div>
                      )}
                      <span>
                        {staff.name}
                        {staff.status === 'INACTIVE' && <span className={styles.inactiveBadge}>退職済</span>}
                      </span>
                    </div>
                  </td>
                  <td>{staff.loginId}</td>
                  <td>{staff.storeName}</td>
                  <td>{staff.roleName}</td>
                  <td>
                    <button className={styles.actionBtn} onClick={() => openEditModal(staff)}>編集</button>
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--secondary-foreground)' }}>該当するスタッフが見つかりません</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editingStaff && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <span>{editingStaff.name} の設定変更</span>
              <button className={styles.closeBtn} onClick={closeEditModal}>&times;</button>
            </div>

            <form onSubmit={handleSave}>
              <div className={styles.formGroup}>
                <label>名前</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>ログインID</label>
                <input 
                  type="text" 
                  className={styles.input}
                  value={editForm.loginId}
                  onChange={(e) => setEditForm({...editForm, loginId: e.target.value})}
                  required
                />
              </div>

              {isExecutive && (
                <div className={styles.formGroup}>
                  <label>所属店舗</label>
                  <select 
                    className={styles.input}
                    value={editForm.storeId}
                    onChange={(e) => setEditForm({...editForm, storeId: e.target.value})}
                  >
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.formGroup}>
                <label>役職</label>
                <select 
                  className={styles.input}
                  value={editForm.roleId}
                  onChange={(e) => setEditForm({...editForm, roleId: e.target.value})}
                >
                  {roles.map(role => {
                    // 店長はマネージャー以上への変更不可
                    if (!isExecutive && ['マネージャー', '代表'].includes(role.name)) return null;
                    return <option key={role.id} value={role.id}>{role.name}</option>;
                  })}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>【管理者】パスワード強制リセット</label>
                <input 
                  type="password" 
                  className={styles.input}
                  placeholder="新しいパスワード（変更する場合のみ）"
                  value={editForm.password}
                  onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                  minLength={6}
                />
                <span className={styles.hint}>※空欄のままなら変更されません</span>
              </div>

              <div className={styles.dangerZone}>
                <label className={styles.dangerLabel}>
                  <input 
                    type="checkbox" 
                    checked={editForm.isInactive}
                    onChange={(e) => setEditForm({...editForm, isInactive: e.target.checked})}
                    disabled={editingStaff.id === Number((session?.user as any).id)}
                  />
                  このアカウントを退職済（無効化）にする
                </label>
                <p className={styles.hint} style={{ marginTop: '0.5rem' }}>
                  無効化するとログインできなくなり、通常の画面上にも表示されなくなります。<br />
                  （過去の実績データは安全に保持されます）
                </p>
              </div>

              {saveMsg && (
                <p style={{ marginTop: '1rem', color: saveMsg.type === 'error' ? 'var(--destructive)' : 'var(--success)', fontWeight: 'bold' }}>
                  {saveMsg.text}
                </p>
              )}

              <button type="submit" className={styles.saveBtn} disabled={isSaving}>
                {isSaving ? '保存中...' : '設定を保存する'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
