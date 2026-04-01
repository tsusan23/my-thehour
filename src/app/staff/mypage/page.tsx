import prisma from '@/lib/prisma';
import DailyReportForm from '@/components/DailyReportForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StaffMyPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/login');
  }

  const user = session.user as any;
  const userId = Number(user.id);

  // Month info
  const jstNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const targetMonth = `${jstNow.getFullYear()}-${String(jstNow.getMonth() + 1).padStart(2, '0')}`;
  
  // Fetch user from DB to get fresh avatarUrl
  const dbUser = await prisma.user.findUnique({ where: { id: userId } });

  // Get KGI targets
  const kgiRecord = await prisma.monthlyActionPlan.findFirst({
    where: { userId, targetMonth }
  });
  // fallback to 1000000 if not set for MVP
  const kgiTarget = kgiRecord?.targetKgi || 1000000;

  // Calculate MTD Revenue
  const firstDayOfMonth = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1);
  const lastDayOfMonth = new Date(jstNow.getFullYear(), jstNow.getMonth() + 1, 0, 23, 59, 59, 999);

  const reports = await prisma.dailyStaffReport.findMany({
    where: {
      userId,
      targetDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      submissionStatus: { in: ['SUBMITTED', '提出済'] }
    }
  });

  const monthToDateRevenue = reports.reduce((acc, r) => acc + (r.newRevenue || 0) + (r.existingRevenue || 0), 0);

  return (
    <DailyReportForm
      userId={userId}
      userName={dbUser?.name || user.name || 'スタッフ'}
      kgiTarget={kgiTarget}
      monthToDateRevenue={monthToDateRevenue}
      avatarUrl={dbUser?.avatarUrl || user.avatarUrl || null}
    />
  );
}
