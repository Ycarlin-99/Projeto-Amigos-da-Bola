const FUSO = "America/Sao_Paulo";

const DIA_LONGO = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: FUSO,
});

const DIA_CURTO = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: FUSO,
});

const HORA = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO,
});

const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO,
});

function maiuscula(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Sábado, 02 de agosto" */
export function dataLonga(iso: string) {
  return maiuscula(DIA_LONGO.format(new Date(iso)));
}

/** "sáb., 02/08" */
export function dataCurta(iso: string) {
  return maiuscula(DIA_CURTO.format(new Date(iso)).replace(",", ""));
}

/** "19:30" */
export function hora(iso: string) {
  return HORA.format(new Date(iso));
}

/** "02/08 às 19:30" */
export function dataHora(iso: string) {
  return DATA_HORA.format(new Date(iso)).replace(", ", " às ");
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" — linguagem do dia a dia. */
export function quandoEmPalavras(iso: string) {
  const alvo = new Date(iso);
  const agora = new Date();
  const dias = Math.round(
    (inicioDoDia(alvo).getTime() - inicioDoDia(agora).getTime()) / 86_400_000,
  );

  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 1 && dias <= 7) return `em ${dias} dias`;
  if (dias < -1) return `há ${Math.abs(dias)} dias`;
  return dataCurta(iso);
}

function inicioDoDia(data: Date) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function jaPassou(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

const PARTES_ENTRADA = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO,
});

/**
 * ISO do banco → valor de um <input type="datetime-local"> ("2026-08-02T19:30").
 * Formata sempre no fuso de Brasília: se dependesse do relógio de quem renderiza,
 * o formulário abriria com o horário errado quando o servidor roda em UTC.
 * O locale "sv-SE" é o atalho conhecido para sair no formato ISO.
 */
export function isoParaLocal(iso: string) {
  return PARTES_ENTRADA.format(new Date(iso)).replace(" ", "T");
}
