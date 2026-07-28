"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirAdmin } from "@/lib/sessao";
import { acharFormacao } from "@/lib/formacoes";
import { sortearTimes } from "@/lib/sorteio";
import type { Jogador } from "@/lib/tipos";

type Resultado = { erro?: string };

function lerFormulario(dados: FormData) {
  const inicio = String(dados.get("inicio") ?? "");
  const prazo = String(dados.get("prazo_confirmacao") ?? "");
  const jogadores_por_time = Number(dados.get("jogadores_por_time") ?? 5);

  // Só guarda a formação se ela existir para esse tamanho de time; caso
  // contrário, sorteio automático (null). Impede tática incoerente vinda do
  // formulário — ex.: trocar o número de jogadores depois de escolher a tática.
  const formacaoBruta = String(dados.get("formacao") ?? "").trim();
  const formacao = acharFormacao(jogadores_por_time, formacaoBruta)?.id ?? null;

  return {
    titulo: String(dados.get("titulo") ?? "").trim() || "Pelada",
    local: String(dados.get("local") ?? "").trim(),
    inicio,
    prazo_confirmacao: prazo,
    qtd_times: Number(dados.get("qtd_times") ?? 2),
    jogadores_por_time,
    formacao,
    observacoes: String(dados.get("observacoes") ?? "").trim() || null,
  };
}

function validar(p: ReturnType<typeof lerFormulario>): string | null {
  if (!p.local) return "Informe o local do jogo.";
  if (!p.inicio) return "Informe a data e a hora do jogo.";
  if (!p.prazo_confirmacao) return "Informe até quando dá para confirmar presença.";
  if (new Date(p.prazo_confirmacao) > new Date(p.inicio))
    return "O prazo para confirmar precisa ser antes do início do jogo.";
  return null;
}

/**
 * As datas chegam do <input type="datetime-local"> sem fuso ("2026-08-02T19:30").
 * O `new Date(...)` no servidor interpretaria isso no fuso da máquina — que na
 * Vercel é UTC — e o jogo apareceria 3 horas adiantado para o grupo. Por isso
 * o horário de Brasília entra explícito.
 */
function comFusoDeBrasilia(valorLocal: string) {
  return `${valorLocal}:00-03:00`;
}

export async function criarPartida(_anterior: Resultado, dados: FormData): Promise<Resultado> {
  const { supabase, jogador } = await exigirAdmin();
  const partida = lerFormulario(dados);

  const erro = validar(partida);
  if (erro) return { erro };

  const { error } = await supabase.from("partidas").insert({
    ...partida,
    inicio: comFusoDeBrasilia(partida.inicio),
    prazo_confirmacao: comFusoDeBrasilia(partida.prazo_confirmacao),
    criada_por: jogador!.id,
  });

  if (error) return { erro: "Não foi possível salvar o jogo. Tente de novo." };

  revalidatePath("/partidas");
  redirect("/partidas");
}

export async function editarPartida(
  id: string,
  _anterior: Resultado,
  dados: FormData,
): Promise<Resultado> {
  const { supabase } = await exigirAdmin();
  const partida = lerFormulario(dados);

  const erro = validar(partida);
  if (erro) return { erro };

  const { error } = await supabase
    .from("partidas")
    .update({
      ...partida,
      inicio: comFusoDeBrasilia(partida.inicio),
      prazo_confirmacao: comFusoDeBrasilia(partida.prazo_confirmacao),
    })
    .eq("id", id);

  if (error) return { erro: "Não foi possível salvar as alterações." };

  revalidatePath("/partidas");
  revalidatePath(`/partidas/${id}`);
  redirect(`/partidas/${id}`);
}

export async function mudarStatusPartida(
  id: string,
  status: "agendada" | "cancelada" | "realizada",
) {
  const { supabase } = await exigirAdmin();
  await supabase.from("partidas").update({ status }).eq("id", id);

  revalidatePath("/partidas");
  revalidatePath(`/partidas/${id}`);
}

export async function excluirPartida(id: string) {
  const { supabase } = await exigirAdmin();
  await supabase.from("partidas").delete().eq("id", id);

  revalidatePath("/partidas");
  redirect("/partidas");
}

/**
 * Monta os times a partir de quem confirmou presença e grava o resultado.
 * Roda no servidor de propósito: assim todo mundo enxerga exatamente o mesmo
 * sorteio, e ninguém consegue "re-sortear" no próprio navegador até gostar.
 */
export async function sortearPartida(partidaId: string): Promise<Resultado> {
  const { supabase } = await exigirAdmin();

  const { data: partida } = await supabase
    .from("partidas")
    .select("qtd_times, jogadores_por_time, formacao")
    .eq("id", partidaId)
    .single();

  if (!partida) return { erro: "Jogo não encontrado." };

  const { data: presencas } = await supabase
    .from("presencas")
    .select("atualizada_em, jogadores(*)")
    .eq("partida_id", partidaId)
    .eq("status", "vou")
    .order("atualizada_em", { ascending: true });

  const confirmados = (presencas ?? [])
    .map((p) => p.jogadores as unknown as Jogador)
    .filter(Boolean);

  if (confirmados.length < partida.qtd_times * 2) {
    return { erro: `Ainda são poucos confirmados para formar ${partida.qtd_times} times.` };
  }

  const { times } = sortearTimes(
    confirmados,
    partida.qtd_times,
    partida.jogadores_por_time,
    acharFormacao(partida.jogadores_por_time, partida.formacao),
  );

  // Apagar antes de gravar mantém o sorteio idempotente: sortear de novo
  // substitui o anterior em vez de acumular times fantasma.
  await supabase.from("times").delete().eq("partida_id", partidaId);

  const { data: timesCriados, error: erroTimes } = await supabase
    .from("times")
    .insert(
      times.map((t) => ({
        partida_id: partidaId,
        numero: t.numero,
        nome: t.nome,
        cor: t.cor,
      })),
    )
    .select("id, numero");

  if (erroTimes || !timesCriados) return { erro: "Não foi possível salvar os times." };

  const vinculos = times.flatMap((time) => {
    const criado = timesCriados.find((t) => t.numero === time.numero)!;
    return time.jogadores.map((j) => ({
      time_id: criado.id,
      jogador_id: j.id,
      papel: j.papel,
    }));
  });

  const { error: erroVinculos } = await supabase.from("times_jogadores").insert(vinculos);
  if (erroVinculos) return { erro: "Não foi possível escalar os jogadores." };

  revalidatePath(`/partidas/${partidaId}`);
  return {};
}

export async function desfazerSorteio(partidaId: string) {
  const { supabase } = await exigirAdmin();
  await supabase.from("times").delete().eq("partida_id", partidaId);
  revalidatePath(`/partidas/${partidaId}`);
}
