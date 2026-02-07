-- Step 2: Insert Francophone/Lusophone African countries and regional pricing

-- Map Francophone/Lusophone countries to the new region
INSERT INTO country_region_mapping (country_code, country_name, region) VALUES
  ('SN', 'Senegal', 'africa_francophone'),
  ('ML', 'Mali', 'africa_francophone'),
  ('CI', 'Côte d''Ivoire', 'africa_francophone'),
  ('BF', 'Burkina Faso', 'africa_francophone'),
  ('NE', 'Niger', 'africa_francophone'),
  ('GN', 'Guinea', 'africa_francophone'),
  ('TD', 'Chad', 'africa_francophone'),
  ('CM', 'Cameroon', 'africa_francophone'),
  ('CG', 'Congo', 'africa_francophone'),
  ('CD', 'DR Congo', 'africa_francophone'),
  ('GA', 'Gabon', 'africa_francophone'),
  ('CF', 'Central African Republic', 'africa_francophone'),
  ('TG', 'Togo', 'africa_francophone'),
  ('BJ', 'Benin', 'africa_francophone'),
  ('MR', 'Mauritania', 'africa_francophone'),
  ('DJ', 'Djibouti', 'africa_francophone'),
  ('MG', 'Madagascar', 'africa_francophone'),
  ('RW', 'Rwanda', 'africa_francophone'),
  ('BI', 'Burundi', 'africa_francophone'),
  ('GQ', 'Equatorial Guinea', 'africa_francophone'),
  ('AO', 'Angola', 'africa_francophone'),
  ('CV', 'Cape Verde', 'africa_francophone'),
  ('GW', 'Guinea-Bissau', 'africa_francophone'),
  ('MZ', 'Mozambique', 'africa_francophone'),
  ('ST', 'São Tomé and Príncipe', 'africa_francophone')
ON CONFLICT (country_code) DO UPDATE SET region = 'africa_francophone';

-- Add regional pricing for Beta Membership: EUR €2.50 for Francophone/Lusophone Africa
INSERT INTO product_regional_pricing (product_id, region, fixed_price, currency, discount_percentage)
VALUES ('a0e4cee3-0074-4246-8162-f1d9c69b32d8', 'africa_francophone', 2.50, 'EUR', 0);