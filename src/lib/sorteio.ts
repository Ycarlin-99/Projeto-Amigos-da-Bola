import { SETORES, SETOR_DA_POSICAO, type Formacao, type Setor } from "./formacoes";
import type { Jogador } from "./tipos";

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

  // 1. Goleiros de verdade, um por time.
  const goleiros = disponiveis.filter((j) => j.posicao === "goleiro").slice(0, qtdTimes);
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

      const janela = disponiveis.slice(0, Math.max(qtdTimes, 1));
      const naPosicao = janela.find((j) => abertos.includes(SETOR_DA_POSICAO[j.posicao]));

      const escolhido = naPosicao ?? disponiveis[0];
      const papel = naPosicao
        ? SETOR_DA_POSICAO[escolhido.posicao]
        : setorAbertoMaisProximo(abertos, SETOR_DA_POSICAO[escolhido.posicao]);

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
  const goleiros = disponiveis.filter((j) => j.posicao === "goleiro").slice(0, qtdTimes);
  goleiros.forEach((goleiro, i) => {
    times[i].push({ ...goleiro, papel: "goleiro" });
    remover(goleiro);
  });

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
        contarPapel(times[t], SETOR_DA_POSICAO[b.posicao]) <
        contarPapel(times[t], SETOR_DA_POSICAO[a.posicao])
          ? b
          : a,
      );

      times[t].push({ ...melhor, papel: SETOR_DA_POSICAO[melhor.posicao] });
      remover(melhor);
    }

    if (disponiveis.length === antes) break;
    rodada++;
  }

  refinarPorTrocas(times);
  return times;
}

// ---------------------------------------------------------------------------
// Ponto de entrada
// ---------------------------------------------------------------------------

/**
 * Sorteia os confirmados em `qtdTimes` times equilibrados. Passe `formacao`
 * para preencher uma tática específica, ou `null` para o modo automático.
 * Quem não couber nas vagas entra na lista de espera (`reservas`), em ordem de
 * chegada da confirmação.
 */
export function sortearTimes(
  confirmados: Jogador[],
  qtdTimes: number,
  jogadoresPorTime: number,
  formacao?: Formacao | null,
): { times: TimeSorteado[]; reservas: Jogador[] } {
  const totalDeVagas = qtdTimes * jogadoresPorTime;
  const escalados = confirmados.slice(0, totalDeVagas);
  const reservas = confirmados.slice(totalDeVagas);

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
  };
}
