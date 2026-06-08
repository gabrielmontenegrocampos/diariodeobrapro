-- Diário de Obra Pro - Schema

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  nome text,
  created_at timestamptz default now()
);

create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  nome text not null,
  endereco text,
  status text default 'ativa' check (status in ('ativa', 'concluida', 'pausada')),
  data_inicio date,
  share_token uuid default gen_random_uuid() unique not null,
  created_at timestamptz default now()
);

create table if not exists registros (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  data date not null,
  descricao text,
  clima text check (clima in ('sol', 'nublado', 'chuva', 'tempestade', 'ventoso')),
  temperatura integer,
  created_at timestamptz default now(),
  unique(obra_id, data)
);

create table if not exists fotos (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid references registros(id) on delete cascade not null,
  url text not null,
  legenda text,
  created_at timestamptz default now()
);

create table if not exists equipe_dia (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid references registros(id) on delete cascade not null,
  nome text not null,
  funcao text,
  horas numeric(4,1)
);

create table if not exists ocorrencias (
  id uuid primary key default gen_random_uuid(),
  registro_id uuid references registros(id) on delete cascade not null,
  descricao text not null,
  tipo text default 'observacao' check (tipo in ('problema', 'desvio', 'observacao')),
  severidade text default 'baixa' check (severidade in ('baixa', 'media', 'alta'))
);

-- RLS
alter table profiles enable row level security;
alter table obras enable row level security;
alter table registros enable row level security;
alter table fotos enable row level security;
alter table equipe_dia enable row level security;
alter table ocorrencias enable row level security;

-- Profiles
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Obras
create policy "own obras" on obras for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Registros
create policy "own registros" on registros for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fotos
create policy "fotos of own registros" on fotos for all
  using (exists (select 1 from registros where id = fotos.registro_id and user_id = auth.uid()))
  with check (exists (select 1 from registros where id = fotos.registro_id and user_id = auth.uid()));

-- Equipe
create policy "equipe of own registros" on equipe_dia for all
  using (exists (select 1 from registros where id = equipe_dia.registro_id and user_id = auth.uid()))
  with check (exists (select 1 from registros where id = equipe_dia.registro_id and user_id = auth.uid()));

-- Ocorrencias
create policy "ocorrencias of own registros" on ocorrencias for all
  using (exists (select 1 from registros where id = ocorrencias.registro_id and user_id = auth.uid()))
  with check (exists (select 1 from registros where id = ocorrencias.registro_id and user_id = auth.uid()));

-- Storage bucket: fotos (crie manualmente no Supabase dashboard)
-- insert into storage.buckets (id, name, public) values ('fotos', 'fotos', true);

-- Trigger: cria profile automaticamente ao fazer signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, new.raw_user_meta_data ->> 'name');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
