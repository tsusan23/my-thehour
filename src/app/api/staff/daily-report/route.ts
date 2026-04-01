import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      userId, targetDate, 
      newVisitors, newNextReservations, newTicketPurchasers, 
      newRevenue, existingRevenue, newDigestionRevenue, existingDigestionRevenue,
      ticketFinishers, continuedUsers, 
      totalSessions, newSessions, existingSessions, welfareSessions, 
      hasTourAccompaniment, submissionStatus,
      actionPlan, tasks 
    } = data;

    // Convert targetDate to DateTime
    const dateObj = new Date(targetDate);

    // 1. Process DailyStaffReport (Check existence, then update/create)
    const existingReport = await prisma.dailyStaffReport.findFirst({
      where: { userId, targetDate: dateObj }
    });

    let report;
    if (existingReport) {
      report = await prisma.dailyStaffReport.update({
        where: { id: existingReport.id },
        data: {
          newVisitors: Number(newVisitors) || 0,
          newNextReservations: Number(newNextReservations) || 0,
          newTicketPurchasers: Number(newTicketPurchasers) || 0,
          newRevenue: Number(newRevenue) || 0,
          existingRevenue: Number(existingRevenue) || 0,
          newDigestionRevenue: Number(newDigestionRevenue) || 0,
          existingDigestionRevenue: Number(existingDigestionRevenue) || 0,
          ticketFinishers: Number(ticketFinishers) || 0,
          continuedUsers: Number(continuedUsers) || 0,
          totalSessions: Number(totalSessions) || 0,
          newSessions: Number(newSessions) || 0,
          existingSessions: Number(existingSessions) || 0,
          welfareSessions: Number(welfareSessions) || 0,
          hasTourAccompaniment: Boolean(hasTourAccompaniment),
          submissionStatus: submissionStatus || 'SUBMITTED',
        }
      });
    } else {
      report = await prisma.dailyStaffReport.create({
        data: {
          userId,
          targetDate: dateObj,
          newVisitors: Number(newVisitors) || 0,
          newNextReservations: Number(newNextReservations) || 0,
          newTicketPurchasers: Number(newTicketPurchasers) || 0,
          newRevenue: Number(newRevenue) || 0,
          existingRevenue: Number(existingRevenue) || 0,
          newDigestionRevenue: Number(newDigestionRevenue) || 0,
          existingDigestionRevenue: Number(existingDigestionRevenue) || 0,
          ticketFinishers: Number(ticketFinishers) || 0,
          continuedUsers: Number(continuedUsers) || 0,
          totalSessions: Number(totalSessions) || 0,
          newSessions: Number(newSessions) || 0,
          existingSessions: Number(existingSessions) || 0,
          welfareSessions: Number(welfareSessions) || 0,
          hasTourAccompaniment: Boolean(hasTourAccompaniment),
          submissionStatus: submissionStatus || 'SUBMITTED',
        }
      });
    }

    // 2. Process DailyActionPlan
    if (actionPlan) {
      const existingPlan = await prisma.dailyActionPlan.findFirst({
        where: { userId, targetDate: dateObj }
      });

      if (existingPlan) {
        await prisma.dailyActionPlan.update({
          where: { id: existingPlan.id },
          data: {
            plan: actionPlan.plan,
            salesGoal: Number(actionPlan.salesGoal) || 0,
            newVisitorGoal: Number(actionPlan.newVisitorGoal) || 0,
            nextReservationGoal: Number(actionPlan.nextReservationGoal) || 0,
          }
        });
      } else {
        await prisma.dailyActionPlan.create({
          data: {
            userId,
            targetDate: dateObj,
            plan: actionPlan.plan,
            salesGoal: Number(actionPlan.salesGoal) || 0,
            newVisitorGoal: Number(actionPlan.newVisitorGoal) || 0,
            nextReservationGoal: Number(actionPlan.nextReservationGoal) || 0,
          }
        });
      }
    }

    // 3. Process DailyTasks
    if (tasks && Array.isArray(tasks)) {
      // For simplicity in MVP, delete all existing today's tasks and recreate them
      await prisma.dailyTask.deleteMany({
        where: { userId, targetDate: dateObj }
      });
      
      const taskData = tasks.map((t: any) => ({
        userId,
        targetDate: dateObj,
        taskName: t.text,
        isComplete: Boolean(t.completed)
      }));

      await prisma.dailyTask.createMany({
        data: taskData
      });
    }

    return NextResponse.json({ success: true, message: '日次報告を保存しました' }, { status: 200 });

  } catch (error) {
    console.error('Error saving daily report:', error);
    return NextResponse.json({ success: false, error: '日次報告の保存に失敗しました' }, { status: 500 });
  }
}
