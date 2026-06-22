-- Seed dummy data for tr_reimbursements testing
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Seed Company
-- ============================================
INSERT INTO ms_companies (id, name, code, is_active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'PT Dummy Sejahtera', 'DUMMY001', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Seed Roles
-- ============================================
INSERT INTO ms_roles (id, name, display_name, permissions)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'employee', 'Karyawan', '["read_own_reimbursement"]'),
  ('22222222-2222-2222-2222-222222222223', 'supervisor', 'Supervisor', '["read_own_reimbursement","approve_reimbursement"]'),
  ('22222222-2222-2222-2222-222222222224', 'hrd', 'HRD', '["read_all_reimbursement","approve_reimbursement"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Seed Employees (first pass, no supervisor)
-- ============================================
INSERT INTO ms_employees (id, full_name, nik, is_active)
VALUES 
  ('33333333-3333-3333-3333-333333333331', 'Budi Santoso', 'EMP001', true),
  ('33333333-3333-3333-3333-333333333332', 'Andi Wijaya', 'SUP001', true),
  ('33333333-3333-3333-3333-333333333333', 'Siti Aminah', 'HRD001', true)
ON CONFLICT (id) DO NOTHING;

-- Update supervisor relationships
UPDATE ms_employees SET supervisor_id = '33333333-3333-3333-3333-333333333332' WHERE id = '33333333-3333-3333-3333-333333333331';
UPDATE ms_employees SET supervisor_id = '33333333-3333-3333-3333-333333333333' WHERE id = '33333333-3333-3333-3333-333333333332';

-- ============================================
-- 4. Seed Users (password: Password123!)
-- bcrypt hash below is for "Password123!"
-- ============================================
INSERT INTO ms_users (id, role_id, company_id, employee_id, email, password_hash, full_name, is_active)
VALUES 
  ('44444444-4444-4444-4444-444444444441', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 'budi@dummy.com', '$2a$10$VlKJ6vOj7FqJkQJ4vLkX9OeQkQkQkQkQkQkQkQkQkQkQkQkQkQkQkQ', 'Budi Santoso', true),
  ('44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333332', 'andi@dummy.com', '$2a$10$VlKJ6vOj7FqJkQJ4vLkX9OeQkQkQkQkQkQkQkQkQkQkQkQkQkQkQkQ', 'Andi Wijaya', true),
  ('44444444-4444-4444-4444-444444444443', '22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'siti@dummy.com', '$2a$10$VlKJ6vOj7FqJkQJ4vLkX9OeQkQkQkQkQkQkQkQkQkQkQkQkQkQkQkQ', 'Siti Aminah', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Seed Reimbursements
-- ============================================
INSERT INTO tr_reimbursements (id, employee_id, date, category, amount, description, status, supervisor_id, created_at)
VALUES 
  -- Pending reimbursements (employee: Budi)
  ('55555555-5555-5555-5555-555555555551', '33333333-3333-3333-3333-333333333331', '2026-04-20', 'Transportasi', 150000.00, 'Taksi ke kantor klien', 'pending', '33333333-3333-3333-3333-333333333332', now()),
  ('55555555-5555-5555-5555-555555555552', '33333333-3333-3333-3333-333333333331', '2026-04-21', 'Makanan', 85000.00, 'Makan siang meeting', 'pending', '33333333-3333-3333-3333-333333333332', now()),
  
  -- Supervisor approved (employee: Budi)
  ('55555555-5555-5555-5555-555555555553', '33333333-3333-3333-3333-333333333331', '2026-04-15', 'Parkir', 50000.00, 'Parkir harian April', 'supervisor_approved', '33333333-3333-3333-3333-333333333332', '2026-04-15T10:00:00Z'),
  
  -- Fully approved (employee: Budi)
  ('55555555-5555-5555-5555-555555555554', '33333333-3333-3333-3333-333333333331', '2026-04-10', 'Bensin', 200000.00, 'Bensin operasional', 'approved', '33333333-3333-3333-3333-333333333332', '2026-04-10T08:00:00Z'),
  
  -- Rejected (employee: Budi)
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333331', '2026-04-05', 'Hotel', 750000.00, 'Menginap luar kota', 'rejected', '33333333-3333-3333-3333-333333333332', '2026-04-05T09:00:00Z'),
  
  -- Pending from supervisor Andi (supervised by HRD Siti)
  ('55555555-5555-5555-5555-555555555556', '33333333-3333-3333-3333-333333333332', '2026-04-25', 'Perjalanan Dinas', 1250000.00, 'Tiket pesawat Jakarta - Surabaya', 'pending', '33333333-3333-3333-3333-333333333333', now())
ON CONFLICT (id) DO NOTHING;

-- Update approved_at timestamps for fully approved records
UPDATE tr_reimbursements 
SET supervisor_approved_at = '2026-04-11T09:00:00Z', hr_approved_by = '33333333-3333-3333-3333-333333333333', hr_approved_at = '2026-04-12T10:00:00Z'
WHERE id = '55555555-5555-5555-5555-555555555554';

-- Update rejection_reason for rejected record
UPDATE tr_reimbursements 
SET rejection_reason = 'Melebihi batas limit harian'
WHERE id = '55555555-5555-5555-5555-555555555555';

-- Update supervisor_approved_at for supervisor approved record
UPDATE tr_reimbursements 
SET supervisor_approved_at = '2026-04-16T11:00:00Z'
WHERE id = '55555555-5555-5555-5555-555555555553';
