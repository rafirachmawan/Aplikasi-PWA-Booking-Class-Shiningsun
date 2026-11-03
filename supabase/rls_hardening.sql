-- =========================================================
-- RLS HARDENING — ShiningSun PWA
-- =========================================================
-- Jalankan file ini di Supabase SQL Editor SETELAH:
--   1. Kode A2 + A3 sudah ter-deploy (service role client + cron/push/portal).
--   2. Database sudah di-backup (pg_dump atau Supabase Backup).
--
-- Kondisi awal (audit 2026-11-03): SEMUA tabel public punya
-- rls_aktif = false dan jumlah_policy = 0. Artinya anon key yang
-- ada di browser bebas membaca & menulis seluruh tabel.
--
-- Setelah file ini dijalankan:
--   * anon  : hanya boleh SELECT branches & birthday_templates (is_active=true)
--   * authenticated (staff login): tabel data (aplikasi admin tetap jalan)
--   * users : SELECT semua staf, tulis hanya superadmin / baris sendiri
--   * service_role: bypass RLS (cron, push, portal ortu, upload-gdrive)
--
-- Aman dijalankan berulang (idempotent): policy lama di-drop dulu.
-- =========================================================

begin;

-- ---------------------------------------------------------
-- Helper: apakah user yang login SUPERADMIN?
-- SECURITY DEFINER supaya tidak memicu rekursi RLS pada tabel users.
-- ---------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'SUPERADMIN'
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated, anon;

do $$
declare
  t text;
  p record;
  semua_tabel text[] := array[
    'assessment_templates',
    'birthday_templates',
    'branches',
    'classes',
    'curriculum_documents',
    'labels',
    'push_subscriptions',
    'schedule_slots',
    'schedule_student',
    'student_feedback',
    'student_point_redemptions',
    'student_rules_documents',
    'student_worksheets',
    'students',
    'system_settings',
    'teachers',
    'users'
  ];
begin
  foreach t in array semua_tabel loop
    -- 1) Aktifkan RLS
    execute format('alter table public.%I enable row level security', t);

    -- 2) Hapus semua policy lama (termasuk policy "USING (true)" untuk anon
    --    dari file rls_policies.sql lama, kalau pernah masuk ke project ini).
    for p in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;

    -- 3) Staff yang login boleh melakukan apa saja (aplikasi admin).
    --    Khusus tabel users ditangani terpisah di bawah supaya staf biasa
    --    tidak bisa menaikkan dirinya menjadi SUPERADMIN lewat REST API.
    if t <> 'users' then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        t || '_authenticated_all', t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------
-- Tabel users: baca boleh semua staf, tulis terbatas
-- ---------------------------------------------------------
create policy "users_select_authenticated"
  on public.users
  for select
  to authenticated
  using (true);

-- Login pertama (syncUserIdentity) membuat barisnya sendiri.
create policy "users_insert_self"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

-- syncUserIdentity menghapus baris lama dengan email yang sama miliknya.
-- Superadmin boleh menghapus akun mana pun.
create policy "users_delete_self_or_superadmin"
  on public.users
  for delete
  to authenticated
  using (
    email = (auth.jwt() ->> 'email')
    or public.is_superadmin()
  );

-- Ubah role/cabang akun: hanya superadmin.
create policy "users_update_superadmin"
  on public.users
  for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- ---------------------------------------------------------
-- Akses publik (anon) yang memang dibutuhkan aplikasi
-- ---------------------------------------------------------

-- Portal login butuh daftar cabang (getBranches).
create policy "branches_anon_select"
  on public.branches
  for select
  to anon
  using (true);

-- Kartu ucapan ulang tahun di portal ortu hanya butuh template aktif.
create policy "birthday_templates_anon_select_active"
  on public.birthday_templates
  for select
  to anon
  using (is_active = true);

commit;

-- =========================================================
-- VERIFIKASI (jalankan setelah commit)
-- =========================================================
-- Harusnya semua tabel rls_aktif = true, dan policy anon hanya ada di
-- branches + birthday_templates.
--
-- select c.relname as tabel,
--        c.relrowsecurity as rls_aktif,
--        count(p.policyname) as jumlah_policy
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- left join pg_policies p
--        on p.schemaname = 'public' and p.tablename = c.relname
-- where n.nspname = 'public' and c.relkind = 'r'
-- group by c.relname, c.relrowsecurity
-- order by c.relname;
--
-- select tablename, policyname, roles, cmd, qual
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
