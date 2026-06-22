interface RolePermissionDef {
  roleName: string;
  displayName: string;
  permissions: Array<{ menu: string; actions: string[] }>;
}

export const DEFAULT_ROLES: RolePermissionDef[] = [
  {
    roleName: 'admin',
    displayName: 'Admin',
    permissions: [], // empty = all permissions
  },
  {
    roleName: 'hrd',
    displayName: 'HRD',
    permissions: [
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
  },
  {
    roleName: 'manager_hrga',
    displayName: 'Manager HRGA',
    permissions: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'employee', actions: ['list'] },
      { menu: 'attendance', actions: ['list'] },
      { menu: 'leave', actions: ['list', 'approve'] },
      { menu: 'overtime', actions: ['list', 'approve'] },
      { menu: 'overnight', actions: ['list', 'approve'] },
      { menu: 'reimbursement', actions: ['list', 'approve'] },
      { menu: 'report', actions: ['view', 'export'] },
    ],
  },
  {
    roleName: 'atasan',
    displayName: 'Atasan',
    permissions: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'employee', actions: ['list'] },
      { menu: 'attendance', actions: ['list'] },
      { menu: 'leave', actions: ['list', 'approve'] },
      { menu: 'overtime', actions: ['list', 'approve'] },
      { menu: 'overnight', actions: ['list', 'approve'] },
      { menu: 'reimbursement', actions: ['list', 'approve'] },
      { menu: 'resignation', actions: ['list', 'approve'] },
    ],
  },
  {
    roleName: 'karyawan',
    displayName: 'Karyawan',
    permissions: [
      { menu: 'dashboard', actions: ['view'] },
      { menu: 'attendance', actions: ['create'] },
      { menu: 'leave', actions: ['create'] },
      { menu: 'overtime', actions: ['create'] },
      { menu: 'overnight', actions: ['create'] },
      { menu: 'reimbursement', actions: ['create'] },
      { menu: 'schedule', actions: ['list'] },
      { menu: 'employee', actions: ['list'] },
    ],
  },
];
