import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

const ADMIN_ROLES = ['マネージャー', '代表'];

export async function POST(request: Request) {
  // Auth check
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: '未認証です' }, { status: 401 });
  }
  const role = (session.user as any)?.role ?? '';
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ success: false, error: '権限がありません' }, { status: 403 });
  }

  try {
    const { name, loginId, password, roleName, storeId } = await request.json();

    // Validate
    if (!name || !loginId || !password || !roleName || !storeId) {
      return NextResponse.json({ success: false, error: '全ての項目を入力してください' }, { status: 400 });
    }
    if (loginId.length < 3) {
      return NextResponse.json({ success: false, error: 'ログインIDは3文字以上にしてください' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'パスワードは6文字以上にしてください' }, { status: 400 });
    }

    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { loginId } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'このログインIDはすでに使用されています' }, { status: 409 });
    }

    // Find role
    const roleRecord = await prisma.role.findFirst({ where: { name: roleName } });
    if (!roleRecord) {
      return NextResponse.json({ success: false, error: '指定されたロールが見つかりません' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        loginId,
        passwordHash,
        storeId: Number(storeId),
        roleId: roleRecord.id,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, userId: newUser.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Create staff error:', msg);
    return NextResponse.json({ success: false, error: `サーバーエラー: ${msg}` }, { status: 500 });
  }
}
