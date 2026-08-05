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
  nome          text not null,               -- apelido no futebol (nome de exibição)
  nome_completo text,                         -- nome de verdade (opcional)
  telefone      text,
  posicao       text not null default 'meia'  -- posição principal (= posicoes[1])
                check (posicao in ('goleiro','zagueiro','lateral','volante','meia','atacante')),
  posicoes      text[] not null default array['meia']::text[]  -- até 3 posições (a 1ª é a principal)
                check (
                  coalesce(array_length(posicoes, 1), 0) between 1 and 3
                  and posicoes <@ array['goleiro','zagueiro','lateral','volante','meia','atacante']::text[]
                ),
  perna         text not null default 'destra'
                check (perna in ('destra','canhota','ambidestro')),
  nivel           smallint not null default 3 check (nivel between 1 and 5),  -- auto-avaliação
  nivel_calculado smallint,                                                   -- média das notas (null = sem nota)
  admin           boolean not null default false,
  avaliador       boolean not null default false,  -- quem dá as notas e faz o check-in
  criado_em       timestamptz not null default now()
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
  compareceu    boolean,  -- check-in do dia: apareceu de verdade? (null = não checado)
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

-- ---------------------------------------------------------------------
-- AVALIAÇÕES — nota de 0 a 10 por jogador por partida (dá o nível calculado)
-- ---------------------------------------------------------------------
create table if not exists public.avaliacoes (
  partida_id   uuid not null references public.partidas (id) on delete cascade,
  jogador_id   uuid not null references public.jogadores (id) on delete cascade,
  nota         smallint not null check (nota between 0 and 10),
  avaliador_id uuid references public.jogadores (id) on delete set null,
  criada_em    timestamptz not null default now(),
  primary key (partida_id, jogador_id)
);

create index if not exists avaliacoes_jogador_idx on public.avaliacoes (jogador_id);

-- Colunas novas para quem já rodou uma versão anterior deste schema.
alter table public.partidas        add column if not exists formacao text;
alter table public.times_jogadores add column if not exists papel text not null default 'meio';
alter table public.jogadores       add column if not exists nome_completo text;
alter table public.jogadores       add column if not exists posicoes text[] not null default array['meia']::text[];
alter table public.jogadores       add column if not exists nivel_calculado smallint;
alter table public.jogadores       add column if not exists avaliador boolean not null default false;
alter table public.presencas       add column if not exists compareceu boolean;

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

  insert into public.jogadores (id, nome, nome_completo, telefone, admin)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'nome_completo'), ''),
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

-- Quem pode avaliar: o avaliador designado ou um organizador.
create or replace function public.pode_avaliar()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select avaliador or admin from public.jogadores where id = auth.uid()),
    false
  );
$$;

-- Só um organizador muda as funções do grupo (admin/avaliador). Sem isto, o RLS
-- deixaria alguém se autopromover editando a própria linha via API.
create or replace function public.protege_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.admin is distinct from old.admin
      or new.avaliador is distinct from old.avaliador)
     and not public.eh_admin() then
    raise exception 'Apenas um organizador pode mudar as funcoes do grupo.';
  end if;
  return new;
end;
$$;

drop trigger if exists jogadores_protege_admin on public.jogadores;
create trigger jogadores_protege_admin
  before update on public.jogadores
  for each row execute function public.protege_admin();

-- O nível calculado sai da média das notas (0-10 vira 1-5, arredondado).
create or replace function public.recalcular_nivel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo  uuid;
  media numeric;
begin
  alvo := coalesce(new.jogador_id, old.jogador_id);
  select avg(nota) into media from public.avaliacoes where jogador_id = alvo;

  update public.jogadores
     set nivel_calculado = case
           when media is null then null
           else greatest(1, least(5, round(media / 2)))::smallint
         end
   where id = alvo;

  return null;
end;
$$;

drop trigger if exists avaliacoes_recalcula_nivel on public.avaliacoes;
create trigger avaliacoes_recalcula_nivel
  after insert or update or delete on public.avaliacoes
  for each row execute function public.recalcular_nivel();

-- ---------------------------------------------------------------------
-- RLS — ninguém que não esteja logado enxerga nada.
-- ---------------------------------------------------------------------
alter table public.jogadores       enable row level security;
alter table public.partidas        enable row level security;
alter table public.presencas       enable row level security;
alter table public.times           enable row level security;
alter table public.times_jogadores enable row level security;
alter table public.avaliacoes      enable row level security;

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

-- O avaliador (ou organizador) faz o check-in na presença dos outros.
drop policy if exists presencas_avaliador on public.presencas;
create policy presencas_avaliador on public.presencas
  for update to authenticated
  using (public.pode_avaliar()) with check (public.pode_avaliar());

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

-- Avaliações: todos do grupo leem; só quem pode avaliar escreve.
drop policy if exists avaliacoes_leitura on public.avaliacoes;
create policy avaliacoes_leitura on public.avaliacoes
  for select to authenticated using (true);

drop policy if exists avaliacoes_escrita on public.avaliacoes;
create policy avaliacoes_escrita on public.avaliacoes
  for all to authenticated
  using (public.pode_avaliar()) with check (public.pode_avaliar());

-- ---------------------------------------------------------------------
-- Tempo real: o app escuta estas tabelas para atualizar sozinho.
-- ---------------------------------------------------------------------
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.presencas'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.partidas'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.times'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.times_jogadores'; exception when duplicate_object then null; end;
  begin execute 'alter publication supabase_realtime add table public.avaliacoes'; exception when duplicate_object then null; end;
end $$;

alter table public.presencas replica identity full;
