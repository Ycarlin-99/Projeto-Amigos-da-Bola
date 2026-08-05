import {
  SETORES,
  formacoesPara,
  setoresDoJogador,
  type Formacao,
  type Setor,
} from "./formacoes";
import type { Jogador, Posicao } from "./tipos";

/** As posições do jogador, com uma rede de segurança para dados antigos. */
function posicoesDe(j: Jogador): Posicao[] {
  return j.posicoes?.length ? j.posicoes : [j.posicao];
}

/** Os setores que o jogador cobre (a partir de todas as suas posições). */
function setoresDe(j: Jogador): Setor[] {
  return setoresDoJogador(posicoesDe(j));
}

/**
 * Sorteio inteligente de times.
 *
 * Um sorteio puramente aleatório costuma juntar os melhores no mesmo time e o
 * jogo fica sem graça. Aqui o sorteio equilibra força (nota de 1 a 5) e a
 * distribuição pelo campo, mas com aleatoriedade real entre jogadores de força
 * parecida — cada semana os times saem diferentes.
 *
 * Há dois modos:
 *   - Automático: só equilibra os setores, sem um desenho fixo.
 *   - Por formação (4-3-3, 4-4-2, 1-2-1…): cada time preenche exatamente as
 *     vagas daquela tática. Quando falta gente da posição certa, alguém joga
 *     fora da posição — como acontece na pelada de verdade.
 *
 * Cada jogador sai com um `papel` (o setor onde vai atuar neste jogo), que
 * pode ser diferente da posição de cadastro.
 */

export type JogadorEscalado = Jogador & { papel: Setor };

export type TimeSorteado = {
  numero: number;
  nome: string;
  cor: string;
  jogadores: JogadorEscalado[];
  forca: number;
};

const IDENTIDADE_TIMES = [
  { nome: "Time Branco", cor: "#e5e7eb" },
  { nome: "Time Azul", cor: "#454a9e" },
  { nome: "Time Amarelo", cor: "#e8b33c" },
  { nome: "Time Vermelho", cor: "#c2410c" },
  { nome: "Time Verde", cor: "#15803d" },
  { nome: "Time Preto", cor: "#1f2937" },
];

type Alvo = Record<Setor, number>;

// ---------------------------------------------------------------------------
// Utilidades comuns aos dois modos
// ---------------------------------------------------------------------------

function embaralhar<T>(itens: T[]): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function forcaDoTime(jogadores: { nivel: number }[]): number {
  return jogadores.reduce((soma, j) => soma + j.nivel, 0);
}

/** Ordena por nível (mais forte primeiro), sorteando a ordem entre iguais. */
function ordenarPorForca<T extends { nivel: number }>(jogadores: T[]): T[] {
  return embaralhar(jogadores).sort((a, b) => b.nivel - a.nivel);
}

/** Diferença de força entre o time mais forte e o mais fraco. Menor é melhor. */
function difForca(times: JogadorEscalado[][]): number {
  const forcas = times.map(forcaDoTime);
  return Math.max(...forcas) - Math.min(...forcas);
}

function ordemDoSetor(setor: Setor): number {
  return SETORES.indexOf(setor);
}

/** Ordena os jogadores de um time por linha (goleiro → ataque) e força. */
function ordenarEscalacao(jogadores: JogadorEscalado[]): JogadorEscalado[] {
  return [...jogadores].sort(
    (a, b) => ordemDoSetor(a.papel) - ordemDoSetor(b.papel) || b.nivel - a.nivel,
  );
}

/**
 * Refino final. Testa trocar pares de jogadores do mesmo papel entre times
 * diferentes e fica com as trocas que diminuem a diferença de força. Como só
 * troca jogadores do mesmo setor, a formação de cada time continua intacta.
 */
