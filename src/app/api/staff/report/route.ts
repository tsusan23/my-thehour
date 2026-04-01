import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const currentUserId = Number((session.user as any).id);
    const body = await request.json();
    const { reportId, userId, ...fields } = body;

    // スタッフは自分のレポートのみ編集可能
    // 管理者は他スタッフのも編集可能
    const role = (session.user as any).role;
    const isManager = ['店長', 'マネージャー', '代表'].includes(role);

    if (!isManager && currentUserId !== Number(userId)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // reportId で特定のレコードを更新
    const updated = await prisma.dailyStaffReport.update({
      where: { id: Number(reportId) },
      data: {
        newVisitors:              Number(fields.newVisitors) || 0,
        newNextReservations:      Number(fields.newNextReservations) || 0,
        newTicketPurchasers:      Number(fields.newTicketPurchasers) || 0,
        newRevenue:               Number(fields.newRevenue) || 0,
        existingRevenue:          Number(fields.existingRevenue) || 0,
        newDigestionRevenue:      Number(fields.newDigestionRevenue) || 0,
        existingDigestionRevenue: Number(fields.existingDigestionRevenue) || 0,
        ticketFinishers:          Number(fields.ticketFinishers) || 0,
        continuedUsers:           Number(fields.continuedUsers) || 0,
        totalSessions:            Number(fields.totalSessions) || 0,
        newSessions:              Number(fields.newSessions) || 0,
        existingSessions:         Number(fields.existingSessions) || 0,
        welfareSessions:          Number(fields.welfareSessions) || 0,
        submissionStatus:         'SUBMITTED', // 修正後も提出済扱い
      }
    });

    return NextResponse.json({ success: true, report: updated });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
