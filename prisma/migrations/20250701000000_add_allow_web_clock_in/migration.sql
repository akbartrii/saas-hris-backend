-- Add allow_web_clock_in column to ms_employees with default false
ALTER TABLE ms_employees 
ADD COLUMN IF NOT EXISTS allow_web_clock_in BOOLEAN DEFAULT false;
