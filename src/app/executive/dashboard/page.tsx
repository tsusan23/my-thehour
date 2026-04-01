export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import LogoutBtn from '@/components/LogoutBtn';
import styles from './page.module.css';
import managerStyles from '@/app/manager/dashboard/page.module.css';

export default async function ExecutiveDashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!user || !['マネージャー', '代表'].includes(user.role)) {
    redirect('/manager/dashboard');
  }

  const userName = user.name || 'ゲスト';
  const userRole = user.role || '';
  const avatarUrl = user.avatarUrl || null;

  const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const todayStr = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}-${String(jstNow.getDate()).padStart(2, '0')}T00:00:00.000Z`;
  const targetDate = new Date(todayStr);
  const targetMonth = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}`;
  const firstDayOfMonth = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1);
  const lastDayOfMonth = new Date(jstNow.getFullYear(), jstNow.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch ALL stores with all staff data
  const stores = await prisma.store.findMany({
    include: {
      users: {
        where: { status: 'ACTIVE' },
        include: {
          dailyStaffReports: {
            where: { targetDate: { gte: firstDayOfMonth, lte: lastDayOfMonth } }
          },
          monthlyActionPlans: {
            where: { targetMonth }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  // Aggregate per-store metrics
  const storeData = stores.map(store => {
    let todayRevenue = 0;
    let mtdRevenue = 0;
    let mtdKgiTarget = 0;
    let attendingCount = 0;
    let offDayCount = 0;
    let totalNewVisitors = 0;

    store.users.forEach((staff: any) => {
      const todayReport = staff.dailyStaffReports?.find(
        (r: any) => new Date(r.targetDate).getTime() === targetDate.getTime()
      );

      if (todayReport?.submissionStatus === 'OFF_DAY') {
        offDayCount++;
      } else {
        attendingCount++;
        if (todayReport) {
          todayRevenue += (todayReport.newRevenue || 0) + (todayReport.existingRevenue || 0);
          totalNewVisitors += todayReport.newVisitors || 0;
        }
      }

      // MTD revenue from all submitted reports
      staff.dailyStaffReports?.forEach((r: any) => {
        if (r.submissionStatus === 'SUBMITTED' || r.submissionStatus === '提出済') {
          mtdRevenue += (r.newRevenue || 0) + (r.existingRevenue || 0);
        }
      });

      // Sum KGI targets
      const kgi = staff.monthlyActionPlans?.[0]?.targetKgi || 0;
      mtdKgiTarget += kgi;
    });

    const progressPercent = mtdKgiTarget > 0
      ? Math.min(100, Math.round((mtdRevenue / mtdKgiTarget) * 100))
      : 0;

    return {
      id: store.id,
      name: store.name,
      staffCount: store.users.length,
      attendingCount,
      offDayCount,
      todayRevenue,
      mtdRevenue,
      mtdKgiTarget,
      progressPercent,
      totalNewVisitors,
    };
  });

  // All-store totals
  const grandTotalTodayRevenue = storeData.reduce((a, s) => a + s.todayRevenue, 0);
  const grandTotalMtdRevenue = storeData.reduce((a, s) => a + s.mtdRevenue, 0);
  const grandTotalKgiTarget = storeData.reduce((a, s) => a + s.mtdKgiTarget, 0);
  const grandTotalNewVisitors = storeData.reduce((a, s) => a + s.totalNewVisitors, 0);
  const grandProgressPercent = grandTotalKgiTarget > 0
    ? Math.min(100, Math.round((grandTotalMtdRevenue / grandTotalKgiTarget) * 100))
    : 0;

  return (
    <div className={managerStyles.container}>
      {/* Header */}
      <header className={`glass-panel ${managerStyles.header}`}>
        <div className={managerStyles.headerTop}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 className={styles.hqTitle}>🏢 本部ダッシュボード</h1>
            </div>
            <p style={{ color: 'var(--secondary-foreground)', fontSize: '0.9rem', margin: 0 }}>
              全店舗の業績をリアルタイムで把握します
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {avatarUrl ? (
                <Image src={avatarUrl} alt={userName} width={36} height={36} style={{ borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                  {userName.charAt(0)}
                </div>
              )}
              <div>
                <span style={{ fontWeight: 700 }}>{userName}</span>
                <span style={{ marginLeft: '0.4rem', background: 'rgba(139,92,246,0.2)', color: '#a78bfa', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {userRole}
                </span>
              </div>
            </div>
            <LogoutBtn />
          </div>
        </div>

        {/* Grand Total KPIs */}
        <div className={styles.hqSummaryGrid}>
          <div className={styles.hqKpiCard}>
            <span className={styles.hqKpiLabel}>全店舗 今日の売上</span>
            <strong className={styles.hqKpiValue}>¥{grandTotalTodayRevenue.toLocaleString()}</strong>
          </div>
          <div className={styles.hqKpiCard}>
            <span className={styles.hqKpiLabel}>全店舗 今月累計売上</span>
            <strong className={styles.hqKpiValue}>¥{grandTotalMtdRevenue.toLocaleString()}</strong>
          </div>
          <div className={styles.hqKpiCard}>
            <span className={styles.hqKpiLabel}>全店舗 今日の新規</span>
            <strong className={styles.hqKpiValue}>{grandTotalNewVisitors}名</strong>
          </div>
          <div className={styles.hqKpiCard}>
            <span className={styles.hqKpiLabel}>全社KGI達成率</span>
            <strong className={styles.hqKpiValue}>{grandProgressPercent}%</strong>
          </div>
        </div>

        <div className={managerStyles.headerActions}>
          <Link href="/admin/settings" className={managerStyles.adminConfigBtn}>
            ⚙️ 管理・設定画面へ
          </Link>
          <Link href="/manager/dashboard" className={managerStyles.actionBtn} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            👤 店長ビューへ切替
          </Link>
        </div>
      </header>

      {/* Store Card Grid */}
      <div className={styles.storeCardGrid}>
        {storeData.map(store => (
          <div key={store.id} className={`glass-panel ${styles.storeCard}`}>
            <div className={styles.storeCardHeader}>
              <span className={styles.storeCardName}>
                🏥 {store.name}
              </span>
              <div className={styles.storeAttendance}>
                <span>出勤 {store.attendingCount}名</span>
                <span>公休 {store.offDayCount}名</span>
              </div>
            </div>

            <div className={styles.storeKpiRow}>
              <div className={styles.storeKpiItem}>
                <span className={styles.storeKpiLabel}>今日の売上</span>
                <span className={styles.storeKpiValue}>¥{store.todayRevenue.toLocaleString()}</span>
              </div>
              <div className={styles.storeKpiItem}>
                <span className={styles.storeKpiLabel}>今月累計売上</span>
                <span className={styles.storeKpiValue}>¥{store.mtdRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className={styles.storeMtdSection}>
              <div className={styles.storeMtdHeader}>
                <span className={styles.storeMtdLabel}>今月KGI進捗</span>
                <span className={styles.storeMtdNum}>
                  {store.progressPercent}% 
                  {store.mtdKgiTarget > 0 && (
                    <span style={{ color: 'var(--secondary-foreground)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>
                      (目標: ¥{store.mtdKgiTarget.toLocaleString()})
                    </span>
                  )}
                </span>
              </div>
              <div className={styles.storeProgressBar}>
                <div
                  className={styles.storeProgressFill}
                  style={{ width: `${store.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
