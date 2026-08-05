"use server";

import { revalidatePath } from "next/cache";
import { exigirAdmin } from "@/lib/sessao";

type Resultado = { erro?: string };

/**
 * Promove ou rebaixa um jogador a organizador (admin). Só quem já é
 * organizador pode fazer isso, e o grupo nunca fica sem nenhum.
 */
export async function alternarOrganizador(
  jogadorId: string,
  tornar: boolean,
): Promise<Resultado> {
  const { supabase } = await exigirAdmin();

  if (!tornar) {
    // Trava de segurança: não dá para tirar o último organizador.
    const { count } = await supabase
      .from("jogadores")
      .select("id", { count: "exact", head: true })
      .eq("admin", true);
    if ((count ?? 0) <= 1) {
      return { erro: "Precisa haver pelo menos um organizador." };
    }
  }

  const { error } = await supabase
    .from("jogadores")
    .update({ admin: tornar })
    .eq("id", jogadorId);

  if (error) return { erro: "Não foi possível alterar. Tente de novo." };

  revalidatePath("/elenco");
  return {};
}

/**
 * Designa (ou remove) o avaliador — a pessoa que dá nota nos jogos e faz o
 * check-in de quem apareceu. Só um organizador pode mudar isso.
 */
export async function alternarAvaliador(
  jogadorId: string,
  tornar: boolean,
): Promise<Resultado> {
  const { supabase } = await exigirAdmin();

  const { error } = await supabase
    .from("jogadores")
    .update({ avaliador: tornar })
    .eq("id", jogadorId);

  if (error) return { erro: "Não foi possível alterar. Tente de novo." };

  revalidatePath("/elenco");
  return {};
}
