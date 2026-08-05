-- =====================================================================
-- Migração: login por APELIDO + guardar NOME COMPLETO
-- Cole no SQL Editor do Supabase e clique em "Run". Pode rodar mais de uma
-- vez sem quebrar nada.
-- =====================================================================

-- 1) Nova coluna para o nome de verdade (o "nome" segue sendo o apelido).
alter table public.jogadores add column if not exists nome_completo text;

-- 2) Trigger de cadastro passa a gravar também o nome completo.
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
