import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function genId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function today(daysAgo = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toTime(h: number, m = 0): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

interface Company {
  id: string;
  name: string;
  adminEmail: string;
}

const companies: Company[] = [
  { id: genId(), name: 'PT Maju Jaya', adminEmail: 'admin@majujaya.com' },
  { id: genId(), name: 'PT Sukses Abadi', adminEmail: 'admin@suksesabadi.com' },
  { id: genId(), name: 'PT Karya Mandiri', adminEmail: 'admin@karyamandiri.com' },
];

const PASSWORD = 'password123';

async function main() {
  console.log('Cleaning existing data...');
  await prisma.tr_notifications.deleteMany();
  await prisma.tr_payslips.deleteMany();
  await prisma.tr_payroll_periods.deleteMany();
  await prisma.tr_overtime_requests.deleteMany();
  await prisma.tr_leave_requests.deleteMany();
  await prisma.tr_leave_balances.deleteMany();
  await prisma.tr_attendances.deleteMany();
  await prisma.tr_employee_schedules.deleteMany();
  await prisma.ms_subscriptions.deleteMany();
  await prisma.ms_holiday_calendars.deleteMany();
  await prisma.ms_face_registrations.deleteMany();
  await prisma.ms_employees.deleteMany();
  await prisma.ms_users.deleteMany();
  await prisma.ms_overtime_meal_allowances.deleteMany();
  await prisma.ms_time_off_types.deleteMany();
  await prisma.ms_leave_types.deleteMany();
  await prisma.ms_parameters.deleteMany();
  await prisma.ms_work_schedules.deleteMany();
  await prisma.ms_locations.deleteMany();
  await prisma.ms_teams.deleteMany();
  await prisma.ms_positions.deleteMany();
  await prisma.ms_departments.deleteMany();
  await prisma.ms_role_permissions.deleteMany();
  await prisma.ms_job_postings.deleteMany();
  await prisma.ms_companies.deleteMany();
  await prisma.ms_roles.deleteMany();
  await prisma.ms_salary_keys.deleteMany();

  console.log('Seeding roles...');
  const roles: Record<string, string> = {};

  for (const c of companies) {
    await prisma.ms_companies.create({
      data: {
        id: c.id,
        name: c.name,
        code: c.name.replace(/[^a-z]/gi, '').toLowerCase(),
        is_active: true,
      },
    });
  }
  console.log('3 companies created');
  const roleNames = ['super_admin', 'admin', 'hrd', 'manager_hrga', 'atasan', 'karyawan'];
  for (const name of roleNames) {
    let role = await prisma.ms_roles.findFirst({ where: { name, company_id: null } });
    if (!role) {
      role = await prisma.ms_roles.create({
        data: {
          id: genId(),
          name,
          company_id: null,
          display_name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        },
      });
    }
    roles[name] = role.id;
  }

  console.log('Assigning permissions to roles...');
  const allPermissions = await prisma.ms_permissions.findMany({
    include: { menu: true },
  });

  const permByMenu = new Map<string, string[]>();
  for (const perm of allPermissions) {
    const key = perm.menu.code;
    if (!permByMenu.has(key)) permByMenu.set(key, []);
    permByMenu.get(key).push(perm.id);
  }

  const rolePermMap: Record<string, Array<{ menu: string; actions: string[] }>> = {
    super_admin: [],
    admin: [],
    hrd: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'employee', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'attendance', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'leave', actions: ['list', 'create', 'update', 'delete', 'approve'] },
      { menu: 'overtime', actions: ['list', 'create', 'update', 'delete', 'approve'] },
      { menu: 'overnight', actions: ['list', 'create', 'update', 'delete', 'approve'] },
      { menu: 'reimbursement', actions: ['list', 'create', 'update', 'delete', 'approve'] },
      { menu: 'payroll', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'loan', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'schedule', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'training', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'performance', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'resignation', actions: ['list', 'create', 'approve'] },
      { menu: 'asset', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'recruitment', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'bpjs', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'tax', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'report', actions: ['view', 'export'] },
      { menu: 'user', actions: ['list', 'create', 'update', 'delete'] },
      { menu: 'role', actions: ['list', 'update'] },
      { menu: 'overnight_allowance', actions: ['list', 'create', 'update', 'delete'] },
    ],
    manager_hrga: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'employee', actions: ['list'] },
      { menu: 'attendance', actions: ['list'] },
      { menu: 'leave', actions: ['list', 'approve'] },
      { menu: 'overtime', actions: ['list', 'approve'] },
      { menu: 'overnight', actions: ['list', 'approve'] },
      { menu: 'reimbursement', actions: ['list', 'approve'] },
      { menu: 'report', actions: ['view', 'export'] },
    ],
    atasan: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'employee', actions: ['list'] },
      { menu: 'attendance', actions: ['list'] },
      { menu: 'leave', actions: ['list', 'approve'] },
      { menu: 'overtime', actions: ['list', 'approve'] },
      { menu: 'overnight', actions: ['list', 'approve'] },
      { menu: 'reimbursement', actions: ['list', 'approve'] },
      { menu: 'resignation', actions: ['list', 'approve'] },
    ],
    karyawan: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'attendance', actions: ['create'] },
      { menu: 'leave', actions: ['create'] },
      { menu: 'overtime', actions: ['create'] },
      { menu: 'overnight', actions: ['create'] },
      { menu: 'reimbursement', actions: ['create'] },
      { menu: 'schedule', actions: ['list'] },
      { menu: 'employee', actions: ['list'] },
    ],
  };

  for (const [roleName, menuPerms] of Object.entries(rolePermMap)) {
    if (!roles[roleName]) continue;

    let permissionIds: string[] = [];
    if (roleName === 'super_admin' || roleName === 'admin') {
      permissionIds = allPermissions.map((p) => p.id);
    } else {
      for (const mp of menuPerms) {
        const menuPids = allPermissions
          .filter((p) => p.menu.code === mp.menu && mp.actions.includes(p.action))
          .map((p) => p.id);
        permissionIds.push(...menuPids);
      }
    }

    await prisma.ms_role_permissions.deleteMany({ where: { role_id: roles[roleName] } });
    if (permissionIds.length > 0) {
      await prisma.ms_role_permissions.createMany({
        data: permissionIds.map((permission_id) => ({
          role_id: roles[roleName],
          permission_id,
        })),
      });
    }
    console.log(`  Assigned ${permissionIds.length} permissions to: ${roleName}`);
  }

  const plans = await prisma.ms_plans.findMany();
  const freePlan = plans.find((p) => p.code === 'free');
  const proPlan = plans.find((p) => p.code === 'professional');

  for (const company of companies) {
    console.log(`\n=== Seeding ${company.name} ===`);

    // Departments
    const deptIds: Record<string, string> = {};
    const departments = [
      { name: 'Human Resources', code: 'HR' },
      { name: 'Finance', code: 'FIN' },
      { name: 'Information Technology', code: 'IT' },
      { name: 'Operations', code: 'OPS' },
      { name: 'Marketing', code: 'MKT' },
    ];
    for (const dept of departments) {
      const d = await prisma.ms_departments.create({
        data: {
          id: genId(),
          company_id: company.id,
          name: dept.name,
          code: dept.code,
        },
      });
      deptIds[dept.code] = d.id;
    }

    // Positions
    const positionIds: Record<string, string> = {};
    const positions = [
      { name: 'Chief Executive Officer', level: 'C-level', dept: 'HR' },
      { name: 'HR Manager', level: 'Manager', dept: 'HR' },
      { name: 'HR Staff', level: 'Staff', dept: 'HR' },
      { name: 'Finance Manager', level: 'Manager', dept: 'FIN' },
      { name: 'Accountant', level: 'Staff', dept: 'FIN' },
      { name: 'IT Manager', level: 'Manager', dept: 'IT' },
      { name: 'Software Engineer', level: 'Staff', dept: 'IT' },
      { name: 'Operations Manager', level: 'Manager', dept: 'OPS' },
      { name: 'Operations Staff', level: 'Staff', dept: 'OPS' },
    ];
    for (const pos of positions) {
      const p = await prisma.ms_positions.create({
        data: {
          id: genId(),
          company_id: company.id,
          department_id: deptIds[pos.dept],
          name: pos.name,
          level: pos.level,
        },
      });
      positionIds[pos.name] = p.id;
    }

    // Work schedules
    const scheduleIds: Record<string, string> = {};
    const schedules = [
      { name: 'Regular Shift', shift_code: 'RG', schedule_type: 'regular', start_time: 8, end_time: 17, break_start: 12, break_end: 13 },
      { name: 'Morning Shift', shift_code: 'MR', schedule_type: 'morning', start_time: 6, end_time: 15, break_start: 10, break_end: 11 },
    ];
    for (const s of schedules) {
      const sch = await prisma.ms_work_schedules.create({
        data: {
          id: genId(),
          company_id: company.id,
          name: s.name,
          shift_code: s.shift_code,
          schedule_type: s.schedule_type,
          start_time: toTime(s.start_time),
          end_time: toTime(s.end_time),
          break_start: toTime(s.break_start),
          break_end: toTime(s.break_end),
          work_days: [1, 2, 3, 4, 5],
        },
      });
      scheduleIds[s.name] = sch.id;
    }

    // Locations
    const loc = await prisma.ms_locations.create({
      data: {
        id: genId(),
        company_id: company.id,
        name: 'Head Office',
        type: 'office',
        latitude: -6.2088,
        longitude: 106.8456,
        radius_meters: 200,
        address: `${company.name} HQ, Jakarta`,
      },
    });

    // Leave types
    const leaveTypeIds: Record<string, string> = {};
    const leaveTypes = [
      { name: 'Annual Leave', code: 'AL', default_days: 12, is_annual: true, is_paid: true },
      { name: 'Sick Leave', code: 'SL', default_days: 14, is_annual: true, is_paid: true },
      { name: 'Marriage Leave', code: 'ML', default_days: 3, is_annual: false, is_paid: true },
      { name: 'Maternity Leave', code: 'MTL', default_days: 90, is_annual: false, is_paid: true },
      { name: 'Bereavement Leave', code: 'BL', default_days: 3, is_annual: false, is_paid: true },
    ];
    for (const lt of leaveTypes) {
      const ltId = genId();
      await prisma.ms_leave_types.upsert({
        where: { id: ltId },
        update: { name: lt.name, default_days: lt.default_days },
        create: {
          id: ltId,
          company_id: company.id,
          name: lt.name,
          code: `${company.id.slice(0, 4)}_${lt.code}`,
          default_days: lt.default_days,
          is_annual: lt.is_annual,
          is_paid: lt.is_paid,
        },
      });
      leaveTypeIds[lt.code] = ltId;
    }

    // Time off types
    await prisma.ms_time_off_types.create({
      data: { id: genId(), company_id: company.id, name: 'Unpaid Leave', code: company.id.slice(0, 4) + '_UL', affects_salary: true },
    });
    await prisma.ms_time_off_types.create({
      data: { id: genId(), company_id: company.id, name: 'Dispensasi', code: company.id.slice(0, 4) + '_DS', affects_salary: false },
    });

    // Parameters
    await prisma.ms_parameters.createMany({
      data: [
        { company_id: company.id, key: 'overtime_multiplier_weekday', value: '1.5' },
        { company_id: company.id, key: 'overtime_multiplier_weekend', value: '2' },
        { company_id: company.id, key: 'overtime_divisor', value: '173' },
        { company_id: company.id, key: 'overtime_weekday_first_8h_multiplier', value: '1.5' },
        { company_id: company.id, key: 'overtime_weekday_beyond_8h_multiplier', value: '2' },
        { company_id: company.id, key: 'overtime_weekend_first_8h_multiplier', value: '2' },
        { company_id: company.id, key: 'overtime_weekend_9_10h_multiplier', value: '3' },
        { company_id: company.id, key: 'overtime_weekend_beyond_10h_multiplier', value: '4' },
        { company_id: company.id, key: 'late_tolerance_minutes', value: '15' },
        { company_id: company.id, key: 'early_leave_tolerance_minutes', value: '15' },
        { company_id: company.id, key: 'work_start_hour', value: '8' },
        { company_id: company.id, key: 'work_end_hour', value: '17' },
      ],
    });

    // Create users & employees
    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    interface EmployeeDef {
      name: string;
      role: string;
      dept: string;
      position: string;
      isSupervisor?: boolean;
    }

    const employeeDefs: EmployeeDef[] = [
      { name: 'Budi Santoso', role: 'super_admin', dept: 'HR', position: 'Chief Executive Officer', isSupervisor: true },
      { name: 'Siti Rahayu', role: 'hrd', dept: 'HR', position: 'HR Manager', isSupervisor: true },
      { name: 'Ahmad Fauzi', role: 'karyawan', dept: 'HR', position: 'HR Staff' },
      { name: 'Dewi Lestari', role: 'admin', dept: 'FIN', position: 'Finance Manager', isSupervisor: true },
      { name: 'Rudi Hartono', role: 'karyawan', dept: 'FIN', position: 'Accountant' },
      { name: 'Indra Wijaya', role: 'manager_hrga', dept: 'IT', position: 'IT Manager', isSupervisor: true },
      { name: 'Rina Marlina', role: 'karyawan', dept: 'IT', position: 'Software Engineer' },
      { name: 'Agung Prasetyo', role: 'atasan', dept: 'OPS', position: 'Operations Manager', isSupervisor: true },
      { name: 'Fitri Handayani', role: 'karyawan', dept: 'OPS', position: 'Operations Staff' },
    ];

    const employeeIds: string[] = [];
    const userIds: string[] = [];
    let supervisorId: string | null = null;
    let managerId: string | null = null;

    for (const [idx, emp] of employeeDefs.entries()) {
      const userId = genId();
      const employeeId = genId();
      const email = `${emp.name.toLowerCase().replace(/\s+/g, '.')}.${company.id.slice(0, 4)}@${company.name.replace(/[^a-z]/gi, '').toLowerCase()}.com`;

      const user = await prisma.ms_users.create({
        data: {
          id: userId,
          company_id: company.id,
          role_id: roles[emp.role],
          email,
          employee_id: employeeId,
          password_hash: passwordHash,
          full_name: emp.name,
          is_active: true,
        },
      });
      userIds.push(user.id);

      const employee = await prisma.ms_employees.create({
        data: {
          id: employeeId,
          company_id: company.id,
          user_id: user.id,
          department_id: deptIds[emp.dept],
          position_id: positionIds[emp.position],
          location_id: loc.id,
          supervisor_id: idx === 0 ? null : (employeeIds[0] || null),
          manager_id: idx < 2 ? null : (employeeIds[1] || null),
          nik: company.id.slice(0, 4).toUpperCase() + String(idx + 1).padStart(4, '0'),
          full_name: emp.name,
          gender: emp.name.includes('Siti') || emp.name.includes('Dewi') || emp.name.includes('Rina') || emp.name.includes('Fitri') ? 'female' : 'male',
          employment_status: 'permanent',
          join_date: new Date('2023-01-01'),
          base_salary: '5000000',
          fixed_allowance: '2000000',
          phone_allowance: '500000',
          dinas_allowance: '1000000',
          is_active: true,
        },
      });
      employeeIds.push(employee.id);

      if (idx === 0) {
        supervisorId = employee.id;
        managerId = employee.id;
      } else if (idx === 1) {
        managerId = employee.id;
      }

      if (idx === 0) {
        if (idx === 0) {
          console.log(`  Admin: ${email} / ${PASSWORD}`);
        }
      }
    }

    // Employee schedules
    for (const empId of employeeIds) {
      await prisma.tr_employee_schedules.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: empId,
          schedule_id: scheduleIds['Regular Shift'],
          effective_date: new Date('2024-01-01'),
        },
      });
    }

    // Leave balances for this year
    for (const empId of employeeIds) {
      for (const lt of leaveTypes.filter((l) => l.is_annual)) {
        await prisma.tr_leave_balances.create({
          data: {
            id: genId(),
            company_id: company.id,
            employee_id: empId,
            leave_type_id: leaveTypeIds[lt.code],
            year: new Date().getFullYear(),
            total_days: lt.default_days,
            used_days: Math.floor(Math.random() * 3),
          },
        });
      }
    }

    // Attendance for last 30 days
    const todayDate = new Date();
    const calendar: Date[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        calendar.push(d);
      }
    }

    for (const empId of employeeIds.slice(0, 3)) {
      for (const day of calendar) {
        const clockIn = new Date(day);
        clockIn.setHours(7, 45 + Math.floor(Math.random() * 30), 0, 0);
        const clockOut = new Date(day);
        clockOut.setHours(16, 45 + Math.floor(Math.random() * 30), 0, 0);

        await prisma.tr_attendances.create({
          data: {
            id: genId(),
            company_id: company.id,
            employee_id: empId,
            location_id: loc.id,
            attendance_date: day,
            clock_in: clockIn,
            clock_out: clockOut,
            clock_in_lat: -6.2088,
            clock_in_lng: 106.8456,
            clock_out_lat: -6.2088,
            clock_out_lng: 106.8456,
            status: 'present',
            late_minutes: 0,
            early_leave_minutes: 0,
          },
        });
      }
    }

    // Leave requests
    const leaveEmployee = employeeIds[2];
    const leaveStart = new Date(todayDate);
    leaveStart.setDate(leaveStart.getDate() + 5);
    const leaveEnd = new Date(leaveStart);
    leaveEnd.setDate(leaveEnd.getDate() + 2);

    await prisma.tr_leave_requests.create({
      data: {
        id: genId(),
        company_id: company.id,
        employee_id: leaveEmployee,
        leave_type_id: leaveTypeIds['AL'],
        start_date: leaveStart,
        end_date: leaveEnd,
        total_days: 3,
        reason: 'Liburan keluarga',
        status: 'pending',
        supervisor_id: supervisorId || employeeIds[0],
      },
    });

    // Overtime requests
    const overtimeDate = new Date(todayDate);
    overtimeDate.setDate(overtimeDate.getDate() + 2);

    await prisma.tr_overtime_requests.create({
      data: {
        id: genId(),
        company_id: company.id,
        employee_id: employeeIds[4],
        requested_by: employeeIds[3],
        date: overtimeDate,
        start_time: toTime(18, 0),
        end_time: toTime(21, 0),
        total_hours: 3,
        day_type: 'weekday',
        description: 'Penyelesaian project',
        rate_per_hour: 28901.73,
        status: 'pending',
      },
    });

    // Payroll period
    const now = new Date();
    const payrollPeriod = await prisma.tr_payroll_periods.create({
      data: {
        id: genId(),
        company_id: company.id,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        period_name: `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`,
        start_date: new Date(now.getFullYear(), now.getMonth(), 1),
        end_date: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        status: 'draft',
      },
    });

    // Payslips
    for (const empId of employeeIds) {
      await prisma.tr_payslips.create({
        data: {
          id: genId(),
          company_id: company.id,
          employee_id: empId,
          payroll_period_id: payrollPeriod.id,
          base_salary: 5000000,
          fixed_allowance: 2000000,
          gross_income: 7000000,
          total_deductions: 500000,
          net_income: 6500000,
          status: 'draft',
        },
      });
    }

    // Subscription
    const planToUse = company.id === companies[0].id ? proPlan : freePlan;
    if (planToUse) {
      await prisma.ms_subscriptions.create({
        data: {
          id: genId(),
          company_id: company.id,
          plan_id: planToUse.id,
          status: 'active',
          starts_at: new Date('2025-01-01'),
          trial_ends_at: null,
        },
      });
    }

    // Holiday calendar for 2026
    const holidays2026 = [
      { date: '2026-01-01', name: 'Tahun Baru 2026', type: 'national' },
      { date: '2026-03-29', name: 'Hari Raya Nyepi', type: 'national' },
      { date: '2026-03-31', name: 'Idul Fitri', type: 'national' },
      { date: '2026-05-01', name: 'Hari Buruh', type: 'national' },
      { date: '2026-05-21', name: 'Waisak', type: 'national' },
      { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
      { date: '2026-08-17', name: 'Hari Kemerdekaan', type: 'national' },
      { date: '2026-12-25', name: 'Hari Natal', type: 'national' },
    ];
    for (const h of holidays2026) {
      await prisma.ms_holiday_calendars.create({
        data: {
          id: genId(),
          company_id: company.id,
          holiday_date: new Date(h.date),
          name: h.name,
          type: h.type,
          year: 2026,
        },
      });
    }
  }

  // Notifications
  const allUsers = await prisma.ms_users.findMany({ take: 5 });
  for (const user of allUsers) {
    await prisma.tr_notifications.createMany({
      data: [
        { id: genId(), company_id: user.company_id, user_id: user.id, type: 'info', title: 'Selamat Datang', message: 'Selamat bergabung di HRIS Samugara', is_read: false },
        { id: genId(), company_id: user.company_id, user_id: user.id, type: 'info', title: 'Pengajuan Cuti', message: 'Pengajuan cuti Anda telah diterima', is_read: false },
      ],
    });
  }

  console.log('\nSeed complete!');
  console.log('\nLogin credentials (all password: ' + PASSWORD + '):');
  const users = await prisma.ms_users.findMany({
    include: { ms_companies: true, ms_roles: true },
    orderBy: [{ company_id: 'asc' }, { full_name: 'asc' }],
  });
  for (const u of users) {
    console.log(`  [${u.ms_roles.name}] ${u.full_name} — ${u.email} (${u.ms_companies.name})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
