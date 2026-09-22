-- Cari semua data Rafi dari SEMUA tabel yang mungkin
SELECT 'students' as table_name, id, name, date_of_birth, status 
FROM students 
WHERE name ILIKE '%rafi%'
UNION ALL
SELECT 'portal_students', id, name, date_of_birth, status 
FROM portal_students 
WHERE name ILIKE '%rafi%'
ORDER BY table_name, name;
