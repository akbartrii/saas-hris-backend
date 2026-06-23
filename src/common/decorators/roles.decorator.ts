import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

export type Role =
  | "karyawan"
  | "atasan"
  | "manager_hrga"
  | "hrd"
  | "admin"
  | "super_admin";

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
