-- =====================================================================
-- Migração: proteger quem pode virar ORGANIZADOR (admin)
-- Sem isto, o RLS deixaria um jogador editar a própria linha e se
-- autopromover a organizador via API. A trava garante que só quem já é
-- organizador consegue mudar a coluna admin de alguém.
-- Cole no SQL Editor do Supabase e clique em "Run". Pode rodar de novo sem risco.
-- =====================================================================

create or replace function public.protege_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.admin is distinct from old.admin and not public.eh_admin() then
    raise exception 'Apenas um organizador pode mudar quem e organizador.';
  end if;
  return new;
end;
$$;

drop trigger if exists jogadores_protege_admin on public.jogadores;
create trigger jogadores_protege_admin
  before update on public.jogadores
  for each row execute function public.protege_admin();
