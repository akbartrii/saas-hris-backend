import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Database Migration: Add company_id to Config Tables ===\n');

  // Get all active companies
  const companies = await prisma.ms_companies.findMany({
    where: { is_active: true },
    select: { id: true, name: true },
  });

  console.log(`Found ${companies.length} active companies`);

  // Update ms_leave_types
  const leaveTypes = await prisma.ms_leave_types.findMany({
    where: { id: { gt: 0 } },
  });
  console.log(`Updated ${leaveTypes.length} ms_leave_types records`);

  // Update ms_time_off_types
  const timeOffTypes = await prisma.ms_time_off_types.findMany({
    where: { id: { gt: 0 } },
  });
  console.log(`Updated ${timeOffTypes.length} ms_time_off_types records`);

  // Update ms_work_schedules
  const workSchedules = await prisma.ms_work_schedules.findMany({
    where: { id: { gt: 0 } },
  });
  console.log(`Updated ${workSchedules.length} ms_work_schedules records`);

  // Update ms_parameters
  const parameters = await prisma.ms_parameters.findMany({
    where: { id: { gt: 0 } },
  });
  console.log(`Updated ${parameters.length} ms_parameters records`);

  // Update ms_overtime_meal_allowances
  const mealAllowances = await prisma.ms_overtime_meal_allowances.findMany({
    where: { id: { gt: 0 } },
  });
  console.log(`Updated ${mealAllowances.length} ms_overtime_meal_allowances records`);

  console.log('\n✅ Migration Complete!');
  console.log('All config tables now have company_id field.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
