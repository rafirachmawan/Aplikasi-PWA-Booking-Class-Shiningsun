-- Test Query: Cek tanggal lahir siswa bernama Rafi Rachmawian
SELECT 
  id, 
  name, 
  date_of_birth,
  status,
  CASE 
    WHEN EXTRACT(MONTH FROM date_of_birth) = 9 AND EXTRACT(DAY FROM date_of_birth) = 22 
    THEN '✓ Hari Ini!' 
    ELSE '✗ Bukan hari ini' 
  END as birthday_status
FROM students 
WHERE name ILIKE '%rafirachmawan%' OR name ILIKE '%rafi%';

-- Also check if there are multiple students with same name
SELECT COUNT(*) FROM students WHERE name ILIKE '%rafirachmawan%';
