import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;
    const userId = Number(formData.get('userId'));

    if (!file || !userId) {
      return NextResponse.json({ success: false, error: 'Missing file or userId' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Use JPEG, PNG, WebP or GIF.' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    // Use userId-based filename to overwrite previous avatar automatically
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `avatar-${userId}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    // Update DB with the public URL path
    const avatarUrl = `/uploads/avatars/${filename}`;
    
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl }
      });
    } catch (dbErr) {
      const dbError = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error('DB update error:', dbError);
      // File was saved, but DB update failed — return partial success with error detail
      return NextResponse.json({ 
        success: false, 
        error: `ファイルは保存されましたがDB更新に失敗しました: ${dbError}` 
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Avatar upload error:', message);
    return NextResponse.json({ success: false, error: `サーバーエラー: ${message}` }, { status: 500 });
  }
}
