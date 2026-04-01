import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== '代表') {
    return null;
  }
  return user;
}

export async function GET() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { id: 'asc' }
    });
    return NextResponse.json({ success: true, stores });
  } catch (err) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await checkAdminAuth();
    if (!user) {
      return NextResponse.json({ error: '権限がありません。代表アカウントのみ可能です' }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: '店舗名を入力してください' }, { status: 400 });
    }

    const store = await prisma.store.create({
      data: { name: name.trim() }
    });

    return NextResponse.json({ success: true, store });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await checkAdminAuth();
    if (!user) {
      return NextResponse.json({ error: '権限がありません。代表アカウントのみ可能です' }, { status: 403 });
    }

    const { id, name } = await request.json();
    if (!id || !name || name.trim() === '') {
      return NextResponse.json({ error: 'IDと店舗名を指定してください' }, { status: 400 });
    }

    const store = await prisma.store.update({
      where: { id: Number(id) },
      data: { name: name.trim() }
    });

    return NextResponse.json({ success: true, store });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
