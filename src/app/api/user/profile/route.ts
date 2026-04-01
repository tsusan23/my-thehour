import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: '未承認のリクエストです。ログイン状態を確認してください。' }, { status: 401 });
    }

    const userId = Number((session.user as any).id);
    const { name, password, confirmPassword } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json({ success: false, error: '名前を入力してください。' }, { status: 400 });
    }

    const updateData: any = { name: name.trim() };

    // パスワード変更が要求されている場合
    if (password) {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: 'パスワードは6文字以上に設定してください。' }, { status: 400 });
      }
      if (password !== confirmPassword) {
        return NextResponse.json({ success: false, error: '新しいパスワードと確認用パスワードが一致しません。' }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: 'プロフィールを更新しました。' });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました。しばらく経ってから再度お試しください。' },
      { status: 500 }
    );
  }
}
