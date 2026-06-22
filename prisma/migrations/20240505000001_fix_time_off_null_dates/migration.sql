-- Fix existing NULL start_date/end_date in tr_time_off_requests
-- Set them to created_at::date (or CURRENT_DATE if created_at is also NULL)

UPDATE "tr_time_off_requests"
SET 
    "start_date" = COALESCE("created_at"::date, CURRENT_DATE),
    "end_date" = COALESCE("created_at"::date, CURRENT_DATE)
WHERE "start_date" IS NULL OR "end_date" IS NULL;
