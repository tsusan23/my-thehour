import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, targetDate, status } = data; // status is 'OFF_DAY' | 'UNSTARTED'

    const dateObj = new Date(targetDate);

    const existingReport = await prisma.dailyStaffReport.findFirst({
      where: { userId, targetDate: dateObj }
    });

    if (existingReport) {
      await prisma.dailyStaffReport.update({
        where: { id: existingReport.id },
        data: { submissionStatus: status }
      });
    } else {
      await prisma.dailyStaffReport.create({
        data: {
          userId,
          targetDate: dateObj,
          submissionStatus: status
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
