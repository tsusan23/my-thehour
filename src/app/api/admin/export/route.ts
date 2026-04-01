import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

function escapeCSV(val: string | number | null | undefined): string {
  const str = val == null ? '' : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSVRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(escapeCSV).join(',');
}

// BOM + rows → UTF-8 CSV blob
function buildCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.join(','), ...rows.map(buildCSVRow)];
  return '\uFEFF' + lines.join('\r\n');
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    if (!user || !['店長', 'マネージャー', '代表'].includes(user.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily'; // daily | staff | kgi
    const storeId = searchParams.get('storeId') ? Number(searchParams.get('storeId')) : null;
    const yearMonth = searchParams.get('yearMonth'); // e.g. "2026-04"

    let csvContent = '';
    let fileName = '';

    if (type === 'daily') {
      // ---- 日次スタッフ実績 ----
      let dateFilter: any = {};
      if (yearMonth) {
        const [y, m] = yearMonth.split('-').map(Number);
        dateFilter = {
          gte: new Date(Date.UTC(y, m - 1, 1)),
          lt: new Date(Date.UTC(y, m, 1)),
        };
      }

      const reports = await prisma.dailyStaffReport.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 ? { targetDate: dateFilter } : {}),
          user: storeId ? { storeId } : undefined,
          submissionStatus: { not: 'OFF_DAY' },
        },
        include: { user: { include: { store: true } } },
        orderBy: [{ targetDate: 'asc' }, { userId: 'asc' }],
      });

      const headers = [
        '日付', '店舗名', 'スタッフ名', '役職',
        '新規売上', '既存売上', '合計売上',
        '新規消化', '既存消化',
        '新規客数', '新規リピート数', '回数券購入数',
        '回数券完了数', '継続者数',
        '総施術数', '新規施術数', '既存施術数', '福祉施術数',
        'ステータス',
      ];

      const rows = reports.map(r => {
        const d = r.targetDate;
        const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
        return [
          dateStr,
          (r.user as any).store?.name || '',
          (r.user as any).name || '',
          (r.user as any).roleName || '',
          r.newRevenue,
          r.existingRevenue,
          r.newRevenue + r.existingRevenue,
          r.newDigestionRevenue,
          r.existingDigestionRevenue,
          r.newVisitors,
          r.newNextReservations,
          r.newTicketPurchasers,
          r.ticketFinishers,
          r.continuedUsers,
          r.totalSessions,
          r.newSessions,
          r.existingSessions,
          r.welfareSessions,
          r.submissionStatus,
        ];
      });

      csvContent = buildCSV(headers, rows);
      fileName = `daily_reports_${yearMonth || 'all'}.csv`;

    } else if (type === 'staff') {
      // ---- スタッフ一覧 ----
      const staffList = await prisma.user.findMany({
        where: storeId ? { storeId } : {},
        include: { store: true, role: true },
        orderBy: [{ storeId: 'asc' }, { id: 'asc' }],
      });

      const headers = ['ID', '氏名', 'ログインID', '役職', '所属店舗', 'ステータス'];
      const rows = staffList.map(s => [
        s.id,
        s.name,
        s.loginId,
        (s.role as any)?.name || '',
        (s.store as any)?.name || '',
        s.status,
      ]);

      csvContent = buildCSV(headers, rows);
      fileName = 'staff_list.csv';

    } else if (type === 'kgi') {
      // ---- KGI目標設定 ----
      const plans = await prisma.monthlyActionPlan.findMany({
        where: yearMonth ? { targetMonth: yearMonth } : {},
        include: { user: { include: { store: true } } },
        orderBy: [{ targetMonth: 'asc' }, { userId: 'asc' }],
      });

      const headers = ['対象月', '店舗名', 'スタッフ名', 'KGI目標（円）'];
      const rows = plans.map(p => [
        p.targetMonth,
        (p.user as any).store?.name || '',
        (p.user as any).name || '',
        p.targetKgi || 0,
      ]);

      csvContent = buildCSV(headers, rows);
      fileName = `kgi_targets_${yearMonth || 'all'}.csv`;
    }

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