function refinarPorTrocas(times: JogadorEscalado[][]) {
  const MAX_PASSADAS = 12;

  for (let passada = 0; passada < MAX_PASSADAS; passada++) {
    let melhorou = false;
    let atual = difForca(times);
    if (atual === 0) return;

    for (let a = 0; a < times.length && !melhorou; a++) {
      for (let b = a + 1; b < times.length && !melhorou; b++) {
        for (let i = 0; i < times[a].length && !melhorou; i++) {
          for (let j = 0; j < times[b].length; j++) {
            if (times[a][i].papel !== times[b][j].papel) continue;

            [times[a][i], times[b][j]] = [times[b][j], times[a][i]];
            const novo = difForca(times);

            if (novo < atual) {
              atual = novo;
              melhorou = true;
              break;
            }
            [times[a][i], times[b][j]] = [times[b][j], times[a][i]];
          }
        }
      }
    }

    if (!melhorou) return;
  }
}

function contarPapel(time: JogadorEscalado[], setor: Setor): number {
  return time.filter((j) => j.papel === setor).length;
}

// ---------------------------------------------------------------------------
// Modo por formação
// ---------------------------------------------------------------------------

/**
 * Escolhe em qual setor aberto encaixar um jogador que está fora de posição.
 * Evita o gol ao máximo (ninguém quer ir pro gol à força) e, no resto, procura
 * o setor mais próximo do natural: um zagueiro sobrando vira volante antes de
 * virar atacante.
 */
function setorAbertoMaisProximo(abertos: Setor[], natural: Setor): Setor {
  const semGol = abertos.filter((s) => s !== "goleiro");
  const candidatos = semGol.length > 0 ? semGol : abertos;
  const distancia = (s: Setor) => Math.abs(ordemDoSetor(s) - ordemDoSetor(natural));
  return [...candidatos].sort((a, b) => distancia(a) - distancia(b))[0];
}

/**
 * Monta os times preenchendo as vagas da formação.
 *
 * 1. Um goleiro de verdade em cada time (os melhores primeiro).
 * 2. Draft em serpentina por força: a cada escolha, o time pega — entre os
 *    mais fortes disponíveis — alguém cujo setor natural ainda tem vaga; se
 *    ninguém encaixar, leva o mais forte e o escala fora de posição.
 * 3. Refino por trocas dentro do mesmo setor.
 */
function montarComFormacao(
  escalados: Jogador[],
  qtdTimes: number,
  alvo: Alvo,
): JogadorEscalado[][] {
  const times: JogadorEscalado[][] = Array.from({ length: qtdTimes }, () => []);
  const alvoTotal = SETORES.reduce((soma, s) => soma + alvo[s], 0);
  const disponiveis = ordenarPorForca(escalados);

  const remover = (j: Jogador) => disponiveis.splice(disponiveis.indexOf(j), 1);
  const setoresAbertos = (time: JogadorEscalado[]) =>
    SETORES.filter((s) => contarPapel(time, s) < alvo[s]);

  // 1. Goleiros de verdade, um por time (quem tem "goleiro" entre as posições).
  const goleiros = disponiveis.filter((j) => setoresDe(j).includes("goleiro")).slice(0, qtdTimes);
  goleiros.forEach((goleiro, i) => {
    times[i].push({ ...goleiro, papel: "goleiro" });
    remover(goleiro);
  });

  // 2. Draft em serpentina.
  let rodada = 0;
  while (disponiveis.length > 0) {
    const ordem = Array.from({ length: qtdTimes }, (_, i) => i);
    if (rodada % 2 === 1) ordem.reverse();

    const antes = disponiveis.length;

    for (const t of ordem) {
      if (disponiveis.length === 0) break;
      if (times[t].length >= alvoTotal) continue;

      const abertos = setoresAbertos(times[t]);
      if (abertos.length === 0) continue;

      // Entre os mais fortes disponíveis, prefere quem tem uma das suas posições
      // com vaga aberta neste time. Escala nessa posição (a principal primeiro).
      const janela = disponiveis.slice(0, Math.max(qtdTimes, 1));
      const naPosicao = janela.find((j) => setoresDe(j).some((s) => abertos.includes(s)));

      const escolhido = naPosicao ?? disponiveis[0];
      const setoresDele = setoresDe(escolhido);
      const papel = naPosicao
        ? setoresDele.find((s) => abertos.includes(s))!
        : setorAbertoMaisProximo(abertos, setoresDele[0]);

      times[t].push({ ...escolhido, papel });
      remover(escolhido);
    }

    // Rodada inteira sem ninguém entrar: acabaram as vagas. Evita laço infinito.
    if (disponiveis.length === antes) break;
    rodada++;
  }

  refinarPorTrocas(times);
  return times;
}

