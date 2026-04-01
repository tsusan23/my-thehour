import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const targetUserId = Number(id);
    if (!targetUserId) {
      return NextResponse.json({ error: 'ユーザーIDが見つかりません' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || (!['店長', 'マネージャー', '代表'].includes(user.role))) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // 操作対象のユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { role: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: '指定されたユーザーが見つかりません' }, { status: 404 });
    }

    // 店長の場合、他店舗のスタッフは編集不可
    if (user.role === '店長' && targetUser.storeId !== Number(user.storeId)) {
      return NextResponse.json({ error: '自店舗のスタッフの操作のみ許可されています' }, { status: 403 });
    }
    
    // 店長の場合、マネージャー・代表の編集不可
    if (user.role === '店長' && ['マネージャー', '代表'].includes(targetUser.role.name)) {
      return NextResponse.json({ error: '店長や本部スタッフの権限は変更できません' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    // 名前変更
    if (body.name && body.name.trim() !== '') {
      updateData.name = body.name.trim();
    }
    
    // ログインID変更
    if (body.loginId && body.loginId.trim() !== '') {
      updateData.loginId = body.loginId.trim();
    }

    // 役職変更
    if (body.roleId) {
      // 役職の存在確認
      const role = await prisma.role.findUnique({ where: { id: Number(body.roleId) } });
      if (role) {
        // 店長がマネージャー以上に変更しようとするのを禁止
        if (user.role === '店長' && ['マネージャー', '代表'].includes(role.name)) {
          return NextResponse.json({ error: '店長より上の権限を付与することはできません' }, { status: 403 });
        }
        updateData.roleId = Number(body.roleId);
      }
    }

    // 店舗変更 (マネージャー、代表のみ)
    if (body.storeId && ['マネージャー', '代表'].includes(user.role)) {
      updateData.storeId = Number(body.storeId);
    }

    // パスワード強制変更
    if (body.password) {
      if (body.password.length < 6) {
        return NextResponse.json({ error: 'パスワードは6文字以上に設定してください' }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(body.password, 12);
    }

    // 無効化（退職などの論理削除）
    if (body.status === 'INACTIVE') {
      updateData.status = 'INACTIVE';
    } else if (body.status === 'ACTIVE') {
      updateData.status = 'ACTIVE';
    }

    // 自分のアカウントを無効化するのは禁止
    if (updateData.status === 'INACTIVE' && targetUser.id === Number(user.id)) {
      return NextResponse.json({ error: '自身のアカウントを無効化することはできません' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData
    });

    return NextResponse.json({ success: true, message: 'ユーザー情報を更新しました' });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}
