import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const reports = await prisma.dailyStaffReport.findMany({
      where: { submissionStatus: { not: 'OFF_DAY' } },
      include: { user: { include: { store: true } } },
      take: 1
    });
    console.log(reports.length ? 'Success' : 'No data');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
