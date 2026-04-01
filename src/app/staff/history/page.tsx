"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './page.module.css';

const EditReportModal = dynamic(() => import('@/components/EditReportModal'), { ssr: false });

// Row definitions for the spreadsheet
const ROW_DEFS = [
  { key: 'totalRevenue',  label: '総合入金 (売上)',  isCurrency: true  },
  { key: 'newRevenue',    label: '新規売上',          isCurrency: true  },
  { key: 'existingRevenue', label: '既存売上',        isCurrency: true  },
  { key: 'totalDigestion', label: '総合消化',         isCurrency: true  },
  { key: 'newVisitors',   label: '新規客数',          suffix: '名'      },
  { key: 'repeaters',     label: '新規リピート数',    suffix: '名'      },
  { key: 'repeatRate',    label: '新規リピート率',    isPercent: true   },
  { key: 'tickets',       label: '回数券購入数',      suffix: '名'      },
  { key: 'ticketRate',    label: '回数券購入率',      isPercent: true   },
  { key: 'totalSessions', label: '総施術数',          suffix: '件'      },
];

interface RawReport {
  id: number;
  userId: number;
  targetDate: string;
  newVisitors: number;
  newNextReservations: number;
  newTicketPurchasers: number;
  newRevenue: number;
  existingRevenue: number;
  newDigestionRevenue: number;
  existingDigestionRevenue: number;
  ticketFinishers: number;
  continuedUsers: number;
  totalSessions: number;
  newSessions: number;
  existingSessions: number;
  welfareSessions: number;
  submissionStatus: string;
}

