import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// 権限チェック関数
async function checkAuth() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || (!['店長', 'マネージャー', '代表'].includes(user.role))) {
    return null;
  }
  return user;
}

export async function GET(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const targetMonth = searchParams.get('targetMonth'); // "YYYY-MM"
    const storeIdParam = searchParams.get('storeId');

    if (!targetMonth) {
      return NextResponse.json({ error: '対象月が指定されていません' }, { status: 400 });
    }

    // クエリ作成（店長は自店舗のみ、それ以上は選択店舗）
    let queryStoreId: number | undefined;
    if (user.role === '店長') {
      queryStoreId = Number(user.storeId);
    } else if (storeIdParam && storeIdParam !== 'all') {
      queryStoreId = Number(storeIdParam);
    }

    // Activeなスタッフを取得
    const staffQuery: any = { status: 'ACTIVE' };
    if (queryStoreId) staffQuery.storeId = queryStoreId;

    const staffList = await prisma.user.findMany({
      where: staffQuery,
      include: {
        store: true,
        monthlyActionPlans: {
          where: { targetMonth }
        }
      },
      orderBy: { storeId: 'asc' }
    });

    const stores = await prisma.store.findMany();

    return NextResponse.json({
      success: true,
      staff: staffList.map(s => ({
        id: s.id,
        name: s.name,
        storeName: s.store?.name,
        targetKgi: s.monthlyActionPlans[0]?.targetKgi || 0,
      })),
      stores
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAuth();
    if (!user) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

    const body = await request.json();
    const { targetMonth, kpiData } = body; 
    // kpiData: [{ userId: number, targetKgi: number }, ...]

    if (!targetMonth || !kpiData || !Array.isArray(kpiData)) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 });
    }

    // データベースに Upsert
    for (const item of kpiData) {
      const existing = await prisma.monthlyActionPlan.findFirst({
        where: { userId: item.userId, targetMonth }
      });

      if (existing) {
        await prisma.monthlyActionPlan.update({
          where: { id: existing.id },
          data: { targetKgi: item.targetKgi }
        });
      } else {
        await prisma.monthlyActionPlan.create({
          data: {
            userId: item.userId,
            targetMonth,
            targetKgi: item.targetKgi,
          }
        });
      }
    }

    return NextResponse.json({ success: true, message: '目標を保存しました' });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
