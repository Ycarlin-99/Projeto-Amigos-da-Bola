import { redirect } from "next/navigation";
import { criarClienteServidor } from "./supabase/servidor";
import type { Jogador } from "./tipos";

/**
 * Usuário logado + o perfil dele. O middleware já barrou quem não está logado;
 * o redirect aqui é a segunda tranca, caso alguma rota escape do matcher.
 */
export async function sessao() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data } = await supabase
    .from("jogadores")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, jogador: (data as Jogador | null) ?? null };
}

/** Para telas de administrador. Quem não é organizador volta para os jogos. */
export async function exigirAdmin() {
  const atual = await sessao();
  if (!atual.jogador?.admin) redirect("/partidas");
  return atual;
}
