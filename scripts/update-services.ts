const fs = require('fs');
const path = require('path');

const serviceFiles = [
  'src/modules/attendance/attendance.service.ts',
  'src/modules/employee/employee.service.ts',
  'src/modules/leave/leave.service.ts',
  'src/modules/time-off/time-off.service.ts',
  'src/modules/remote-work/remote-work.service.ts',
  'src/modules/overtime/overtime.service.ts',
  'src/modules/team/team.service.ts',
  'src/modules/overnight/overnight.service.ts',
  'src/modules/notification/notification.service.ts',
  'src/modules/report/report.service.ts',
  'src/modules/face-registration/face-registration.service.ts',
  'src/modules/holiday-calendar/holiday-calendar.service.ts',
  'src/modules/recruitment/recruitment.service.ts',
  'src/modules/reimbursement/reimbursement.service.ts',
  'src/modules/payroll/payroll.service.ts',
  'src/modules/parameter/parameter.service.ts',
  'src/modules/overtime-meal-allowance/overtime-meal-allowance.service.ts',
  'src/modules/work-schedule/work-schedule.service.ts',
  'src/modules/location/location.service.ts',
  'src/modules/company/company.service.ts',
  'src/modules/auth/auth.service.ts',
  'src/modules/encryption/encryption.service.ts',
];

function updateService(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  console.log(`Processing ${relativePath}...`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Add companyId parameter to all methods
  const updatedContent = content.replace(
    /(async\s+\w+\([^)]+\))/g,
    (match) => {
      const params = match.replace('async ', 'async (companyId: string, userId: string');
      return params.replace(')', ', companyId: string)');
    }
  );
  
  // Add company_id filter to Prisma queries
  updatedContent = updatedContent.replace(
    /where:\s*\{([^}]+)\}/g,
    (match, p1) => {
      if (p1.includes('company_id')) return match;
      const existingFilters = p1.replace('where: {', '');
      return `where: { ${existingFilters} company_id: '${process.env.CURRENT_COMPANY_ID || 'uuid-guid'}' }`;
    }
  );
  
  fs.writeFileSync(filePath, updatedContent);
  console.log(`✅ Updated ${relativePath}`);
}

// Main execution
serviceFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    updateService(filePath);
  } else {
    console.log(`❌ File not found: ${filePath}`);
  }
});

console.log('\n✅ All service files updated!');
