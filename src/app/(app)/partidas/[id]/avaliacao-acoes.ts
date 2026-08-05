"use server";

import { revalidatePath } from "next/cache";
import { sessao } from "@/lib/sessao";

type Resultado = { erro?: string };

/** Avaliador designado ou organizador. */
async function exigirAvaliador() {
  const atual = await sessao();
  if (!atual.jogador?.avaliador && !atual.jogador?.admin) return null;
  return atual;
}

/** Salva (ou atualiza) a nota de 0 a 10 de um jogador no jogo. */
export async function salvarNota(
  partidaId: string,
  jogadorId: string,
  nota: number,
): Promise<Resultado> {
  const atual = await exigirAvaliador();
  if (!atual) return { erro: "Só o avaliador ou o organizador pode dar notas." };
  if (!Number.isInteger(nota) || nota < 0 || nota > 10) return { erro: "A nota vai de 0 a 10." };

  const { error } = await atual.supabase.from("avaliacoes").upsert({
    partida_id: partidaId,
    jogador_id: jogadorId,
    nota,
    avaliador_id: atual.jogador!.id,
  });

  if (error) return { erro: "Não foi possível salvar a nota." };

  // O nível calculado é atualizado por trigger no banco.
  revalidatePath(`/partidas/${partidaId}`);
  revalidatePath("/elenco");
  return {};
}

/** Check-in do dia: marca se o jogador realmente apareceu. */
export async function marcarComparecimento(
  partidaId: string,
  jogadorId: string,
  compareceu: boolean,
): Promise<Resultado> {
  const atual = await exigirAvaliador();
  if (!atual) return { erro: "Só o avaliador ou o organizador pode fazer o check-in." };

  const { error } = await atual.supabase
    .from("presencas")
    .update({ compareceu })
    .eq("partida_id", partidaId)
    .eq("jogador_id", jogadorId);

  if (error) return { erro: "Não foi possível salvar o check-in." };

  revalidatePath(`/partidas/${partidaId}`);
  revalidatePath("/elenco");
  return {};
}
