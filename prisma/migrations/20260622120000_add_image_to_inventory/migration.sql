-- Add imageUrl column to gym_equipment table
ALTER TABLE gym_equipment ADD COLUMN IF NOT EXISTS imageUrl VARCHAR(500) NULL;

-- Add imageUrl column to equipment_requests table
ALTER TABLE equipment_requests ADD COLUMN IF NOT EXISTS imageUrl VARCHAR(500) NULL;
