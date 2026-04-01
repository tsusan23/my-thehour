"use client";
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function StaffSettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Avatar states
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile states
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initial name population
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  if (status === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground)' }}>読み込み中...</div>;
  }

  if (status === 'unauthenticated' || !session?.user) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--foreground)' }}>ログインが必要です</div>;
  }

  const user = session.user as any;

  // --- Avatar Handlers ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setAvatarMsg({ type: 'error', text: 'JPEG / PNG / WebP / GIF の画像のみアップロードできます' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'ファイルサイズは5MB以下にしてください' });
      return;
    }

    setSelectedFile(file);
    setAvatarMsg(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setAvatarMsg(null);

    try {
      const form = new FormData();
      form.append('avatar', selectedFile);
      form.append('userId', String(user.id));

      const res = await fetch('/api/user/avatar', { method: 'POST', body: form });
      const json = await res.json();

      if (json.success) {
        setAvatarMsg({ type: 'success', text: 'プロフィール写真を更新しました！' });
        setSelectedFile(null);
        // NextAuthのセッション（アイコン等）を再読込
        await update(); 
        router.refresh();
      } else {
        setAvatarMsg({ type: 'error', text: json.error || 'アップロードに失敗しました' });
      }
    } catch {
      setAvatarMsg({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setIsUploading(false);
    }
  };

  // --- Profile Name & Password Handlers ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (password && password !== confirmPassword) {
      setProfileMsg({ type: 'error', text: '新しいパスワードと確認用パスワードが一致しません。' });
      return;
    }

    setIsUpdatingProfile(true);

    try {
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, confirmPassword })
      });
      const json = await res.json();
      
      if (json.success) {
        setProfileMsg({ type: 'success', text: 'プロフィール情報を更新しました！' });
        setPassword('');
        setConfirmPassword('');
        // Update session name context
        await update({ name });
        router.refresh();
      } else {
        setProfileMsg({ type: 'error', text: json.error || '更新に失敗しました' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'ネットワークエラーが発生しました' });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const initial = user.name ? user.name.charAt(0) : '?';
  const displayAvatar = previewUrl || user.avatarUrl;

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <Link href="/staff/mypage" className={styles.backLink}>&lt; マイページに戻る</Link>
        <h1>アカウント設定</h1>
      </header>

      <div className={`glass-panel ${styles.section}`}>
        {/* ---- Avatar Section ---- */}
        <div className={styles.avatarSection}>
          <div className={styles.previewRing} onClick={() => fileInputRef.current?.click()} title="クリックして写真を選択">
            {displayAvatar ? (
              <Image src={displayAvatar} alt="preview" fill className={styles.avatarImg} style={{ objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <div className={styles.avatarInitial}>{initial}</div>
            )}
            <div className={styles.cameraOverlay}>📷</div>
          </div>

          <p className={styles.changeHint}>
            {previewUrl ? '選択中の画像でプレビュー中' : 'アバターをクリックして写真を選択'}
          </p>

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            ref={fileInputRef}
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
        </div>

        <div className={styles.uploadArea}>
          {selectedFile && (
            <div className={styles.selectedFileName}>📎 {selectedFile.name}</div>
          )}

          {avatarMsg && (
            <p className={avatarMsg.type === 'success' ? styles.successMsg : styles.errorMsg}>
              {avatarMsg.type === 'success' ? '✅ ' : '❌ '}{avatarMsg.text}
            </p>
          )}

          <button
            className={styles.saveBtn}
            onClick={handleSaveAvatar}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'アップロード中...' : '写真を保存する'}
          </button>
        </div>

        <hr className={styles.divider} />

        {/* ---- Readonly User Info ---- */}
        <div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>ログインID</span>
            <span className={styles.infoValue}>{user.email || user.loginId}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>役職</span>
            <span className={styles.infoValue}>{user.role}</span>
          </div>
        </div>

        <hr className={styles.divider} />

        {/* ---- Profile Form (Name & Password) ---- */}
        <form onSubmit={handleUpdateProfile} className={styles.formSection}>
          <h2 className={styles.sectionHeader}>基本情報の変更</h2>
          
          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>表示名（氏名）</label>
            <input
              id="name"
              type="text"
              className={styles.formInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>新しいパスワード</label>
            <input
              id="password"
              type="password"
              className={styles.formInput}
              placeholder="変更しない場合は空欄のまま"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />
            <span className={styles.formHint}>※変更する場合のみ入力してください（最低6文字）</span>
          </div>

          {password && (
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.formLabel}>新しいパスワード（確認）</label>
              <input
                id="confirmPassword"
                type="password"
                className={styles.formInput}
                placeholder="もう一度入力してください"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {profileMsg && (
            <p className={profileMsg.type === 'success' ? styles.successMsg : styles.errorMsg} style={{ marginTop: '1rem' }}>
              {profileMsg.type === 'success' ? '✅ ' : '❌ '}{profileMsg.text}
            </p>
          )}

          <button
            type="submit"
            className={styles.updateBtn}
            disabled={isUpdatingProfile}
          >
            {isUpdatingProfile ? '保存中...' : '変更を保存する'}
          </button>
        </form>

      </div>
    </div>
  );
}
