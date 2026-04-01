import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const currentUserId = Number((session.user as any).id);
    const { searchParams } = new URL(request.url);
    const requestedUserId = Number(searchParams.get('userId')) || currentUserId;

    // スタッフは自分のデータのみ、管理者はすべて閲覧可能
    const role = (session.user as any).role;
    const isManager = ['店長', 'マネージャー', '代表'].includes(role);
    const targetUserId = isManager ? requestedUserId : currentUserId;

    const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const yyyy = jstNow.getFullYear();
    const yearStart = new Date(Date.UTC(yyyy, 0, 1));
    const yearEnd   = new Date(Date.UTC(yyyy + 1, 0, 1));

    const [user, reports] = await Promise.all([
      prisma.user.findUnique({ where: { id: targetUserId }, select: { name: true } }),
      prisma.dailyStaffReport.findMany({
        where: {
          userId: targetUserId,
          targetDate: { gte: yearStart, lt: yearEnd },
          submissionStatus: { not: 'OFF_DAY' }
        },
        orderBy: { targetDate: 'asc' }
      })
    ]);

    return NextResponse.json({
      success: true,
      userName: user?.name || '',
      reports: reports.map(r => ({
        id: r.id,
        userId: r.userId,
        targetDate: r.targetDate.toISOString(),
        newVisitors:              r.newVisitors,
        newNextReservations:      r.newNextReservations,
        newTicketPurchasers:      r.newTicketPurchasers,
        newRevenue:               r.newRevenue,
        existingRevenue:          r.existingRevenue,
        newDigestionRevenue:      r.newDigestionRevenue,
        existingDigestionRevenue: r.existingDigestionRevenue,
        ticketFinishers:          r.ticketFinishers,
        continuedUsers:           r.continuedUsers,
        totalSessions:            r.totalSessions,
        newSessions:              r.newSessions,
        existingSessions:         r.existingSessions,
        welfareSessions:          r.welfareSessions,
        submissionStatus:         r.submissionStatus,
      }))
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
