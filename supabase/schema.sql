-- =====================================================================
-- Amigos da Bola — schema completo
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Pode rodar mais de uma vez sem quebrar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- JOGADORES (perfil ligado ao usuário do Supabase Auth)
-- ---------------------------------------------------------------------
create table if not exists public.jogadores (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null,
  telefone      text,
  posicao       text not null default 'meia'
                check (posicao in ('goleiro','zagueiro','lateral','volante','meia','atacante')),
  perna         text not null default 'destra'
                check (perna in ('destra','canhota','ambidestro')),
  nivel         smallint not null default 3 check (nivel between 1 and 5),
  admin         boolean not null default false,
  criado_em     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PARTIDAS
-- ---------------------------------------------------------------------
create table if not exists public.partidas (
  id                 uuid primary key default gen_random_uuid(),
  titulo             text not null default 'Pelada',
  local              text not null,
  inicio             timestamptz not null,
  jogadores_por_time smallint not null default 5 check (jogadores_por_time between 3 and 11),
  qtd_times          smallint not null default 2 check (qtd_times between 2 and 6),
  formacao           text,  -- ex.: "4-3-3"; null = sorteio automático
  prazo_confirmacao  timestamptz not null,
  status             text not null default 'agendada'
                     check (status in ('agendada','cancelada','realizada')),
  observacoes        text,
  criada_por         uuid references public.jogadores (id) on delete set null,
  criada_em          timestamptz not null default now()
);

create index if not exists partidas_inicio_idx on public.partidas (inicio desc);

-- ---------------------------------------------------------------------
-- PRESENÇAS (RSVP) — um registro por jogador por partida
-- ---------------------------------------------------------------------
create table if not exists public.presencas (
  partida_id    uuid not null references public.partidas (id) on delete cascade,
  jogador_id    uuid not null references public.jogadores (id) on delete cascade,
  status        text not null check (status in ('vou','nao_vou','talvez')),
  atualizada_em timestamptz not null default now(),
  primary key (partida_id, jogador_id)
);

create index if not exists presencas_partida_idx on public.presencas (partida_id);

-- ---------------------------------------------------------------------
-- TIMES SORTEADOS
-- ---------------------------------------------------------------------
create table if not exists public.times (
  id         uuid primary key default gen_random_uuid(),
  partida_id uuid not null references public.partidas (id) on delete cascade,
  numero     smallint not null,
  nome       text not null,
  cor        text not null,
  unique (partida_id, numero)
);

create table if not exists public.times_jogadores (
  time_id    uuid not null references public.times (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  papel      text not null default 'meio'
             check (papel in ('goleiro','defesa','meio','ataque')),
  primary key (time_id, jogador_id)
);

-- Colunas novas para quem já rodou uma versão anterior deste schema.
alter table public.partidas        add column if not exists formacao text;
alter table public.times_jogadores add column if not exists papel text not null default 'meio';

-- ---------------------------------------------------------------------
-- Cria o perfil automaticamente quando alguém se cadastra.
-- O primeiro usuário do grupo vira admin sozinho.
-- ---------------------------------------------------------------------
create or replace function public.criar_jogador_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  primeiro boolean;
begin
  select count(*) = 0 into primeiro from public.jogadores;

  insert into public.jogadores (id, nome, telefone, admin)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'telefone'), ''),
    primeiro
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_jogador_no_cadastro();

-- Helper usado pelas policies. SECURITY DEFINER evita recursão de RLS.
create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select admin from public.jogadores where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- RLS — ninguém que não esteja logado enxerga nada.
-- ---------------------------------------------------------------------
alter table public.jogadores       enable row level security;
alter table public.partidas        enable row level security;
alter table public.presencas       enable row level security;
alter table public.times           enable row level security;
alter table public.times_jogadores enable row level security;

-- Jogadores: todo mundo do grupo se vê; cada um edita só o próprio perfil.
drop policy if exists jogadores_leitura on public.jogadores;
create policy jogadores_leitura on public.jogadores
  for select to authenticated using (true);

drop policy if exists jogadores_insere_proprio on public.jogadores;
create policy jogadores_insere_proprio on public.jogadores
  for insert to authenticated with check (id = auth.uid());

drop policy if exists jogadores_edita_proprio on public.jogadores;
create policy jogadores_edita_proprio on public.jogadores
  for update to authenticated using (id = auth.uid() or public.eh_admin());

-- Partidas: todos leem, só admin cria/edita/apaga.
drop policy if exists partidas_leitura on public.partidas;
create policy partidas_leitura on public.partidas
  for select to authenticated using (true);

drop policy if exists partidas_admin_escreve on public.partidas;
create policy partidas_admin_escreve on public.partidas
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- Presenças: todos leem (é o placar de quem vai), cada um mexe na sua.
drop policy if exists presencas_leitura on public.presencas;
create policy presencas_leitura on public.presencas
  for select to authenticated using (true);

drop policy if exists presencas_propria on public.presencas;
create policy presencas_propria on public.presencas
  for all to authenticated
  using (jogador_id = auth.uid() or public.eh_admin())
  with check (jogador_id = auth.uid() or public.eh_admin());

-- Times: todos leem, só admin sorteia.
drop policy if exists times_leitura on public.times;
create policy times_leitura on public.times
  for select to authenticated using (true);

drop policy if exists times_admin_escreve on public.times;
create policy times_admin_escreve on public.times
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists times_jogadores_leitura on public.times_jogadores;
create policy times_jogadores_leitura on public.times_jogadores
  for select to authenticated using (true);

drop policy if exists times_jogadores_admin_escreve on public.times_jogadores;
create policy times_jogadores_admin_escreve on public.times_jogadores
  for all to authenticated using (public.eh_admin()) with check (public.eh_admin());

-- ---------------------------------------------------------------------
-- Tempo real: o app escuta estas tabelas para atualizar sozinho.
-- ---------------------------------------------------------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.presencas'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.partidas'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.times'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.times_jogadores'; exception when duplicate_object then null; end;
end $$;

alter table public.presencas replica identity full;
