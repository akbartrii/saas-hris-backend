INSERT INTO "ms_leave_types" ("id", "name", "code", "category", "default_days", "is_annual", "is_paid", "requires_attachment", "max_days_per_request", "created_at")
VALUES (gen_random_uuid(), 'Cuti Umroh', 'UMROH', 'special', 30, false, true, true, 30, now())
ON CONFLICT ("code") DO UPDATE 
SET "name" = EXCLUDED."name", "default_days" = EXCLUDED."default_days";
