import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    
    if (!user || !user.id || !user.role) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeIdParam = searchParams.get('storeId');
    const statusParam = searchParams.get('status') || 'ACTIVE';

    let query: any = {};
    if (statusParam === 'ACTIVE') {
      query.status = 'ACTIVE';
    }

    if (user.role === '店長') {
      query.storeId = Number(user.storeId);
    } else if (user.role === 'マネージャー' || user.role === '代表') {
      if (storeIdParam && storeIdParam !== 'all') {
        query.storeId = Number(storeIdParam);
      }
    } else {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const staffList = await prisma.user.findMany({
      where: query,
      include: {
        store: true,
        role: true,
      },
      orderBy: [
        { storeId: 'asc' },
        { roleId: 'asc' }
      ]
    });

    // Provide stores and roles mapping for the frontend editor
    const stores = await prisma.store.findMany();
    const roles = await prisma.role.findMany();

    return NextResponse.json({
      success: true,
      staff: staffList.map(s => ({
        id: s.id,
        name: s.name,
        loginId: s.loginId,
        status: s.status,
        storeId: s.storeId,
        storeName: s.store?.name,
        roleId: s.roleId,
        roleName: s.role?.name,
        avatarUrl: s.avatarUrl
      })),
      stores,
      roles
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
