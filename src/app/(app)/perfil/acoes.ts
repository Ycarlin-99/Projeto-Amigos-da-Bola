"use server";

import { revalidatePath } from "next/cache";
import { sessao } from "@/lib/sessao";
import { PERNAS, POSICOES, type Perna, type Posicao } from "@/lib/tipos";

type Resultado = { erro?: string; salvo?: boolean };

export async function salvarPerfil(
  _anterior: Resultado,
  dados: FormData,
): Promise<Resultado> {
  const { supabase, jogador } = await sessao();
  if (!jogador) return { erro: "Perfil não encontrado. Saia e entre de novo." };

  const nome = String(dados.get("nome") ?? "").trim();
  const nomeCompleto = String(dados.get("nome_completo") ?? "").trim();

  // Até 3 posições: a principal e duas opcionais. Remove vazias e repetidas,
  // mantendo a ordem (a 1ª é a principal, usada como `posicao`).
  const brutos = ["posicao1", "posicao2", "posicao3"].map((c) => String(dados.get(c) ?? ""));
  const posicoes = brutos.filter((p, i): p is Posicao =>
    POSICOES.includes(p as Posicao) && brutos.indexOf(p) === i,
  );
  const posicao = posicoes[0];

  const perna = String(dados.get("perna") ?? "") as Perna;
  const nivel = Number(dados.get("nivel") ?? 3);

  if (nome.length < 2) return { erro: "Escreva seu apelido." };
  if (!posicao) return { erro: "Escolha pelo menos a posição principal." };
  if (!PERNAS.includes(perna)) return { erro: "Escolha a perna que você usa." };
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5)
    return { erro: "Escolha seu nível de 1 a 5." };

  const { error } = await supabase
    .from("jogadores")
    .update({
      nome,
      nome_completo: nomeCompleto || null,
      telefone: String(dados.get("telefone") ?? "").trim() || null,
      posicao,
      posicoes,
      perna,
      nivel,
    })
    .eq("id", jogador.id);

  if (error) return { erro: "Não foi possível salvar. Tente de novo." };

  revalidatePath("/perfil");
  revalidatePath("/elenco");
  return { salvo: true };
}

/**
 * Ajuste de nível pelo organizador.
 * Existe porque a auto-avaliação puxa para cima — quase todo mundo se acha nota
 * 4. Sem essa correção, o sorteio equilibra com números que não são reais.
 */
export async function ajustarNivel(jogadorId: string, nivel: number) {
  const { supabase, jogador } = await sessao();
  if (!jogador?.admin) return { erro: "Só o organizador pode mudar o nível." };
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 5) return { erro: "Nível inválido." };

  const { error } = await supabase
    .from("jogadores")
    .update({ nivel })
    .eq("id", jogadorId);

  if (error) return { erro: "Não foi possível salvar o nível." };

  revalidatePath("/elenco");
  return {};
}
