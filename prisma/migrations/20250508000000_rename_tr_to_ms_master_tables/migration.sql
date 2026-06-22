-- Rename master data tables from tr_ (transaction) prefix to ms_ (master) prefix
-- Tables being renamed: tr_employees, tr_users, tr_face_registrations

-- Rename tables
ALTER TABLE "tr_employees" RENAME TO "ms_employees";
ALTER TABLE "tr_users" RENAME TO "ms_users";
ALTER TABLE "tr_face_registrations" RENAME TO "ms_face_registrations";

-- Update sequence names (if any were auto-generated with old table names)
-- PostgreSQL renames sequences automatically on table rename, but explicit ones may need updating

-- Note: Foreign key constraints, indexes, and triggers are automatically
-- updated by PostgreSQL when the table is renamed.