export default function StaffHistoryPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'monthly';

  const [reports, setReports] = useState<RawReport[]>([]);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal state
  const [editingReport, setEditingReport] = useState<RawReport | null>(null);

  const userId = Number((session?.user as any)?.id);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/staff/history?userId=${userId}`);
      const json = await res.json();
      if (json.success) {
        setReports(json.reports);
        setUserName(json.userName);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  // ---- Build columns & aggregated data ----
  const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const yyyy = jstNow.getFullYear();
  const currentMonth = jstNow.getMonth(); // 0-11

  type ColData = {
    totalRevenue: number; newRevenue: number; existingRevenue: number; totalDigestion: number;
    newVisitors: number; repeaters: number; repeatRate: number;
    tickets: number; ticketRate: number; totalSessions: number;
    hasData: boolean;
    reportId?: number; // for clicking the day column
    rawReport?: RawReport;
  };

  function initColData(): ColData {
    return { totalRevenue: 0, newRevenue: 0, existingRevenue: 0, totalDigestion: 0,
             newVisitors: 0, repeaters: 0, repeatRate: 0,
             tickets: 0, ticketRate: 0, totalSessions: 0, hasData: false };
  }

  function addToCol(col: ColData, r: RawReport) {
    col.hasData = true;
    col.totalRevenue  += (r.newRevenue || 0) + (r.existingRevenue || 0);
    col.newRevenue    += r.newRevenue || 0;
    col.existingRevenue += r.existingRevenue || 0;
    col.totalDigestion  += (r.newDigestionRevenue || 0) + (r.existingDigestionRevenue || 0);
    col.newVisitors   += r.newVisitors || 0;
    col.repeaters     += r.newNextReservations || 0;
    col.tickets       += r.newTicketPurchasers || 0;
    col.totalSessions += r.totalSessions || 0;
    col.reportId = r.id;
    col.rawReport = r;
  }

  function calcRates(col: ColData) {
    if (!col.hasData) return;
    col.repeatRate  = col.newVisitors > 0 ? Math.round((col.repeaters / col.newVisitors) * 100) : 0;
    col.ticketRate  = col.newVisitors > 0 ? Math.round((col.tickets  / col.newVisitors) * 100) : 0;
  }

  function formatVal(val: number, def: typeof ROW_DEFS[0], hasData: boolean) {
    if (!hasData && val === 0) return <span className={styles.cellEmpty}>-</span>;
    if (def.isCurrency) return `¥${val.toLocaleString()}`;
    if (def.isPercent)  return `${val}%`;
    if (def.suffix)     return `${val.toLocaleString()}${def.suffix}`;
    return val.toLocaleString();
  }

  let columns: { label: string; dataKey: string }[] = [];
  let aggregateData: Record<string, ColData> = {};
  let viewTitle = '';

  if (tab === 'monthly') {
    viewTitle = `${yyyy}年 ${currentMonth + 1}月 日別集計表`;
    const daysInMonth = new Date(yyyy, currentMonth + 1, 0).getDate();
    columns.push({ label: '合計', dataKey: 'total' });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = String(d).padStart(2, '0');
      columns.push({ label: `${d}日`, dataKey: key });
      aggregateData[key] = initColData();
    }
    aggregateData['total'] = initColData();

    reports.forEach(r => {
      const d = new Date(r.targetDate);
      if (d.getMonth() === currentMonth) {
        const dayKey = String(d.getDate()).padStart(2, '0');
        addToCol(aggregateData[dayKey], r);
        addToCol(aggregateData['total'], r);
      }
    });
  } else {
    viewTitle = `${yyyy}年 月別集計表`;
    columns.push({ label: '合計', dataKey: 'total' });
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, '0');
      columns.push({ label: `${m}月`, dataKey: key });
      aggregateData[key] = initColData();
    }
    aggregateData['total'] = initColData();

    reports.forEach(r => {
      const monthKey = String(new Date(r.targetDate).getMonth() + 1).padStart(2, '0');
      addToCol(aggregateData[monthKey], r);
      addToCol(aggregateData['total'], r);
    });
  }

  Object.values(aggregateData).forEach(calcRates);

  const openEdit = (col: ColData, dataKey: string) => {
    // Only day columns (not totals, not year-view) can be edited
    if (dataKey === 'total' || tab === 'yearly') return;
    if (!col.rawReport) return; // no data for this day
    setEditingReport(col.rawReport);
  };

  if (status === 'loading' || isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={`glass-panel ${styles.header}`}>
        <div className={styles.headerTop}>
          <h1>過去履歴・実績レビュー</h1>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{userName.charAt(0)}</div>
            <span>{userName}</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <Link href="/staff/mypage" className={styles.backLink}>&lt; マイページに戻る</Link>
        </div>

        <div className={styles.tabNav}>
          <Link href="?tab=monthly" className={`${styles.tab} ${tab === 'monthly' ? styles.tabActive : ''}`}>
            当月の数字 (日別)
          </Link>
          <Link href="?tab=yearly" className={`${styles.tab} ${tab === 'yearly' ? styles.tabActive : ''}`}>
            今年の数字 (月別)
          </Link>
        </div>

        {tab === 'monthly' && (
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--secondary-foreground)' }}>
            💡 数字が入力済みの日付をクリックすると修正できます
          </p>
        )}
      </header>

      <main className={`glass-panel ${styles.mainContent}`}>
        <h2 className={styles.sectionTitle}>{viewTitle}</h2>

        <div className={styles.tableWrapper}>
          <table className={styles.sheetTable}>
            <thead>
              <tr>
                <th>項目 \ 期間</th>
                {columns.map(col => {
                  const colData = aggregateData[col.dataKey];
                  const isClickable = tab === 'monthly' && col.dataKey !== 'total' && colData?.hasData;
                  return (
                    <th
                      key={col.dataKey}
                      onClick={() => colData && openEdit(colData, col.dataKey)}
                      style={isClickable ? { cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline dotted' } : {}}
                      title={isClickable ? `${col.label}のデータを修正` : undefined}
                    >
                      {col.label}
                      {isClickable && <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.7 }}>✏️ 修正</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ROW_DEFS.map(rowDef => (
                <tr key={rowDef.key}>
                  <td>{rowDef.label}</td>
                  {columns.map(col => {
                    const colData = aggregateData[col.dataKey];
                    const val = colData?.[rowDef.key as keyof ColData] as number || 0;
                    const isClickable = tab === 'monthly' && col.dataKey !== 'total' && colData?.hasData;
                    return (
                      <td
                        key={`${rowDef.key}-${col.dataKey}`}
                        onClick={() => colData && openEdit(colData, col.dataKey)}
                        style={isClickable ? { cursor: 'pointer' } : {}}
                      >
                        {formatVal(val, rowDef, colData?.hasData || false)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Edit Modal */}
      {editingReport && (
        <EditReportModal
          report={{
            ...editingReport,
            dateLabel: `${new Date(editingReport.targetDate).getMonth() + 1}月${new Date(editingReport.targetDate).getDate()}日`,
          }}
          onClose={() => setEditingReport(null)}
          onSaved={() => {
            setEditingReport(null);
            fetchData(); // refresh data after save
          }}
        />
      )}
    </div>
  );
}
