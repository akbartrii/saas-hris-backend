import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating ms_plans table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ms_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) NOT NULL UNIQUE,
      max_employees INT NOT NULL DEFAULT 10,
      max_departments INT,
      features JSONB NOT NULL DEFAULT '{}',
      price_monthly DECIMAL(12,2) NOT NULL,
      price_yearly DECIMAL(12,2) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('ms_plans table created.');

  console.log('Creating ms_subscriptions table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ms_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES ms_companies(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES ms_plans(id),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      trial_ends_at TIMESTAMPTZ,
      starts_at TIMESTAMPTZ DEFAULT now(),
      ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);
  console.log('ms_subscriptions table created.');

  console.log('Creating ms_usage_tracking table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ms_usage_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES ms_companies(id) ON DELETE CASCADE,
      month INT NOT NULL,
      year INT NOT NULL,
      employee_count INT DEFAULT 0,
      storage_bytes INT DEFAULT 0,
      api_calls INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(company_id, month, year)
    );
  `);
  console.log('ms_usage_tracking table created.');

  console.log('Creating indexes...');
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON ms_subscriptions(company_id);`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON ms_subscriptions(plan_id);`);
  console.log('Indexes created.');

  console.log('All tables created successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