// ---------------------------------------------------------------------------
// Modo automático (sem formação fixa)
// ---------------------------------------------------------------------------

/** Alvo de tamanho por time quando não há formação — reparte o total por igual. */
function alvosDeTamanho(qtdTimes: number, total: number): number[] {
  const base = Math.floor(total / qtdTimes);
  const alvos = new Array<number>(qtdTimes).fill(base);
  for (let k = 0; k < total % qtdTimes; k++) alvos[k]++;
  return alvos;
}

/**
 * Draft em serpentina sem desenho fixo: cada escolha vai para o setor mais
 * carente do time, apenas para não juntar todo mundo numa faixa só.
 */
function montarAutomatico(escalados: Jogador[], qtdTimes: number): JogadorEscalado[][] {
  const times: JogadorEscalado[][] = Array.from({ length: qtdTimes }, () => []);
  const disponiveis = ordenarPorForca(escalados);
  const alvos = alvosDeTamanho(qtdTimes, escalados.length);
  const remover = (j: Jogador) => disponiveis.splice(disponiveis.indexOf(j), 1);

  // Goleiros de verdade primeiro, um por time.
  const goleiros = disponiveis.filter((j) => setoresDe(j).includes("goleiro")).slice(0, qtdTimes);
  goleiros.forEach((goleiro, i) => {
    times[i].push({ ...goleiro, papel: "goleiro" });
    remover(goleiro);
  });

  // Setor da vez para um jogador: entre os que ele cobre, o menos preenchido.
  const setorMenosCheio = (time: JogadorEscalado[], j: Jogador) =>
    setoresDe(j).reduce((a, b) => (contarPapel(time, b) < contarPapel(time, a) ? b : a));

  let rodada = 0;
  while (disponiveis.length > 0) {
    const ordem = Array.from({ length: qtdTimes }, (_, i) => i);
    if (rodada % 2 === 1) ordem.reverse();
    const antes = disponiveis.length;

    for (const t of ordem) {
      if (disponiveis.length === 0) break;
      if (times[t].length >= alvos[t]) continue;

      const janela = disponiveis.slice(0, Math.max(qtdTimes, 1));
      // Entre os mais fortes, o que cobre o setor menos preenchido do time.
      const melhor = janela.reduce((a, b) =>
        contarPapel(times[t], setorMenosCheio(times[t], b)) <
        contarPapel(times[t], setorMenosCheio(times[t], a))
          ? b
          : a,
      );

      times[t].push({ ...melhor, papel: setorMenosCheio(times[t], melhor) });
      remover(melhor);
    }

    if (disponiveis.length === antes) break;
    rodada++;
  }

  refinarPorTrocas(times);
  return times;
}

// ---------------------------------------------------------------------------
// Escolha automática da tática, conforme as posições de quem apareceu
// ---------------------------------------------------------------------------

const SETORES_LINHA: Setor[] = ["defesa", "meio", "ataque"];

/**
 * Estima quantos jogadores ficariam FORA de posição se os times fossem montados
 * numa dada formação. Distribui a "oferta" de cada setor (quantos cobrem aquele
 * setor) pela "demanda" (vagas daquele setor somando todos os times), começando
 * pelos setores mais escassos, para não desperdiçar quem é especialista.
 */
