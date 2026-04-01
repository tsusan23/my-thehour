export const dynamic = 'force-dynamic';
import prisma from '@/lib/prisma';
import Image from 'next/image';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import styles from './page.module.css';
import StatusToggleBtn from '@/components/StatusToggleBtn';
import DailyReportForm from '@/components/DailyReportForm';
import LogoutBtn from '@/components/LogoutBtn';

export default async function ManagerDashboard() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || '';

  // Executives see the HQ store-level dashboard instead
  if (['マネージャー', '代表'].includes(userRole)) {
    redirect('/executive/dashboard');
  }

  const isManagerOrAdmin = ['店長', 'マネージャー', '代表'].includes(userRole);
  const managerName = (session?.user as any)?.name || 'ゲスト';
  const managerAvatar = (session?.user as any)?.avatarUrl || null;

  const storeId = 1; // MVP Hardcoded for Shinjuku Store
  // Use current date at 00:00:00 for simple JST matching (in real prod, consider timezone carefully)
  const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const todayStr = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}-${String(jstNow.getDate()).padStart(2, '0')}T00:00:00.000Z`;
  const targetDate = new Date(todayStr);

  const firstDayOfMonth = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1);
  const lastDayOfMonth = new Date(jstNow.getFullYear(), jstNow.getMonth() + 1, 0, 23, 59, 59, 999);

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    include: {
      users: {
        where: { role: { name: { in: ['新人', 'スタッフ'] } }, status: 'ACTIVE' },
        include: {
          dailyStaffReports: { 
            where: { targetDate: { gte: firstDayOfMonth, lte: lastDayOfMonth } } 
          },
          dailyActionPlans: { where: { targetDate } },
          dailyTasks: { where: { targetDate } },
          monthlyActionPlans: { 
            where: { targetMonth: `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}` } 
          }
        }
      }
    }
  });

  if (!store) {
    return <div>Store not found.</div>;
  }

  // Calculate top KPI Summaries
  let totalRevenue = 0;
  let totalNewVisitors = 0;
  let totalNewReservations = 0;
  let submittedCount = 0;
  let activeStaffCount = 0;

  store.users.forEach((u: any) => {
    const r = u.dailyStaffReports?.[0];
    
    // 公休のスタッフは分母や計算から除外
    if (r?.submissionStatus === 'OFF_DAY') {
      return;
    }
    
    activeStaffCount++;

    if (r) {
      totalRevenue += (r.newRevenue || 0) + (r.existingRevenue || 0);
      totalNewVisitors += (r.newVisitors || 0);
      totalNewReservations += (r.newNextReservations || 0);
      if (r.submissionStatus === '提出済' || r.submissionStatus === 'SUBMITTED') {
        submittedCount++;
      }
    }
  });

  const submissionRate = activeStaffCount > 0 ? Math.round((submittedCount / activeStaffCount) * 100) : 0;
  const missingSubmissionCount = activeStaffCount - submittedCount;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1>店長ダッシュボード</h1>
          <div className={styles.storeInfo}>
            <span className={styles.storeName}>{store.name}</span>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {managerAvatar ? (
                  <Image src={managerAvatar} alt={managerName} width={32} height={32} className={styles.avatarImg} style={{ borderRadius: '50%' }} />
                ) : (
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {managerName.charAt(0)}
                  </div>
                )}
                <span className={styles.userName}>{managerName} {userRole}</span>
              </div>
              <LogoutBtn />
            </div>
          </div>
        </div>
        
        {/* Store Summary KPIs */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>今日の合計売上</span>
            <strong className={styles.kpiValue}>¥{totalRevenue.toLocaleString()}</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>今日の新規数</span>
            <strong className={styles.kpiValue}>{totalNewVisitors}名</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>今日の予約新規数</span>
            <strong className={styles.kpiValue}>{totalNewReservations}名</strong>
          </div>
          <div className={styles.kpiCard}>
            <span className={styles.kpiLabel}>未提出 / 提出率</span>
            <strong className={styles.kpiValue}>
              <span className={missingSubmissionCount > 0 ? styles.alertText : ''}>{missingSubmissionCount}名</span> / {submissionRate}%
            </strong>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          {isManagerOrAdmin && (
            <Link href="/admin/settings" className={styles.adminConfigBtn}>
              ⚙️ 管理・設定画面へ
            </Link>
          )}
          <button className={styles.actionBtn}>店舗単位の日次数字入力</button>
        </div>
      </header>

      {/* Staff List Grid */}
      <div className={styles.staffGrid}>
        
        {store.users.map((staff: any) => {
          // Find today's report for specific today-only fields
          const todayReport = staff.dailyStaffReports?.find((r: any) => new Date(r.targetDate).getTime() === targetDate.getTime());
          
          const plan = staff.dailyActionPlans?.[0];
          const monthlyPlan = staff.monthlyActionPlans?.[0];
          const tasks = staff.dailyTasks || [];

          // Monthly to date revenue
          const mtdRevenue = staff.dailyStaffReports?.reduce((acc: number, r: any) => {
            if (r.submissionStatus === 'SUBMITTED' || r.submissionStatus === '提出済') {
              return acc + (r.newRevenue || 0) + (r.existingRevenue || 0);
            }
            return acc;
          }, 0) || 0;

          const isSubmitted = todayReport && (todayReport.submissionStatus === '提出済' || todayReport.submissionStatus === 'SUBMITTED');
          const isOffDay = todayReport?.submissionStatus === 'OFF_DAY';
          const todayRevenue = todayReport ? ((todayReport.newRevenue || 0) + (todayReport.existingRevenue || 0)) : 0;
          
          const newVisitors = todayReport?.newVisitors || 0;
          const newTicketPurchasers = todayReport?.newTicketPurchasers || 0;
          const ticketRate = newVisitors > 0 ? Math.round((newTicketPurchasers / newVisitors) * 100) : 0;
          const ticketRateText = newVisitors > 0 ? `${newTicketPurchasers}/${newVisitors}名 (${ticketRate}%)` : '--';

          const kgiTarget = monthlyPlan?.targetKgi ? monthlyPlan.targetKgi : 1000000;
          const progressPercent = Math.min(100, Math.round((mtdRevenue / kgiTarget) * 100)); 

          const completedTasks = tasks.filter((t: any) => t.isComplete).length;
          const totalTasks = tasks.length;
          
          let statusText = "未着手";
          if (isOffDay) {
            statusText = "公休";
          } else if (isSubmitted) {
            statusText = "提出済";
          } else if (todayReport || plan || totalTasks > 0) {
            statusText = "入力中";
          }

          return (
            <div key={staff.id} className={`glass-panel ${styles.staffCard} ${isOffDay ? styles.inactiveCard : ''}`}>
              <div className={styles.staffHeader}>
                <div className={styles.staffProfile}>
                  {staff.avatarUrl ? (
                    <Image
                      src={staff.avatarUrl}
                      alt={staff.name}
                      width={44}
                      height={44}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <div className={styles.avatar}>{staff.name.charAt(0)}</div>
                  )}
                  <div>
                    <h3 className={styles.staffName}>{staff.name}</h3>
                    <span className={styles.statusLabel}>{isOffDay ? '公休' : '出勤'}</span>
                  </div>
                </div>
                <StatusToggleBtn 
                  userId={staff.id} 
                  initialStatus={todayReport?.submissionStatus || '未着手'} 
                  targetDate={todayStr} 
                />
              </div>
              
              <div className={styles.staffStats}>
                <div className={styles.statLine}>
                  <span>今日売上</span>
                  <span><strong>¥{todayRevenue.toLocaleString()}</strong></span>
                </div>
                <div className={styles.statLine}>
                  <span>回数券購入率</span>
                  <span><strong>{ticketRateText}</strong></span>
                </div>
                <div className={styles.progressHeader}>
                <span className={styles.progressLabel}>KGI進捗 (今月累計計算)</span>
                <span className={styles.progressNum}>{mtdRevenue.toLocaleString()} / {kgiTarget.toLocaleString()}円</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}></div>
              </div>
              </div>
              
              <div className={styles.staffActionPlan}>
                <h4>今日のアクションプラン</h4>
                <p>{plan?.plan || '（未入力）'}</p>
              </div>
              
              <div className={styles.taskProgress}>
                <span>タスク消化率</span>
                <span>{completedTasks} / {totalTasks}</span>
              </div>
              
              <button className={styles.detailBtn}>詳細ページへ</button>
            </div>
          );
        })}
      </div>

      {/* Manager's Personal Daily Report Input Area */}
      <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--foreground)' }}>📝 店長自身の日次報告・タスク入力</h2>
        <DailyReportForm userId={Number((session?.user as any)?.id) || 2} userName={managerName} kgiTarget={2000000} monthToDateRevenue={0} avatarUrl={managerAvatar} />
      </div>

    </div>
  );
}
