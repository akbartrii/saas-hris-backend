import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.ms_companies.findMany({
    where: { is_active: true },
  });

  for (const company of companies) {
    await updateTableWithCompanyId(company.id);
  }

  console.log('✅ All companies seeded with company_id');
}

async function updateTableWithCompanyId(companyId: string) {
  await prisma.ms_leave_types.upsert({
    create: { company_id: companyId },
    update: { company_id: companyId },
    where: { id: { gt: 0 } },
  });

  await prisma.ms_time_off_types.upsert({
    create: { company_id: companyId },
    update: { company_id: companyId },
    where: { id: { gt: 0 } },
  });

  await prisma.ms_work_schedules.upsert({
    create: { company_id: companyId },
    update: { company_id: companyId },
    where: { id: { gt: 0 } },
  });

  await prisma.ms_parameters.upsert({
    create: { company_id: companyId },
    update: { company_id: companyId },
    where: { id: { gt: 0 } },
  });

  await prisma.ms_overtime_meal_allowances.upsert({
    create: { company_id: companyId },
    update: { company_id: companyId },
    where: { id: { gt: 0 } },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
