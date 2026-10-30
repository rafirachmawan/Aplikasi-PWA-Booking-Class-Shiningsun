const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        supabaseUrl = trimmed.split('=')[1].trim();
      }
      if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        serviceRoleKey = trimmed.split('=')[1].trim();
      }
    }
  }

  if (process.argv[2]) supabaseUrl = process.argv[2];
  if (process.argv[3]) serviceRoleKey = process.argv[3];

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: Supabase URL and Service Role Key are required!');
    process.exit(1);
  }

  console.log('Connecting to:', supabaseUrl);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
    db: { schema: 'public' }
  });

  console.log('Reading backup.json...');
  const raw = fs.readFileSync('backup.json', 'utf8');
  const parsed = JSON.parse(raw);
  const data = Array.isArray(parsed) ? parsed[0].data : (parsed.data || parsed);

  // Define insertion order respecting foreign keys
  const tables = [
    { name: 'branches', conflict: 'id' },
    { name: 'users', conflict: 'id' },
    { name: 'labels', conflict: 'id' },
    { name: 'classes', conflict: 'id' },
    { name: 'teachers', conflict: 'id' },
    { name: 'assessment_templates', conflict: 'id' },
    { name: 'students', conflict: 'id' },
    { name: 'schedule_slots', conflict: 'id' },
    { name: 'schedule_student', conflict: 'schedule_slot_id,student_id' },
    { name: 'student_worksheets', conflict: 'id' },
    { name: 'student_point_redemptions', conflict: 'id' },
    { name: 'student_feedback', conflict: 'id' },
    { name: 'birthday_templates', conflict: 'id' },
    { name: 'curriculum_documents', conflict: 'id' },
    { name: 'student_rules_documents', conflict: 'id' },
    { name: 'system_settings', conflict: 'key' }
  ];

  for (const { name, conflict } of tables) {
    const rows = data[name];
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log(`- ${name}: no records found, skipping.`);
      continue;
    }

    console.log(`\nStarting restore for table "${name}" (${rows.length} records)...`);
    const chunkSize = 250;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);

      let upsertOptions = {};
      if (conflict) {
        upsertOptions.onConflict = conflict;
      }

      const { error } = await supabase
        .from(name)
        .upsert(chunk, upsertOptions);

      if (error) {
        console.error(`\n[ERROR] Failed inserting batch ${i} - ${i + chunk.length} into "${name}":`, error.message);
        console.error('Error details:', error);
        throw error;
      }

      const progress = Math.min(i + chunkSize, rows.length);
      process.stdout.write(`  Progress: ${progress} / ${rows.length} rows (${Math.round((progress / rows.length) * 100)}%)\r`);
    }

    console.log(`\n✓ Completed table "${name}" (${rows.length} rows inserted).`);
  }

  console.log('\n========================================');
  console.log('🎉 ALL DATA RESTORED SUCCESSFULLY!');
  console.log('========================================');
}

main().catch((err) => {
  console.error('\nRestore process failed with error:', err);
  process.exit(1);
});
