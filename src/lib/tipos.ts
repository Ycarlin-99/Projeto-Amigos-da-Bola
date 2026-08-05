export const POSICOES = [
  "goleiro",
  "zagueiro",
  "lateral",
  "volante",
  "meia",
  "atacante",
] as const;

export type Posicao = (typeof POSICOES)[number];

export const PERNAS = ["destra", "canhota", "ambidestro"] as const;
export type Perna = (typeof PERNAS)[number];

export const STATUS_PRESENCA = ["vou", "nao_vou", "talvez"] as const;
export type StatusPresenca = (typeof STATUS_PRESENCA)[number];

export type StatusPartida = "agendada" | "cancelada" | "realizada";

export type Jogador = {
  id: string;
  nome: string;
  nome_completo: string | null;
  telefone: string | null;
  posicao: Posicao;
  posicoes: Posicao[];
  perna: Perna;
  nivel: number;
  nivel_calculado: number | null;
  admin: boolean;
  avaliador: boolean;
  criado_em: string;
};

export type Avaliacao = {
  partida_id: string;
  jogador_id: string;
  nota: number;
  avaliador_id: string | null;
  criada_em: string;
};

/**
 * O nível que vale de verdade: o calculado pelas notas do avaliador, ou — se o
 * jogador ainda não tem nota — o que ele marcou no próprio perfil.
 */
export function nivelEfetivo(j: { nivel: number; nivel_calculado: number | null }): number {
  return j.nivel_calculado ?? j.nivel;
}

export type Partida = {
  id: string;
  titulo: string;
  local: string;
  inicio: string;
  jogadores_por_time: number;
  qtd_times: number;
  formacao: string | null;
  prazo_confirmacao: string;
  status: StatusPartida;
  observacoes: string | null;
  criada_por: string | null;
  criada_em: string;
};

export type Presenca = {
  partida_id: string;
  jogador_id: string;
  status: StatusPresenca;
  compareceu: boolean | null;
  atualizada_em: string;
};

export type Time = {
  id: string;
  partida_id: string;
  numero: number;
  nome: string;
  cor: string;
};

/** Rótulos em português usados na interface. */
export const ROTULO_POSICAO: Record<Posicao, string> = {
  goleiro: "Goleiro",
  zagueiro: "Zagueiro",
  lateral: "Lateral",
  volante: "Volante",
  meia: "Meia",
  atacante: "Atacante",
};

export const ROTULO_PERNA: Record<Perna, string> = {
  destra: "Destro",
  canhota: "Canhoto",
  ambidestro: "Ambidestro",
};

export const ROTULO_NIVEL: Record<number, string> = {
  1: "Começando",
  2: "Joga bem",
  3: "Bom de bola",
  4: "Muito bom",
  5: "Craque",
};