function foraDePosicaoEstimado(escalados: Jogador[], alvoPorTime: Alvo, qtdTimes: number): number {
  const demanda: Record<Setor, number> = {
    goleiro: alvoPorTime.goleiro * qtdTimes,
    defesa: alvoPorTime.defesa * qtdTimes,
    meio: alvoPorTime.meio * qtdTimes,
    ataque: alvoPorTime.ataque * qtdTimes,
  };

  // Só as linhas de campo entram na comparação — o gol pesa igual em toda
  // formação, então não muda qual tática é a melhor.
  const capazes: Record<Setor, Jogador[]> = { goleiro: [], defesa: [], meio: [], ataque: [] };
  for (const j of escalados) {
    for (const s of setoresDe(j)) if (s !== "goleiro") capazes[s].push(j);
  }

  const usados = new Set<Jogador>();
  let encaixados = 0;
  // Preenche primeiro o setor com menos gente capaz (o mais difícil de cobrir).
  const ordem = [...SETORES_LINHA].sort((a, b) => capazes[a].length - capazes[b].length);
  for (const setor of ordem) {
    let vagas = demanda[setor];
    for (const j of capazes[setor]) {
      if (vagas === 0) break;
      if (usados.has(j)) continue;
      usados.add(j);
      encaixados++;
      vagas--;
    }
  }

  const vagasDeLinha = demanda.defesa + demanda.meio + demanda.ataque;
  return vagasDeLinha - encaixados;
}

/**
 * Escolhe, no catálogo de táticas do tamanho de time, a que deixa MENOS gente
 * fora de posição para o elenco que confirmou. Empate fica com a primeira do
 * catálogo (as equilibradas vêm primeiro). Devolve null se não houver catálogo.
 */
export function escolherFormacaoAutomatica(
  escalados: Jogador[],
  qtdTimes: number,
  jogadoresPorTime: number,
): Formacao | null {
  const candidatas = formacoesPara(jogadoresPorTime);
  if (candidatas.length === 0) return null;

  let melhor = candidatas[0];
  let melhorPenalidade = Infinity;
  for (const f of candidatas) {
    const penalidade = foraDePosicaoEstimado(
      escalados,
      { goleiro: 1, defesa: f.defesa, meio: f.meio, ataque: f.ataque },
      qtdTimes,
    );
    if (penalidade < melhorPenalidade) {
      melhorPenalidade = penalidade;
      melhor = f;
    }
  }
  return melhor;
}

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

/** Quantos times cabem, dado quem confirmou e o tamanho de cada time. */
export function qtdTimesPorPresenca(
  confirmados: number,
  jogadoresPorTime: number,
  maxTimes = IDENTIDADE_TIMES.length,
): number {
  const cabem = Math.floor(confirmados / jogadoresPorTime);
  return Math.max(0, Math.min(maxTimes, cabem));
}

/**
 * Sorteia os confirmados em times equilibrados.
 *
 * - O número de times sai da PRESENÇA: quantos times cheios dá para formar com
 *   `jogadoresPorTime` cada. Quem sobra vai para a lista de espera (`reservas`).
 * - A TÁTICA é escolhida automaticamente pelas posições de quem apareceu, a não
 *   ser que `opcoes.formacao` force uma específica.
 */
export function sortearTimes(
  confirmados: Jogador[],
  jogadoresPorTime: number,
  opcoes: { formacao?: Formacao | null; maxTimes?: number } = {},
): { times: TimeSorteado[]; reservas: Jogador[]; qtdTimes: number; formacao: Formacao | null } {
  const qtdTimes = qtdTimesPorPresenca(confirmados.length, jogadoresPorTime, opcoes.maxTimes);
  const totalDeVagas = qtdTimes * jogadoresPorTime;
  const escalados = confirmados.slice(0, totalDeVagas);
  const reservas = confirmados.slice(totalDeVagas);

  const formacao =
    opcoes.formacao ?? escolherFormacaoAutomatica(escalados, qtdTimes, jogadoresPorTime);

  const times = formacao
    ? montarComFormacao(escalados, qtdTimes, {
        goleiro: 1,
        defesa: formacao.defesa,
        meio: formacao.meio,
        ataque: formacao.ataque,
      })
    : montarAutomatico(escalados, qtdTimes);

  return {
    times: times.map((jogadores, i) => ({
      numero: i + 1,
      nome: IDENTIDADE_TIMES[i % IDENTIDADE_TIMES.length].nome,
      cor: IDENTIDADE_TIMES[i % IDENTIDADE_TIMES.length].cor,
      jogadores: ordenarEscalacao(jogadores),
      forca: forcaDoTime(jogadores),
    })),
    reservas,
    qtdTimes,
    formacao,
  };
}
