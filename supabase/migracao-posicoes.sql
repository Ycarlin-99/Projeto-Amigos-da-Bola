-- =====================================================================
-- Migração: até 3 POSIÇÕES por jogador
-- O sorteio usa essas posições para escolher a tática e encaixar cada um.
-- Cole no SQL Editor do Supabase e clique em "Run". Pode rodar mais de uma vez.
-- =====================================================================

-- 1) Nova coluna com a lista de posições (a 1ª é a principal).
alter table public.jogadores add column if not exists posicoes text[];

-- 2) Quem já existe recebe a lista a partir da posição única atual.
update public.jogadores
   set posicoes = array[posicao]
 where posicoes is null;

-- 3) Passa a exigir a coluna, com padrão para novos cadastros.
alter table public.jogadores alter column posicoes set default array['meia']::text[];
alter table public.jogadores alter column posicoes set not null;

-- 4) Validação: de 1 a 3 posições, todas válidas.
alter table public.jogadores drop constraint if exists jogadores_posicoes_validas;
alter table public.jogadores add constraint jogadores_posicoes_validas
  check (
    coalesce(array_length(posicoes, 1), 0) between 1 and 3
    and posicoes <@ array['goleiro','zagueiro','lateral','volante','meia','atacante']::text[]
  );
