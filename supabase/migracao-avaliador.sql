-- =====================================================================
-- Migração: função AVALIADOR, notas por jogo e check-in no dia
--
-- - Uma pessoa designada (avaliador) dá nota de 0 a 10 para cada jogador
--   em cada jogo e marca quem realmente apareceu.
-- - O nível de habilidade (1 a 5) passa a ser calculado sozinho pela média
--   das notas. Enquanto o jogador não tiver nota, vale o nível do perfil.
--
-- Cole no SQL Editor do Supabase e clique em "Run". Pode rodar de novo sem risco.
-- =====================================================================

-- 1) Quem é avaliador, e o nível calculado pelas notas (null = ainda sem nota).
alter table public.jogadores add column if not exists avaliador       boolean not null default false;
alter table public.jogadores add column if not exists nivel_calculado smallint;

-- 2) Quem realmente apareceu no jogo (null = check-in ainda não feito).
alter table public.presencas add column if not exists compareceu boolean;

-- 3) As notas: uma por jogador por partida.
create table if not exists public.avaliacoes (
  partida_id   uuid not null references public.partidas (id) on delete cascade,
  jogador_id   uuid not null references public.jogadores (id) on delete cascade,
  nota         smallint not null check (nota between 0 and 10),
  avaliador_id uuid references public.jogadores (id) on delete set null,
  criada_em    timestamptz not null default now(),
  primary key (partida_id, jogador_id)
);

create index if not exists avaliacoes_jogador_idx on public.avaliacoes (jogador_id);

-- 4) Helper: quem pode avaliar (o avaliador designado ou um organizador).
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

-- 5) O nível sai da média das notas: 0-10 vira 1-5, arredondado.
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

-- 6) Só um organizador muda quem é organizador OU avaliador.
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

-- 7) RLS das avaliações: todos do grupo leem, só quem pode avaliar escreve.
alter table public.avaliacoes enable row level security;

drop policy if exists avaliacoes_leitura on public.avaliacoes;
create policy avaliacoes_leitura on public.avaliacoes
  for select to authenticated using (true);

drop policy if exists avaliacoes_escrita on public.avaliacoes;
create policy avaliacoes_escrita on public.avaliacoes
  for all to authenticated
  using (public.pode_avaliar()) with check (public.pode_avaliar());

-- 8) O avaliador também precisa marcar o check-in na presença dos outros.
drop policy if exists presencas_avaliador on public.presencas;
create policy presencas_avaliador on public.presencas
  for update to authenticated
  using (public.pode_avaliar()) with check (public.pode_avaliar());

-- 9) Tempo real para as notas.
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.avaliacoes'; exception when duplicate_object then null; end;
end $$;
