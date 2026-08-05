import type { Posicao } from "./tipos";

/** Os quatro setores do campo. Toda posição do jogador cai em um deles. */
export const SETORES = ["goleiro", "defesa", "meio", "ataque"] as const;
export type Setor = (typeof SETORES)[number];

export const SETOR_DA_POSICAO: Record<Posicao, Setor> = {
  goleiro: "goleiro",
  zagueiro: "defesa",
  lateral: "defesa",
  volante: "meio",
  meia: "meio",
  atacante: "ataque",
};

export const ROTULO_SETOR: Record<Setor, string> = {
  goleiro: "Goleiro",
  defesa: "Defesa",
  meio: "Meio",
  ataque: "Ataque",
};

/**
 * Os setores que um jogador consegue cobrir, a partir das posições que ele
 * cadastrou (até 3). A ordem é preservada, então o setor da posição principal
 * vem primeiro — o sorteio usa isso para preferir a posição de preferência.
 */
export function setoresDoJogador(posicoes: Posicao[]): Setor[] {
  const vistos = new Set<Setor>();
  for (const p of posicoes) vistos.add(SETOR_DA_POSICAO[p]);
  return [...vistos];
}

/**
 * Uma tática. O goleiro é sempre 1 e fica implícito, então
 * defesa + meio + ataque = (jogadores por time − 1), no estilo consagrado
 * 4-3-3 (4 na defesa, 3 no meio, 3 no ataque, mais o goleiro).
 */
export type Formacao = {
  id: string;
  nome: string;
  descricao: string;
  defesa: number;
  meio: number;
  ataque: number;
};

function f(nome: string, descricao: string, d: number, m: number, a: number): Formacao {
  return { id: `${d}-${m}-${a}`, nome, descricao, defesa: d, meio: m, ataque: a };
}

/**
 * Catálogo de táticas por tamanho de time (contando o goleiro).
 * Para os campos maiores estão as formações clássicas do futebol; para os
 * menores, os desenhos típicos de society e futsal (fixo, alas e pivô).
 */
export const FORMACOES: Record<number, Formacao[]> = {
  3: [f("1-1", "Um atrás, um na frente", 1, 0, 1)],
  4: [
    f("1-1-1", "Triângulo, bem equilibrado", 1, 1, 1),
    f("2-1", "Defensivo", 2, 0, 1),
    f("1-2", "Ofensivo", 1, 0, 2),
  ],
  5: [
    f("1-2-1", "Losango — padrão do futsal", 1, 2, 1),
    f("2-1-1", "Defensivo", 2, 1, 1),
    f("1-1-2", "Ofensivo, dois na frente", 1, 1, 2),
    f("2-2", "Duas linhas", 2, 0, 2),
  ],
  6: [
    f("2-2-1", "Equilibrado", 2, 2, 1),
    f("2-1-2", "Ofensivo", 2, 1, 2),
    f("1-3-1", "Meio forte", 1, 3, 1),
    f("3-1-1", "Defensivo", 3, 1, 1),
  ],
  7: [
    f("2-2-2", "Equilibrado", 2, 2, 2),
    f("2-3-1", "Meio forte", 2, 3, 1),
    f("3-2-1", "Defensivo", 3, 2, 1),
    f("3-1-2", "Contra-ataque", 3, 1, 2),
  ],
  8: [
    f("3-2-2", "Equilibrado", 3, 2, 2),
    f("3-3-1", "Meio forte", 3, 3, 1),
    f("2-3-2", "Ofensivo", 2, 3, 2),
    f("4-2-1", "Defensivo", 4, 2, 1),
  ],
  9: [
    f("3-3-2", "Equilibrado", 3, 3, 2),
    f("4-3-1", "Defensivo", 4, 3, 1),
    f("3-4-1", "Meio forte", 3, 4, 1),
    f("4-2-2", "Sólido", 4, 2, 2),
  ],
  10: [
    f("4-3-2", "Equilibrado", 4, 3, 2),
    f("3-4-2", "Meio forte", 3, 4, 2),
    f("4-4-1", "Defensivo", 4, 4, 1),
    f("3-3-3", "Três linhas", 3, 3, 3),
  ],
  11: [
    f("4-4-2", "Clássico", 4, 4, 2),
    f("4-3-3", "Ofensivo", 4, 3, 3),
    f("3-5-2", "Alas por fora", 3, 5, 2),
    f("4-5-1", "Meio superpovoado", 4, 5, 1),
    f("5-3-2", "Defensivo", 5, 3, 2),
  ],
};

export function formacoesPara(jogadoresPorTime: number): Formacao[] {
  return FORMACOES[jogadoresPorTime] ?? [];
}

/** Encontra a formação escolhida; devolve null para o modo automático. */
export function acharFormacao(jogadoresPorTime: number, id: string | null | undefined): Formacao | null {
  if (!id) return null;
  return formacoesPara(jogadoresPorTime).find((formacao) => formacao.id === id) ?? null;
}
