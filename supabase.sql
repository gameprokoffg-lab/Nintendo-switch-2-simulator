-- ============================================================
-- Supabase схемa для Nintendo Switch 2 симулятора
-- Публичные данные: лидерборд рекордов + eShop-публикации.
-- Локальные данные (прогресс, монеты, скины, аккаунты) в БД не едут.
--
-- ВАЖНО: выполни этот скрипт целиком в Supabase -> SQL Editor
-- и нажми RUN. Безопасно запускать повторно (IF NOT EXISTS).
-- ============================================================

-- ---------- Лидерборд рекордов ----------
create table if not exists public.records (
  id bigint generated always as identity primary key,
  game text not null,              -- 'tetris' | 'race' | 'heart' | 'doom'
  player text not null default 'Игрок',  -- локальный ник
  score double precision not null default 0,  -- очки или время (для гонок время в мс, меньше лучше)
  is_time boolean not null default false,     -- true = чем меньше, тем лучше
  user_id uuid,                    -- если вошёл в аккаунт (опционально)
  created_at timestamptz not null default now()
);

create index if not exists records_game_score_idx
  on public.records (game, score desc);
create index if not exists records_game_time_idx
  on public.records (game, score asc) where is_time;

-- Публикации из eShop
create table if not exists public.publications (
  id text primary key,             -- 'p<timestamp><rand>' как в симуляторе
  author text not null,
  name text not null,
  section text default 'games',
  created_at bigint not null default 0,
  data jsonb not null default '{}'::jsonb,  -- полный объект публикации (code, sizeMB, img, menuImg, ...)
  posted timestamptz not null default now()
);

-- Миграции для уже созданной таблицы: create table if not exists НЕ добавляет
-- новые колонки, поэтому добавляем их отдельно (безопасно при повторе).
alter table public.publications add column if not exists section text default 'games';
alter table public.publications add column if not exists data jsonb not null default '{}'::jsonb;

-- ---------- Realtime: подписка на новый рекорд в реальном времени ----------
-- Безопасно при повторном запуске: добавляем таблицу в публикацию,
-- только если её там ещё нет.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;

-- ---------- RLS ----------
-- Рекорды и публикации — публичные данные: любой может читать.
-- Запись разрешена всегда (без входа) — это осознанный выбор гибрида.

alter table public.records enable row level security;
alter table public.publications enable row level security;

drop policy if exists "public read records" on public.records;
create policy "public read records" on public.records
  for select using (true);

-- Пишет клиент через anon/публичный ключ. Без входа в аккаунт.
drop policy if exists "public insert records" on public.records;
create policy "public insert records" on public.records
  for insert with check (true);

-- Обновляем только свои рекорды: без user_id — по совпадению имени.
drop policy if exists "update own record" on public.records;
create policy "update own record" on public.records
  for update using (
    (user_id is not null and user_id = auth.uid())
    or (player = auth.jwt() -> 'app_metadata' ->> 'nickname')
  );

drop policy if exists "public read publications" on public.publications;
create policy "public read publications" on public.publications
  for select using (true);

drop policy if exists "public insert publications" on public.publications;
create policy "public insert publications" on public.publications
  for insert with check (true);

drop policy if exists "update own publication" on public.publications;
create policy "update own publication" on public.publications
  for update using (author = (auth.jwt() -> 'app_metadata' ->> 'nickname'));

-- Удалять публикации вручную из БД лучше через панель; политика удаления не даётся,
-- чтобы ничего случайно не затереть. Если нужна — добавь отдельно.