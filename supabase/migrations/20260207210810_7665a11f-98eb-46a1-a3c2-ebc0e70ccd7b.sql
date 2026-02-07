-- Step 1: Add africa_francophone to pricing_region enum
ALTER TYPE pricing_region ADD VALUE IF NOT EXISTS 'africa_francophone';