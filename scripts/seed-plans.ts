import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Free',
    code: 'free',
    max_employees: 10,
    max_departments: 3,
    features: { payroll: false, recruitment: false, report: true, attendance: true, leave: true },
    price_monthly: 0,
    price_yearly: 0,
  },
  {
    name: 'Starter',
    code: 'starter',
    max_employees: 50,
    max_departments: 10,
    features: { payroll: true, recruitment: false, report: true, attendance: true, leave: true },
    price_monthly: 99000,
    price_yearly: 999000,
  },
  {
    name: 'Professional',
    code: 'professional',
    max_employees: 200,
    max_departments: null,
    features: { payroll: true, recruitment: true, report: true, attendance: true, leave: true },
    price_monthly: 299000,
    price_yearly: 2999000,
  },
  {
    name: 'Enterprise',
    code: 'enterprise',
    max_employees: 999999,
    max_departments: null,
    features: { payroll: true, recruitment: true, report: true, attendance: true, leave: true },
    price_monthly: 999000,
    price_yearly: 9999000,
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.ms_plans.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
    console.log(`Plan "${plan.code}" seeded.`);
  }
  console.log('All plans seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
