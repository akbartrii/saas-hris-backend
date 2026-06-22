import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MenuDef {
  code: string;
  name: string;
  icon?: string;
  actions: string[];
  children?: MenuDef[];
}

const menus: MenuDef[] = [
  { code: 'dashboard', name: 'Dashboard', icon: 'layout-dashboard', actions: ['view'] },
  { code: 'employee', name: 'Karyawan', icon: 'users', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'attendance', name: 'Absensi', icon: 'fingerprint', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'leave', name: 'Cuti', icon: 'calendar-off', actions: ['list', 'create', 'update', 'delete', 'approve'] },
  { code: 'overtime', name: 'Lembur', icon: 'clock-plus', actions: ['list', 'create', 'update', 'delete', 'approve'] },
  { code: 'overnight', name: 'Lembur Menginap', icon: 'moon', actions: ['list', 'create', 'update', 'delete', 'approve'] },
  { code: 'reimbursement', name: 'Reimbursement', icon: 'receipt', actions: ['list', 'create', 'update', 'delete', 'approve'] },
  { code: 'payroll', name: 'Penggajian', icon: 'wallet', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'loan', name: 'Pinjaman', icon: 'hand-coins', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'schedule', name: 'Jadwal Kerja', icon: 'calendar-clock', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'training', name: 'Pelatihan', icon: 'book-open', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'performance', name: 'Kinerja', icon: 'trending-up', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'resignation', name: 'Pengunduran Diri', icon: 'door-open', actions: ['list', 'create', 'approve'] },
  { code: 'asset', name: 'Aset', icon: 'package', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'recruitment', name: 'Rekrutmen', icon: 'user-plus', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'bpjs', name: 'BPJS', icon: 'heart-handshake', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'tax', name: 'Pajak (PPh 21)', icon: 'receipt-tax', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'report', name: 'Laporan', icon: 'file-bar-chart', actions: ['view', 'export'] },
  { code: 'company', name: 'Perusahaan', icon: 'building', actions: ['list', 'update'] },
  { code: 'user', name: 'User', icon: 'user-cog', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'role', name: 'Role', icon: 'shield', actions: ['list', 'create', 'update', 'delete'] },
  { code: 'setting', name: 'Pengaturan', icon: 'settings', actions: ['view', 'update'] },
  { code: 'overnight_allowance', name: 'Tunjangan Lembur', icon: 'utensils', actions: ['list', 'create', 'update', 'delete'] },
];

async function main() {
  console.log('Seeding menus and permissions...\n');

  let totalMenus = 0;
  let totalPermissions = 0;

  for (const def of menus) {
    const existingMenu = await prisma.ms_menus.findUnique({ where: { code: def.code } });
    if (existingMenu) {
      console.log(`Skipping existing menu: ${def.code}`);
      continue;
    }

    const menu = await prisma.ms_menus.create({
      data: {
        code: def.code,
        name: def.name,
        icon: def.icon || null,
        sort_order: menus.indexOf(def),
      },
    });
    totalMenus++;

    for (const action of def.actions) {
      await prisma.ms_permissions.create({
        data: {
          menu_id: menu.id,
          action,
          description: `${def.name} - ${getActionLabel(action)}`,
        },
      });
      totalPermissions++;
    }

    console.log(`  Created: ${def.code} (${def.actions.join(', ')})`);
  }

  console.log(`\nDone! ${totalMenus} menus, ${totalPermissions} permissions created.`);
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    view: 'Lihat',
    list: 'Lihat Daftar',
    create: 'Tambah',
    update: 'Ubah',
    delete: 'Hapus',
    approve: 'Setujui',
    export: 'Export',
  };
  return labels[action] || action;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
