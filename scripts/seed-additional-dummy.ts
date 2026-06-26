import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function today(daysOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function pastDays(daysAgo: number): Date {
  return today(-daysAgo);
}

async function main() {
  console.log('Reading existing master data...');

  const companies = await prisma.ms_companies.findMany();
  if (companies.length === 0) {
    console.log('No companies found. Run seed-dummy.ts first!');
    return;
  }
  console.log(`Found ${companies.length} companies`);

  for (const company of companies) {
    console.log(`\n=== Seeding additional data for ${company.name} ===`);

    const employees = await prisma.ms_employees.findMany({
      where: { company_id: company.id, is_active: true },
    });
    if (employees.length < 3) {
      console.log(`  Not enough employees (${employees.length}), skipping...`);
      continue;
    }

    const supervisor = employees[0];
    const managerHrga = employees.find((e) => e.id !== supervisor.id) || employees[1];
    const staffEmployees = employees.slice(2);

    const leaveTypes = await prisma.ms_leave_types.findMany({
      where: { company_id: company.id },
    });
    const timeOffTypes = await prisma.ms_time_off_types.findMany({
      where: { company_id: company.id },
    });
    const locations = await prisma.ms_locations.findMany({
      where: { company_id: company.id },
    });
    const location = locations[0];
    const users = await prisma.ms_users.findMany({
      where: { company_id: company.id },
    });

    // ================================================
    // 1. REIMBURSEMENTS
    // ================================================
    console.log('  Seeding reimbursements...');
    const reimbursementCategories = [
      'medical', 'transport', 'meal', 'accommodation',
      'training', 'supplies', 'entertainment', 'fuel',
    ];
    const reimbursementStatuses = ['pending', 'approved', 'rejected', 'paid'];
    const reimbursementsData: Array<{
      employeeId: string;
      category: string;
      amount: number;
      description: string;
      status: string;
    }> = [];

    for (const emp of staffEmployees.slice(0, 4)) {
      const cat1 = reimbursementCategories[Math.floor(Math.random() * reimbursementCategories.length)];
      const cat2 = reimbursementCategories[Math.floor(Math.random() * reimbursementCategories.length)];
      reimbursementsData.push(
        {
          employeeId: emp.id,
          category: cat1,
          amount: Math.floor(Math.random() * 2000000) + 100000,
          description: `Biaya ${cat1} - ${emp.full_name}`,
          status: 'pending',
        },
        {
          employeeId: emp.id,
          category: cat2,
          amount: Math.floor(Math.random() * 3000000) + 200000,
          description: `Biaya ${cat2} - ${emp.full_name}`,
          status: 'approved',
        },
      );
    }

    for (const r of reimbursementsData) {
      const isApproved = r.status === 'approved' || r.status === 'paid';
      await prisma.tr_reimbursements.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: r.employeeId,
          date: pastDays(Math.floor(Math.random() * 14) + 1),
          category: r.category,
          amount: r.amount,
          description: r.description,
          status: r.status,
          supervisor_id: supervisor.id,
          supervisor_approved_at: isApproved ? new Date() : null,
          hr_approved_by: isApproved ? managerHrga.id : null,
          approved_at: isApproved ? new Date() : null,
        },
      });
    }

    // ================================================
    // 2. TIME OFF REQUESTS
    // ================================================
    console.log('  Seeding time-off requests...');
    if (timeOffTypes.length >= 2) {
      const unpaidLeaveType = timeOffTypes[0];
      const dispensasiType = timeOffTypes[1];

      for (const emp of staffEmployees.slice(0, 3)) {
        const start = today(Math.floor(Math.random() * 20) + 10);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        await prisma.tr_time_off_requests.create({
          data: {
            id: genId(),
            company_id: company.id,
            employee_id: emp.id,
            time_off_type_id: unpaidLeaveType.id,
            start_date: start,
            end_date: end,
            reason: 'Keperluan pribadi',
            status: 'pending',
            supervisor_id: supervisor.id,
          },
        });

        await prisma.tr_time_off_requests.create({
          data: {
            id: genId(),
            company_id: company.id,
            employee_id: emp.id,
            time_off_type_id: dispensasiType.id,
            start_date: today(Math.floor(Math.random() * 30) + 20),
            end_date: today(Math.floor(Math.random() * 30) + 22),
            reason: 'Dispensasi acara keluarga',
            status: 'approved',
            supervisor_id: supervisor.id,
            supervisor_approved_at: new Date(),
            hrga_manager_id: managerHrga.id,
            hrga_approved_at: new Date(),
          },
        });
      }
    }

    // ================================================
    // 3. OVERNIGHT REQUESTS (Shift Malam)
    // ================================================
    console.log('  Seeding overnight requests...');
    const shiftTypes = ['full', 'half_early', 'half_late'];
    for (const emp of staffEmployees.slice(0, 3)) {
      const shiftType = shiftTypes[Math.floor(Math.random() * shiftTypes.length)];
      const date = today(Math.floor(Math.random() * 14) + 5);

      await prisma.tr_overnight_requests.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: emp.id,
          date,
          shift_type: shiftType,
          remarks: 'Penjagaan shift malam',
          status: 'pending',
          supervisor_id: supervisor.id,
        },
      });
    }

    // One approved overnight request
    if (staffEmployees.length > 1) {
      await prisma.tr_overnight_requests.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: staffEmployees[1].id,
          date: pastDays(7),
          shift_type: 'full',
          remarks: 'Lembur malam project',
          status: 'approved',
          supervisor_id: supervisor.id,
          supervisor_approved_at: pastDays(6),
        },
      });
    }

    // ================================================
    // 4. REMOTE WORK REQUESTS (WFH)
    // ================================================
    console.log('  Seeding remote work requests...');
    for (const emp of staffEmployees.slice(0, 3)) {
      const start = today(Math.floor(Math.random() * 10) + 3);
      const end = new Date(start);
      end.setDate(end.getDate() + Math.floor(Math.random() * 3) + 1);

      await prisma.tr_remote_work_requests.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: emp.id,
          start_date: start,
          end_date: end,
          latitude: -6.2088,
          longitude: 106.8456,
          address: 'Jakarta Selatan',
          radius_meters: 100,
          reason: 'WFH - maintenance rumah',
          status: 'pending',
          supervisor_id: supervisor.id,
        },
      });
    }

    // Approved WFH (set current_remote_work_id on employee)
    if (staffEmployees.length > 0) {
      const approvedWFH = await prisma.tr_remote_work_requests.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: staffEmployees[0].id,
          start_date: today(-1),
          end_date: today(2),
          latitude: -6.2088,
          longitude: 106.8456,
          address: 'Rumah - Jakarta Selatan',
          radius_meters: 100,
          reason: 'WFH - menunggu perbaikan AC kantor',
          status: 'approved',
          supervisor_id: supervisor.id,
          approved_at: pastDays(2),
        },
      });

      await prisma.ms_employees.update({
        where: { id: staffEmployees[0].id },
        data: { current_remote_work_id: approvedWFH.id },
      });
    }

    // ================================================
    // 5. LOAN DEDUCTIONS
    // ================================================
    console.log('  Seeding loan deductions...');
    const loanData = [
      { empIdx: 0, amount: 5000000, monthly: 500000, desc: 'Pinjaman perbaikan rumah' },
      { empIdx: 1, amount: 3000000, monthly: 300000, desc: 'Pinjaman pendidikan anak' },
      { empIdx: 2, amount: 2000000, monthly: 250000, desc: 'Pinjaman kesehatan' },
    ];

    for (const loan of loanData) {
      if (loan.empIdx < staffEmployees.length) {
        await prisma.tr_loan_deductions.create({
          data: {
            id: genId(),
            company_id: company.id,
            employee_id: staffEmployees[loan.empIdx].id,
            amount: loan.amount,
            remaining_amount: loan.amount - Math.floor(Math.random() * 1000000),
            monthly_deduction: loan.monthly,
            description: loan.desc,
            status: 'active',
          },
        });
      }
    }

    // Paid off loan
    if (staffEmployees.length > 3) {
      await prisma.tr_loan_deductions.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: staffEmployees[3].id,
          amount: 1500000,
          remaining_amount: 0,
          monthly_deduction: 150000,
          description: 'Pinjaman transportasi (lunas)',
          status: 'paid',
        },
      });
    }

    // ================================================
    // 6. ATTENDANCE CORRECTIONS
    // ================================================
    console.log('  Seeding attendance corrections...');
    const attendances = await prisma.tr_attendances.findMany({
      where: {
        company_id: company.id,
        employee_id: { in: staffEmployees.slice(0, 3).map((e) => e.id) },
      },
      take: 5,
      orderBy: { attendance_date: 'desc' },
    });

    for (let i = 0; i < Math.min(3, attendances.length); i++) {
      const att = attendances[i];
      await prisma.tr_attendance_corrections.create({
        data: {
          id: genId(),
          company_id: company.id,
          attendance_id: att.id,
          employee_id: att.employee_id,
          submitted_by: users.find((u) => u.employee_id === att.employee_id)?.id || users[0]?.id,
          correction_type: 'clock_in',
          correct_clock_in: new Date('2024-01-01T08:00:00'),
          reason: 'Terlambat karena macet parah, sebenarnya sudah sampai',
          status: i === 0 ? 'pending' : i === 1 ? 'approved' : 'rejected',
          supervisor_id: supervisor.id,
          supervisor_approved_at: i === 1 ? new Date() : null,
          hrga_manager_id: i === 1 ? managerHrga.id : null,
          hrga_approved_at: i === 1 ? new Date() : null,
          rejection_reason: i === 2 ? 'Tidak ada bukti pendukung' : null,
        },
      });
    }

    // ================================================
    // 7. RECRUITMENT - JOB POSTINGS + APPLICATIONS
    // ================================================
    console.log('  Seeding job postings & applications...');
    const departments = await prisma.ms_departments.findMany({
      where: { company_id: company.id },
    });
    const positions = await prisma.ms_positions.findMany({
      where: { company_id: company.id },
    });

    const jobPostings = [
      {
        title: 'Software Engineer',
        deptIdx: departments.findIndex((d) => d.code === 'IT') >= 0
          ? departments.findIndex((d) => d.code === 'IT') : 0,
        posIdx: positions.findIndex((p) => p.name.includes('Software')) >= 0
          ? positions.findIndex((p) => p.name.includes('Software')) : 0,
        type: 'full-time',
        desc: 'Mengembangkan dan memelihara aplikasi HRIS menggunakan NestJS, React, dan PostgreSQL.',
        req: '- Minimal 2 tahun pengalaman dengan TypeScript/Node.js\n- Menguasai PostgreSQL\n- Familiar dengan Prisma ORM\n- Pengalaman dengan NestJS lebih disukai',
      },
      {
        title: 'HR Staff',
        deptIdx: departments.findIndex((d) => d.code === 'HR') >= 0
          ? departments.findIndex((d) => d.code === 'HR') : 0,
        posIdx: positions.findIndex((p) => p.name.includes('HR Staff')) >= 0
          ? positions.findIndex((p) => p.name.includes('HR Staff')) : 0,
        type: 'full-time',
        desc: 'Membantu proses administrasi HR, payroll, dan rekrutmen.',
        req: '- Pendidikan minimal S1 semua jurusan\n- Menguasai Microsoft Office\n- Teliti dan detail oriented\n- Pengalaman 1 tahun lebih disukai',
      },
      {
        title: 'Finance Intern',
        deptIdx: departments.findIndex((d) => d.code === 'FIN') >= 0
          ? departments.findIndex((d) => d.code === 'FIN') : 0,
        posIdx: positions.findIndex((p) => p.name.includes('Accountant')) >= 0
          ? positions.findIndex((p) => p.name.includes('Accountant')) : 0,
        type: 'internship',
        desc: 'Magang di bagian finance untuk membantu proses akuntansi harian.',
        req: '- Mahasiswa aktif jurusan Akuntansi/Manajemen\n- IPK minimal 3.0\n- Bersedia magang 3-6 bulan',
      },
    ];

    const createdJobIds: string[] = [];
    for (const job of jobPostings) {
      const slug = `${company.name.replace(/[^a-z]/gi, '').toLowerCase()}-${job.title.toLowerCase().replace(/\s+/g, '-')}-${genId().slice(0, 8)}`;
      const createdJob = await prisma.ms_job_postings.create({
        data: {
          id: genId(),
          company_id: company.id,
          title: job.title,
          department_id: departments[job.deptIdx]?.id || departments[0].id,
          position_id: positions[job.posIdx]?.id || positions[0].id,
          location_id: location?.id || null,
          description: job.desc,
          requirements: job.req,
          employment_type: job.type,
          status: job.title === 'Finance Intern' ? 'draft' : 'open',
          public_slug: slug,
          opened_at: job.title === 'Finance Intern' ? null : pastDays(5),
          created_by: users[0]?.id || null,
        },
      });
      createdJobIds.push(createdJob.id);
    }

    // Applications for open jobs
    const applicants = [
      { name: 'Aulia Rahman', email: 'aulia.rahman@email.com', phone: '08123456781', status: 'new' },
      { name: 'Dian Permata', email: 'dian.permata@email.com', phone: '08123456782', status: 'reviewed' },
      { name: 'Eko Prasetyo', email: 'eko.pras@email.com', phone: '08123456783', status: 'interviewed' },
      { name: 'Fajar Nugroho', email: 'fajar.nugroho@email.com', phone: '08123456784', status: 'offered' },
      { name: 'Gita Savitri', email: 'gita.savitri@email.com', phone: '08123456785', status: 'rejected' },
      { name: 'Hendra Gunawan', email: 'hendra.gunawan@email.com', phone: '08123456786', status: 'hired' },
    ];

    for (let i = 0; i < createdJobIds.length && i < 2; i++) {
      for (const app of applicants) {
        await prisma.tr_job_applications.create({
          data: {
            id: genId(),
            company_id: company.id,
            job_posting_id: createdJobIds[i],
            full_name: app.name,
            email: app.email,
            phone: app.phone,
            resume_url: `https://storage.example.com/resume/${company.id.slice(0, 8)}/${app.name.toLowerCase().replace(/\s+/g, '-')}.pdf`,
            cover_letter: `Saya sangat tertarik dengan posisi ini dan percaya pengalaman saya sesuai.`,
            status: app.status,
          },
        });
      }
    }

    // ================================================
    // 8. THR RECORDS
    // ================================================
    console.log('  Seeding THR records...');
    const currentYear = new Date().getFullYear();
    for (const emp of employees) {
      const baseSalary = parseInt(emp.base_salary || '5000000');
      const monthsWorked = Math.floor(Math.random() * 3) + 10; // 10-12 months
      const isProrated = monthsWorked < 12;
      const thrAmount = Math.round((baseSalary / 12) * monthsWorked);

      await prisma.tr_thr_records.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: emp.id,
          period_name: `THR ${currentYear}`,
          base_salary: baseSalary,
          months_worked: monthsWorked,
          thr_amount: thrAmount,
          is_prorated: isProrated,
          status: emp.id === employees[0].id ? 'paid' : 'draft',
          paid_at: emp.id === employees[0].id ? pastDays(5) : null,
        },
      });
    }

    // ================================================
    // 9. USER DEVICES
    // ================================================
    console.log('  Seeding user devices...');
    const platforms = ['android', 'ios'];
    for (const user of users.slice(0, 3)) {
      await prisma.tr_user_devices.create({
        data: {
          id: genId(),
          user_id: user.id,
          fcm_token: `fcm-${genId().replace(/-/g, '')}`,
          device_id: `device-${genId().slice(0, 8)}`,
          platform: platforms[Math.floor(Math.random() * platforms.length)],
          is_active: true,
        },
      });
    }

    // ================================================
    // 10. AUDIT LOGS
    // ================================================
    console.log('  Seeding audit logs...');
    const auditActions = [
      { table: 'ms_employees', action: 'UPDATE', desc: 'Update data karyawan' },
      { table: 'ms_employees', action: 'CREATE', desc: 'Tambah karyawan baru' },
      { table: 'tr_attendances', action: 'UPDATE', desc: 'Koreksi absensi' },
      { table: 'tr_leave_requests', action: 'UPDATE', desc: 'Approval cuti' },
      { table: 'tr_reimbursements', action: 'UPDATE', desc: 'Approval reimbursemen' },
    ];

    for (const log of auditActions) {
      const randomEmp = employees[Math.floor(Math.random() * employees.length)];
      const randomUser = users.find((u) => u.employee_id === randomEmp.id) || users[0];

      await prisma.tr_audit_logs.create({
        data: {
          id: genId(),
          company_id: company.id,
          table_name: log.table,
          record_id: randomEmp.id,
          action: log.action,
          old_values: { note: 'previous value' },
          new_values: { note: log.desc },
          performed_by: randomUser.id,
          performed_at: pastDays(Math.floor(Math.random() * 7)),
        },
      });
    }

    // ================================================
    // 11. ADDITIONAL NOTIFICATIONS
    // ================================================
    console.log('  Seeding additional notifications...');
    const notificationTemplates = [
      { type: 'approval', title: 'Pengajuan Cuti Disetujui', message: 'Pengajuan cuti Anda telah disetujui oleh atasan.' },
      { type: 'reminder', title: 'Reminder Absensi', message: 'Jangan lupa melakukan absensi hari ini.' },
      { type: 'info', title: 'Penggajian', message: 'Slip gaji bulan ini sudah tersedia.' },
      { type: 'warning', title: 'Sisa Cuti', message: 'Sisa cuti tahunan Anda tinggal sedikit.' },
    ];

    for (const user of users) {
      const template = notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)];
      await prisma.tr_notifications.create({
        data: {
          id: genId(),
          company_id: company.id,
          user_id: user.id,
          type: template.type,
          title: template.title,
          message: template.message,
          is_read: Math.random() > 0.5,
        },
      });
    }

    console.log(`  Complete for ${company.name}`);
  }

  console.log('\n✓ Additional seed data complete!');
  console.log('Features seeded:');
  console.log('  - Reimbursements');
  console.log('  - Time Off Requests');
  console.log('  - Overnight Requests');
  console.log('  - Remote Work (WFH) Requests');
  console.log('  - Loan Deductions');
  console.log('  - Attendance Corrections');
  console.log('  - Job Postings & Applications');
  console.log('  - THR Records');
  console.log('  - User Devices');
  console.log('  - Audit Logs');
  console.log('  - Additional Notifications');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
