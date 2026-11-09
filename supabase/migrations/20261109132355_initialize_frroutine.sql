-- FrRoutine: private, per-user routines and learning workspace.
create table public.profiles (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 name text not null default 'Teman' check (length(trim(name)) between 1 and 60),
 timezone text not null default 'Asia/Makassar' check (timezone = 'Asia/Makassar'),
 onboarded boolean not null default true
);
create table public.habits (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 100),
 category text not null check (category in ('Kesehatan','Pengembangan diri','Akademik','Skill','Pribadi')),
 icon text not null default 'book', time time not null, duration integer not null check (duration between 1 and 240),
 days integer[] not null check (cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]),
 archived boolean not null default false, created_at timestamptz not null default now(),
 unique (id,user_id), check (time + duration * interval '1 minute' >= time and extract(hour from time)*60+extract(minute from time)+duration <=1440)
);
create table public.completions (
 habit_id uuid not null, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 date date not null check (date <= (now() at time zone 'Asia/Makassar')::date),
 primary key (user_id,habit_id,date), foreign key (habit_id,user_id) references public.habits(id,user_id) on delete cascade
);
create table public.classes (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 100),
 day integer not null check (day between 0 and 6), start time not null, "end" time not null,
 room text not null default '' check(length(room)<=100), check ("end" > start)
);
create table public.goals (
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 100),target integer not null check (target between 1 and 100000),
 current integer not null default 0 check (current >= 0 and current <= target),unit text not null check (length(trim(unit)) between 1 and 20),
 category text not null check (category in ('Skill','Akademik','Kesehatan','Pribadi'))
);
create table public.journals (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,date date not null check(date <= (now() at time zone 'Asia/Makassar')::date),
 content text not null default '' check (length(content)<=10000),mood text not null check(mood in ('Bahagia','Baik','Biasa','Lelah','Sedih')),
 primary key(user_id,date)
);
create index habits_owner_time on public.habits(user_id,time);
create index classes_owner_day on public.classes(user_id,day,start);
create index goals_owner on public.goals(user_id);
create index completions_owner_date on public.completions(user_id,date);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
grant select,insert,update,delete on public.profiles to authenticated;
create policy "Owner reads" on public.profiles for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner inserts" on public.profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates" on public.profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes" on public.profiles for delete to authenticated using ((select auth.uid())=user_id);

alter table public.habits enable row level security;
revoke all on public.habits from anon;
grant select,insert,update,delete on public.habits to authenticated;
create policy "Owner reads" on public.habits for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner inserts" on public.habits for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates" on public.habits for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes" on public.habits for delete to authenticated using ((select auth.uid())=user_id);

alter table public.completions enable row level security;
revoke all on public.completions from anon;
grant select,insert,update,delete on public.completions to authenticated;
create policy "Owner reads" on public.completions for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner inserts" on public.completions for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates" on public.completions for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes" on public.completions for delete to authenticated using ((select auth.uid())=user_id);

alter table public.classes enable row level security;
revoke all on public.classes from anon;
grant select,insert,update,delete on public.classes to authenticated;
create policy "Owner reads" on public.classes for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner inserts" on public.classes for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates" on public.classes for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes" on public.classes for delete to authenticated using ((select auth.uid())=user_id);

alter table public.goals enable row level security;
revoke all on public.goals from anon;
grant select,insert,update,delete on public.goals to authenticated;
create policy "Owner reads" on public.goals for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner inserts" on public.goals for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates" on public.goals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes" on public.goals for delete to authenticated using ((select auth.uid())=user_id);

alter table public.journals enable row level security;
revoke all on public.journals from anon;
grant select,insert,update,delete on public.journals to authenticated;
create policy "Owner reads" on public.journals for select to authenticated using ((select auth.uid())=user_id);
create policy "Owner inserts" on public.journals for insert to authenticated with check ((select auth.uid())=user_id);
create policy "Owner updates" on public.journals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "Owner deletes" on public.journals for delete to authenticated using ((select auth.uid())=user_id);

-- Atomic first-login initialization, without privileged database code.
create function public.initialize_frroutine() returns void language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid(); created boolean := false;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 insert into public.profiles(user_id,name) values(owner_id,left(coalesce(nullif(trim(auth.jwt()->'user_metadata'->>'name'),''),'Teman'),60))
 on conflict (user_id) do nothing returning true into created;
 if not coalesce(created,false) then return; end if;
 insert into public.habits (user_id,title,category,icon,time,duration,days) values
(owner_id,'Rapikan tempat tidur & minum air','Kesehatan','water','05:15',5,array[0,1,2,3,4,5,6]),
(owner_id,'Peregangan pagi','Kesehatan','stretch','05:20',10,array[0,1,2,3,4,5,6]),
(owner_id,'Baca 10 menit','Pengembangan diri','book','05:30',10,array[0,1,2,3,4,5,6]),
(owner_id,'Jalan kaki atau olahraga ringan','Kesehatan','activity','17:00',20,array[0,1,2,3,4,5,6]),
(owner_id,'Review materi kuliah','Akademik','graduation','19:00',15,array[0,1,2,3,4,5,6]),
(owner_id,'Latihan bahasa Inggris','Skill','languages','19:15',15,array[0,1,2,3,4,5,6]),
(owner_id,'Belajar coding & skill digital','Skill','code','19:30',30,array[0,1,2,3,4,5,6]),
(owner_id,'Latihan mengetik & logika','Skill','keyboard','20:00',10,array[0,1,2,3,4,5,6]),
(owner_id,'Catat pengeluaran harian','Pribadi','wallet','20:10',5,array[0,1,2,3,4,5,6]),
(owner_id,'Refleksi & rencana besok','Pribadi','journal','20:15',10,array[0,1,2,3,4,5,6]);
-- Personal class templates are provisioned privately on the hosted FrRoutine project.
-- They are intentionally excluded from this public, reusable schema.
end;
$$;
revoke all on function public.initialize_frroutine() from public,anon;
grant execute on function public.initialize_frroutine() to authenticated;
