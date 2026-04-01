"use client";
import Link from 'next/link';
import LogoutBtn from '@/components/LogoutBtn';
import styles from './page.module.css';

export default function AdminSettingsPage() {
  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/manager/dashboard" className={styles.backLink}>&lt; ダッシュボードに戻る</Link>
          <LogoutBtn />
        </div>
        <div className={styles.headerTitle}>
          <h1>システム管理・設定</h1>
          <span className={styles.adminBadge}>管理者専用</span>
        </div>
        <p className={styles.headerDesc}>
          システム全体の設定や、スタッフアカウントの管理・マスタデータの編集を行います。
        </p>
      </header>

      <div className={styles.grid}>
        <section className={`glass-panel ${styles.settingSection}`}>
          <div className={styles.sectionHeader}>
            <h2>👥 スタッフ・組織管理</h2>
            <p>スタッフのアカウント発行や、所属店舗・役職の変更を行います。</p>
          </div>
          <div className={styles.cardList}>
            <Link href="/admin/staff/new" className={styles.actionCard}>
              <div className={styles.iconWrapper}>✨</div>
              <div className={styles.cardBody}>
                <h3>新規スタッフアカウント発行</h3>
                <p>新しく入社したスタッフのログイン用アカウントを作成します。</p>
              </div>
            </Link>
            
            <Link href="/manager/staff" className={styles.actionCard}>
              <div className={styles.iconWrapper}>📋</div>
              <div className={styles.cardBody}>
                <h3>スタッフ一覧・権限変更</h3>
                <p>既存スタッフのパスワード再発行や、役職・所属店舗・退職状態を変更します。</p>
              </div>
            </Link>
          </div>
        </section>

        <section className={`glass-panel ${styles.settingSection}`}>
          <div className={styles.sectionHeader}>
            <h2>🏢 店舗・マスタ情報管理</h2>
            <p>店舗の追加や、メニュー（回数券など）の設定を変更します。</p>
          </div>
          <div className={styles.cardList}>
            <Link href="/admin/stores" className={styles.actionCard}>
              <div className={styles.iconWrapper}>🏥</div>
              <div className={styles.cardBody}>
                <h3>新しい店舗の追加</h3>
                <p>組織内に新しい店舗（新宿院・渋谷院など）を登録・管理します。</p>
              </div>
            </Link>
            
            <Link href="/manager/kpi" className={styles.actionCard}>
              <div className={styles.iconWrapper}>🎯</div>
              <div className={styles.cardBody}>
                <h3>KPI目標設定</h3>
                <p>各店舗やスタッフごとの月間目標設定（KGIや各種KPI）を一括管理します。</p>
              </div>
            </Link>
          </div>
        </section>

        <section className={`glass-panel ${styles.settingSection}`}>
          <div className={styles.sectionHeader}>
            <h2>📤 データ管理・バックアップ</h2>
            <p>業績データをCSV（Excel）で書き出したり、データベースのバックアップを取得します。</p>
          </div>
          <div className={styles.cardList}>
            <Link href="/admin/export" className={styles.actionCard}>
              <div className={styles.iconWrapper}>📊</div>
              <div className={styles.cardBody}>
                <h3>データエクスポート（CSV）</h3>
                <p>日次実績・スタッフ一覧・KGI目標をExcelで開けるCSVにして書き出します。</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
